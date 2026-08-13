import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../auth";
import {
  fetchCategories,
  fetchCities,
  fetchMyCommerce,
  updateMyCommerce,
  updateMyCommerceStatus,
} from "../../lib/api";
import { buildClientAppRoute, buildCommerceDeepLink } from "../../lib/clientLinks";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceManagedProfile, PublicCategory, PublicCity } from "../../types/api";
import { IconAlert, IconCheck, IconClock } from "../../components/Icons";
import {
  CommerceOnboardingPanel,
  CommerceProfileFormState,
  CommerceStatusNotices,
  Field,
  getCommerceBlockedActionLabel,
  LoadingBlock,
  normalizeCommercePayload,
  PageHeader,
  SelectField,
  StatusBadge,
} from "./CommerceShared";

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canOperate = commerce?.status === "APPROVED";

  const clientAppPath = useMemo(() => {
    if (!commerce) return null;
    return buildClientAppRoute({
      target: buildCommerceDeepLink(commerce.id),
      title: "Abrir vista cliente del comercio",
      description: "Chequea como se ve este local dentro de la app mobile.",
    });
  }, [commerce]);

  const commercePosterUrl = useMemo(() => {
    if (!clientAppPath || typeof window === "undefined") return "";
    return `${window.location.origin}${clientAppPath}`;
  }, [clientAppPath]);

  const loadProfile = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

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
          shortDescription: response.commerce.shortDescription || "",
          description: response.commerce.description || "",
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
        if (!silent) {
          setLoading(false);
        }
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
    try {
      setSaving(true);
      setFeedback(null);
      const response = await withSession((s) =>
        updateMyCommerce(s, normalizeCommercePayload(form)),
      );
      setCommerce(response.commerce);
      setFeedback(response.message || "Comercio actualizado correctamente.");
      setError(null);
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
            ? "Tu comercio quedo pausado."
            : "Tu comercio volvio a estar activo."),
      );
      setError(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No pudimos cambiar el estado.");
    } finally {
      setTogglingStatus(false);
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
            <p>Escanea este QR para abrir este comercio en PROMY y ver promociones activas.</p>
            <div class="qr">${svg.outerHTML}</div>
            <div class="footer">Tambien puedes abrirlo desde ${commercePosterUrl}</div>
          </div>
        </body>
      </html>
    `);
  };

  return (
    <>
      <PageHeader
        kicker="/ Commerce · Perfil"
        title="Mi comercio"
        meta={commerce ? <StatusBadge status={commerce.status} /> : null}
      />

      <div className="main-content">
        {loading ? (
          <LoadingBlock title="Cargando perfil" text="Trayendo datos del negocio." />
        ) : (
          <section className="panel">
            {commerce ? <CommerceOnboardingPanel commerce={commerce} compact /> : null}
            {commerce ? (
              <CommerceStatusNotices
                commerce={commerce}
                email={session?.user.email}
                emailVerifiedAt={session?.user.emailVerifiedAt}
                showProfileLink={false}
              />
            ) : null}

            <div className="panel-heading">
              <div className="panel-heading-stack">
                <h2>Informacion del negocio</h2>
                <p>Actualiza los datos base que operan dentro de PROMY.</p>
              </div>
            </div>

            {commerce ? (
              <>
                <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to={clientAppPath || "/client-app"} className="btn btn-secondary btn-sm">
                    Ver en app
                  </Link>
                </div>

                <div
                  style={{
                    marginBottom: 20,
                    padding: 18,
                    border: "1px solid var(--line)",
                    borderRadius: 24,
                    background: "linear-gradient(180deg, #fffdfa 0%, #f8f2e7 100%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 280px" }}>
                      <div className="page-kicker" style={{ marginBottom: 8 }}>
                        / Cartel para caja
                      </div>
                      <h3 style={{ margin: 0, fontSize: 24 }}>QR descargable del comercio</h3>
                      <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, marginTop: 10 }}>
                        Imprime este cartel para que los clientes abran tu local en PROMY, vean
                        tus promociones activas y lleguen directo a la vista correcta.
                      </p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                        <button className="btn btn-primary btn-sm" type="button" onClick={handleDownloadPoster}>
                          Descargar QR
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={handlePrintPoster}>
                          Imprimir cartel
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        width: 220,
                        minHeight: 220,
                        borderRadius: 26,
                        background: "#fff",
                        border: "1px solid #eadbc0",
                        boxShadow: "0 14px 30px rgba(28, 22, 12, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 18,
                      }}
                    >
                      {commercePosterUrl ? (
                        <QRCodeSVG
                          id={`commerce-poster-qr-${commerce.id}`}
                          value={commercePosterUrl}
                          size={180}
                          bgColor="#ffffff"
                          fgColor="#111111"
                          includeMargin
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
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

            {!canOperate ? (
              <div className="alert alert-info">
                <IconClock size={14} className="alert-icon" />
                <span>{getCommerceBlockedActionLabel(commerce?.status)}</span>
              </div>
            ) : null}

            {commerce && (commerce.status === "APPROVED" || commerce.status === "INACTIVE") ? (
              <div className="alert alert-info">
                <IconClock size={14} className="alert-icon" />
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span>
                    {commerce.status === "APPROVED"
                      ? "Si necesitas una pausa, puedes desactivar temporalmente tu comercio sin pedir ayuda al admin."
                      : "Tu comercio esta pausado. Mientras siga asi no aparecera en el catalogo publico."}
                  </span>
                  <button
                    className="btn btn-subtle btn-sm"
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
                </div>
              </div>
            ) : null}

            <form className="form-grid" onSubmit={handleSubmit}>
              <Field
                label="Nombre"
                value={form.name || ""}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              />
              <Field
                label="Telefono"
                value={form.phone || ""}
                onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
              />
              <Field
                label="Direccion"
                value={form.address || ""}
                onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                className="field-wide"
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
              />
              <SelectField
                label="Categoria"
                value={form.categoryId || ""}
                onChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}
                options={[
                  { value: "", label: "Seleccionar categoria" },
                  ...categories.map((category) => ({
                    value: String(category.id),
                    label: category.name,
                  })),
                ]}
              />
              <Field
                label="Instagram"
                value={form.instagram || ""}
                onChange={(value) => setForm((current) => ({ ...current, instagram: value }))}
              />
              <Field
                label="Logo URL"
                value={form.logoUrl || ""}
                onChange={(value) => setForm((current) => ({ ...current, logoUrl: value }))}
              />
              <Field
                label="Descripcion corta"
                value={form.shortDescription || ""}
                multiline
                onChange={(value) =>
                  setForm((current) => ({ ...current, shortDescription: value }))
                }
                className="field-wide"
              />
              <Field
                label="Descripcion completa"
                value={form.description || ""}
                multiline
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                className="field-wide"
              />
              <Field
                label="Cover URL"
                value={form.coverUrl || ""}
                onChange={(value) => setForm((current) => ({ ...current, coverUrl: value }))}
                className="field-wide"
              />

              <Field
                label="Latitud"
                value={form.latitude || ""}
                onChange={(value) => setForm((current) => ({ ...current, latitude: value }))}
                type="number"
                inputMode="decimal"
              />
              <Field
                label="Longitud"
                value={form.longitude || ""}
                onChange={(value) => setForm((current) => ({ ...current, longitude: value }))}
                type="number"
                inputMode="decimal"
              />

              <div className="form-footer field-wide">
                <span className="meta">Los cambios se guardan al enviar</span>
                <button className="btn btn-primary" disabled={saving} type="submit">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
