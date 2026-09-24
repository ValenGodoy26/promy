import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../auth";
import {
  fetchCategories,
  fetchCities,
  fetchMyCommerce,
  updateMyCommerce,
  updateMyCommerceStatus,
  uploadCommerceImage,
} from "../../lib/api";
import { buildClientAppRoute, buildCommerceDeepLink } from "../../lib/clientLinks";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceManagedProfile, PublicCategory, PublicCity } from "../../types/api";
import {
  IconAlert,
  IconCheck,
  IconEye,
  IconImage,
  IconMapPin,
  IconPause,
} from "../../components/Icons";
import {
  CommerceOnboardingPanel,
  CommerceProfileFormState,
  Field,
  LoadingBlock,
  normalizeCommercePayload,
  SelectField,
} from "./CommerceShared";
import { validateCommerceProfileForm } from "./commerceRules";

function downloadSvg(svgId: string, filename: string) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const serializer = new XMLSerializer();
  const markup = serializer.serializeToString(svg);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printPoster(html: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function getVisibilityCopy(status?: string) {
  if (status === "APPROVED") return { label: "Visible en PROMY", tone: "success" };
  if (status === "INACTIVE") return { label: "Comercio pausado", tone: "neutral" };
  if (status === "PENDING") return { label: "En revisión", tone: "warning" };
  if (status === "REJECTED") return { label: "Necesita cambios", tone: "danger" };
  return { label: "Estado del comercio", tone: "neutral" };
}

export function CommerceProfilePage({ realtimeVersion }: { realtimeVersion: number }) {
  const { session, withSession } = useAuth();
  const [commerce, setCommerce] = useState<CommerceManagedProfile | null>(null);
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [form, setForm] = useState<CommerceProfileFormState>({
    name: "",
    shortDescription: "",
    description: "",
    address: "",
    phone: "",
    instagram: "",
    logoUrl: "",
    coverUrl: "",
    cityId: "",
    categoryId: "",
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof CommerceProfileFormState, string>>
  >({});
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const canOperate = commerce?.status === "APPROVED";

  const clientAppPath = useMemo(() => {
    if (!commerce) return null;
    return buildClientAppRoute({
      target: buildCommerceDeepLink(commerce.id),
      title: "Abrir vista cliente del comercio",
      description: "Chequeá cómo se ve este local dentro de la app mobile.",
    });
  }, [commerce]);

  const commercePosterUrl = useMemo(() => {
    if (!clientAppPath || typeof window === "undefined") return "";
    return `${window.location.origin}${clientAppPath}`;
  }, [clientAppPath]);

  const loadProfile = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const [response, citiesResponse, categoriesResponse] = await Promise.all([
          withSession((s) => fetchMyCommerce(s)),
          fetchCities(),
          fetchCategories(),
        ]);
        setCommerce(response.commerce);
        setCities(citiesResponse.cities);
        setCategories(categoriesResponse.categories);
        setForm({
          name: response.commerce.name || "",
          shortDescription:
            response.commerce.shortDescription || response.commerce.description?.slice(0, 160) || "",
          description: response.commerce.description || response.commerce.shortDescription || "",
          address: response.commerce.address || "",
          phone: response.commerce.phone || "",
          instagram: response.commerce.instagram || "",
          logoUrl: response.commerce.logoUrl || "",
          coverUrl: response.commerce.coverUrl || "",
          cityId: response.commerce.city?.id ? String(response.commerce.city.id) : "",
          categoryId: response.commerce.category?.id ? String(response.commerce.category.id) : "",
          latitude:
            typeof response.commerce.latitude === "number"
              ? String(response.commerce.latitude)
              : "",
          longitude:
            typeof response.commerce.longitude === "number"
              ? String(response.commerce.longitude)
              : "",
        });
        setError(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [withSession],
  );

  useEffect(() => {
    void loadProfile().catch((loadProfileError) =>
      setError(
        loadProfileError instanceof Error
          ? loadProfileError.message
          : "No pudimos cargar el comercio.",
      ),
    );
  }, [loadProfile, realtimeVersion]);

  useLiveRefresh(
    () =>
      loadProfile(true).catch((loadProfileError) =>
        setError(
          loadProfileError instanceof Error
            ? loadProfileError.message
            : "No pudimos refrescar el comercio.",
        ),
      ),
    { intervalMs: 45000 },
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateCommerceProfileForm(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback(null);
      setError("Revisá los campos marcados antes de guardar.");
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const response = await withSession((s) =>
        updateMyCommerce(s, normalizeCommercePayload(form)),
      );
      setCommerce(response.commerce);
      setFeedback(response.message || "Cambios guardados correctamente.");
      setError(null);
      setFormErrors({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!commerce) return;

    const nextStatus = commerce.status === "APPROVED" ? "INACTIVE" : "APPROVED";

    try {
      setTogglingStatus(true);
      setFeedback(null);
      const response = await withSession((s) => updateMyCommerceStatus(s, { status: nextStatus }));
      setCommerce(response.commerce);
      setFeedback(
        response.message ||
          (nextStatus === "INACTIVE"
            ? "Tu comercio quedó pausado."
            : "Tu comercio volvió a estar visible en PROMY."),
      );
      setError(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No pudimos cambiar el estado.");
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleImageUpload = async (
    field: "logoUrl" | "coverUrl",
    file: File | undefined,
  ) => {
    if (!file) return;
    if (!canOperate) {
      setError("Necesitás tener el comercio aprobado para subir imágenes.");
      return;
    }

    const setUploading = field === "logoUrl" ? setUploadingLogo : setUploadingCover;
    try {
      setUploading(true);
      setError(null);
      const uploaded = await withSession((s) => uploadCommerceImage(s, file));
      setForm((current) => ({ ...current, [field]: uploaded.file.url }));
      setFeedback("Imagen cargada. Guardá los cambios para aplicarla al perfil.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No pudimos subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPoster = () => {
    if (!commerce) return;
    downloadSvg(`commerce-poster-qr-${commerce.id}`, `${commerce.slug || commerce.id}-qr.svg`);
  };

  const handlePrintPoster = () => {
    if (!commerce) return;
    const svg = document.getElementById(`commerce-poster-qr-${commerce.id}`);
    if (!svg) return;

    printPoster(`
      <html>
        <head>
          <title>${commerce.name} · QR</title>
          <style>
            body {
              margin: 0;
              font-family: Georgia, "Times New Roman", serif;
              background: #f7f1e7;
              color: #16110a;
            }
            .poster {
              width: 720px;
              margin: 32px auto;
              background: #fffdfa;
              border: 2px solid #dcc9a0;
              border-radius: 28px;
              padding: 40px;
              text-align: center;
              box-sizing: border-box;
            }
            .kicker {
              font-size: 13px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #9c5a36;
              margin-bottom: 18px;
            }
            h1 {
              margin: 0 0 10px;
              font-size: 42px;
              line-height: 1.05;
            }
            p {
              margin: 0;
              font-size: 18px;
              line-height: 1.6;
            }
            .qr {
              margin: 28px auto 20px;
              width: 260px;
              height: 260px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              border-radius: 24px;
              border: 1px solid #eadbc0;
              padding: 18px;
            }
            .qr svg {
              width: 100%;
              height: 100%;
            }
            .footer {
              margin-top: 18px;
              font-size: 15px;
              color: #5d5140;
            }
          </style>
        </head>
        <body>
          <div class="poster">
            <div class="kicker">PROMY · CARTEL PARA CAJA</div>
            <h1>${commerce.name}</h1>
            <p>Escaneá este QR para abrir este comercio en PROMY y ver sus promociones activas.</p>
            <div class="qr">${svg.outerHTML}</div>
            <div class="footer">También podés abrirlo desde ${commercePosterUrl}</div>
          </div>
        </body>
      </html>
    `);
  };

  const visibility = getVisibilityCopy(commerce?.status);
  const hasMapLocation = Boolean(
    commerce &&
      Number.isFinite(commerce.latitude) &&
      Number.isFinite(commerce.longitude),
  );

  return (
    <>
      <header className="commerce-profile-header">
        <div className="commerce-profile-header-inner">
          <div>
            <div className="commerce-profile-kicker">MI NEGOCIO</div>
            <h1>Mi negocio</h1>
            {commerce ? (
              <p>
                {commerce.name}
                {commerce.category?.name ? ` · ${commerce.category.name}` : ""}
                {commerce.city?.name ? ` · ${commerce.city.name}` : ""}
              </p>
            ) : (
              <p>Administrá cómo se muestra tu comercio en PROMY.</p>
            )}
          </div>
          <div className="commerce-profile-header-actions">
            {commerce ? (
              <span className={`commerce-profile-visibility is-${visibility.tone}`}>
                <span />
                {visibility.label}
              </span>
            ) : null}
            {commerce ? (
              <Link to="/commerce/profile/preview" className="commerce-profile-client-link">
                <IconEye size={15} /> Ver como cliente
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="commerce-profile-content">
        {loading ? (
          <LoadingBlock title="Cargando perfil" text="Trayendo datos del negocio." />
        ) : (
          <>
            {commerce && commerce.status !== "APPROVED" && commerce.status !== "INACTIVE" ? (
              <CommerceOnboardingPanel commerce={commerce} compact />
            ) : null}

            {!session?.user.emailVerifiedAt ? (
              <div className="alert alert-warning">
                <IconAlert size={14} className="alert-icon" />
                <span>Verificá el email de la cuenta para mantener todas las funciones habilitadas.</span>
              </div>
            ) : null}

            {error ? (
              <div className="alert alert-danger">
                <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
              </div>
            ) : null}
            {feedback ? (
              <div className="alert alert-success">
                <IconCheck size={14} className="alert-icon" /> <span>{feedback}</span>
              </div>
            ) : null}

            <form className="commerce-profile-card" onSubmit={handleSubmit}>
              <div className="commerce-profile-section-head">
                <div>
                  <h2>Información del negocio</h2>
                  <p>Estos son los datos que ven tus clientes.</p>
                </div>
              </div>

              <div className="commerce-profile-form-grid">
                <Field
                  label="Nombre"
                  value={form.name || ""}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  error={formErrors.name}
                />
                <Field
                  label="Teléfono"
                  value={form.phone || ""}
                  onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                  error={formErrors.phone}
                />
                <Field
                  label="Dirección"
                  value={form.address || ""}
                  onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                  className="field-wide"
                  error={formErrors.address}
                />
                <SelectField
                  label="Ciudad"
                  value={form.cityId || ""}
                  onChange={(value) => setForm((current) => ({ ...current, cityId: value }))}
                  options={[
                    { value: "", label: "Seleccionar ciudad" },
                    ...cities.map((city) => ({
                      value: String(city.id),
                      label: `${city.name}, ${city.province}`,
                    })),
                  ]}
                  error={formErrors.cityId}
                />
                <SelectField
                  label="Categoría"
                  value={form.categoryId || ""}
                  onChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}
                  options={[
                    { value: "", label: "Seleccionar categoría" },
                    ...categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    })),
                  ]}
                  error={formErrors.categoryId}
                />
                <Field
                  label="Instagram"
                  value={form.instagram || ""}
                  onChange={(value) => setForm((current) => ({ ...current, instagram: value }))}
                />
                <div className="commerce-profile-description field-wide">
                  <label className="field-label" htmlFor="commerce-profile-description">
                    Descripción
                  </label>
                  <textarea
                    id="commerce-profile-description"
                    className="field-textarea"
                    rows={3}
                    maxLength={160}
                    value={form.shortDescription || ""}
                    placeholder="Contales en pocas palabras qué ofrece tu negocio."
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((current) => ({
                        ...current,
                        shortDescription: value,
                        description: value,
                      }));
                    }}
                  />
                  <span className="field-help">{form.shortDescription.length}/160 · Se muestra en tu perfil y en la app.</span>
                </div>
              </div>

              <div className="commerce-profile-divider" />

              <div className="commerce-profile-section-head">
                <div>
                  <h2>Imágenes del negocio</h2>
                  <p>Actualizá el logo y la portada sin usar enlaces ni URLs.</p>
                </div>
              </div>

              <div className="commerce-profile-media-grid">
                <article className="commerce-profile-media-card is-logo">
                  <div className="commerce-profile-media-preview">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo del comercio" />
                    ) : (
                      <IconImage size={24} />
                    )}
                  </div>
                  <div className="commerce-profile-media-copy">
                    <strong>Logo</strong>
                    <span>Imagen cuadrada recomendada.</span>
                    <div className="commerce-profile-media-actions">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) => void handleImageUpload("logoUrl", event.target.files?.[0])}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        disabled={uploadingLogo || !canOperate}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {uploadingLogo ? "Subiendo..." : form.logoUrl ? "Cambiar logo" : "Subir logo"}
                      </button>
                      {form.logoUrl ? (
                        <button
                          className="commerce-profile-remove-media"
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>

                <article className="commerce-profile-media-card is-cover">
                  <div className="commerce-profile-media-preview">
                    {form.coverUrl ? (
                      <img src={form.coverUrl} alt="Portada del comercio" />
                    ) : (
                      <IconImage size={24} />
                    )}
                  </div>
                  <div className="commerce-profile-media-copy">
                    <strong>Portada</strong>
                    <span>Una foto horizontal funciona mejor.</span>
                    <div className="commerce-profile-media-actions">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) => void handleImageUpload("coverUrl", event.target.files?.[0])}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        disabled={uploadingCover || !canOperate}
                        onClick={() => coverInputRef.current?.click()}
                      >
                        {uploadingCover ? "Subiendo..." : form.coverUrl ? "Cambiar portada" : "Subir portada"}
                      </button>
                      {form.coverUrl ? (
                        <button
                          className="commerce-profile-remove-media"
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, coverUrl: "" }))}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              </div>

              <div className="commerce-profile-divider" />

              <div className="commerce-profile-location-row">
                <div className="commerce-profile-location-icon">
                  <IconMapPin size={18} />
                </div>
                <div className="commerce-profile-location-copy">
                  <strong>Ubicación en PROMY</strong>
                  <span>{form.address || "Todavía no cargaste una dirección."}</span>
                  <small>
                    {hasMapLocation
                      ? "La ubicación del mapa está configurada."
                      : "Todavía falta configurar el punto exacto del mapa."}
                  </small>
                </div>
                <details className="commerce-profile-location-advanced">
                  <summary>Ajuste avanzado</summary>
                  <div className="commerce-profile-location-fields">
                    <Field
                      label="Latitud"
                      value={form.latitude || ""}
                      onChange={(value) => setForm((current) => ({ ...current, latitude: value }))}
                      type="number"
                      inputMode="decimal"
                      error={formErrors.latitude}
                    />
                    <Field
                      label="Longitud"
                      value={form.longitude || ""}
                      onChange={(value) => setForm((current) => ({ ...current, longitude: value }))}
                      type="number"
                      inputMode="decimal"
                      error={formErrors.longitude}
                    />
                  </div>
                </details>
              </div>

              <div className="commerce-profile-form-footer">
                <span>Los cambios se aplican al guardar.</span>
                <button className="btn btn-primary" disabled={saving} type="submit">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>

            {commerce ? (
              <section className="commerce-profile-tool-card">
                <div className="commerce-profile-tool-copy">
                  <span className="commerce-profile-tool-kicker">QR PARA TU LOCAL</span>
                  <h2>Que tus clientes lleguen directo a tu perfil</h2>
                  <p>
                    Podés imprimirlo para la caja o descargarlo y usarlo donde quieras.
                  </p>
                  <div className="commerce-profile-tool-actions">
                    <button className="btn btn-primary btn-sm" type="button" onClick={handleDownloadPoster}>
                      Descargar QR
                    </button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={handlePrintPoster}>
                      Imprimir cartel
                    </button>
                  </div>
                </div>
                <div className="commerce-profile-qr-box">
                  {commercePosterUrl ? (
                    <QRCodeSVG
                      id={`commerce-poster-qr-${commerce.id}`}
                      value={commercePosterUrl}
                      size={138}
                      bgColor="#ffffff"
                      fgColor="#111111"
                      includeMargin
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            {commerce && (commerce.status === "APPROVED" || commerce.status === "INACTIVE") ? (
              <section className={`commerce-profile-pause-card${commerce.status === "INACTIVE" ? " is-paused" : ""}`}>
                <div className="commerce-profile-pause-icon">
                  <IconPause size={18} />
                </div>
                <div>
                  <strong>{commerce.status === "APPROVED" ? "Pausar mi comercio" : "Comercio pausado"}</strong>
                  <span>
                    {commerce.status === "APPROVED"
                      ? "Ocultá temporalmente tu negocio y sus promociones sin borrar nada."
                      : "Tu negocio no está visible para clientes. Podés reactivarlo cuando quieras."}
                  </span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={togglingStatus}
                  onClick={handleToggleStatus}
                >
                  {togglingStatus
                    ? "Actualizando..."
                    : commerce.status === "APPROVED"
                    ? "Pausar comercio"
                    : "Reactivar comercio"}
                </button>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
