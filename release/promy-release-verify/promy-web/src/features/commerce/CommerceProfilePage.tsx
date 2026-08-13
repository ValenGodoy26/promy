import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import {
  fetchCategories,
  fetchCities,
  fetchMyCommerce,
  updateMyCommerce,
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canOperate = commerce?.status === "APPROVED";

  const loadProfile = useCallback(async (silent = false) => {
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
  }, [withSession]);

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
              <div style={{ marginBottom: 16 }}>
                <Link
                  to={buildClientAppRoute({
                    target: buildCommerceDeepLink(commerce.id),
                    title: "Abrir vista cliente del comercio",
                    description: "Chequea como se ve este local dentro de la app mobile.",
                  })}
                  className="btn btn-secondary btn-sm"
                >
                  Ver en app
                </Link>
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

            {!canOperate ? (
              <div className="alert alert-info">
                <IconClock size={14} className="alert-icon" />
                <span>{getCommerceBlockedActionLabel(commerce?.status)}</span>
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
