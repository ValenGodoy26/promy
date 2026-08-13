import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  createAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
} from "../../lib/api";
import type { AdminCategoryItem } from "../../types/api";
import { IconEdit, IconPlus } from "../../components/Icons";
import {
  Alert,
  DetailRow,
  FilterChips,
  LoadingBlock,
  MiniBadge,
  PageHeader,
  Toolbar,
} from "./AdminShared";

export function AdminCategoriesPage({
  tabs,
  realtimeVersion,
}: {
  tabs: Array<{ to: string; label: string; end?: boolean }>;
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", icon: "", isActive: true });
  const [mode, setMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    setLoading(true);
    void withSession((s) =>
      fetchAdminCategories(s, {
        search: deferredSearch || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      }),
    )
      .then((response) => {
        setCategories(response.categories);
        setSelectedId((current) => {
          if (current && response.categories.some((item) => item.id === current)) {
            return current;
          }
          return response.categories[0]?.id ?? null;
        });
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar categorias.");
      })
      .finally(() => setLoading(false));
  }, [activeFilter, deferredSearch, realtimeVersion, withSession]);

  const selected = useMemo(
    () => categories.find((item) => item.id === selectedId) || null,
    [categories, selectedId],
  );

  useEffect(() => {
    if (mode === "edit" && selected) {
      setDraft({
        name: selected.name,
        icon: selected.icon || "",
        isActive: selected.isActive,
      });
      return;
    }

    if (mode === "create") {
      setDraft({ name: "", icon: "", isActive: true });
    }
  }, [mode, selected]);

  const handleSubmit = async () => {
    if (draft.name.trim().length < 2) {
      setError("La categoria necesita un nombre claro.");
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const response =
        mode === "edit" && selected
          ? await withSession((s) =>
              updateAdminCategory(s, selected.id, {
                name: draft.name.trim(),
                icon: draft.icon.trim() || undefined,
                isActive: draft.isActive,
              }),
            )
          : await withSession((s) =>
              createAdminCategory(s, {
                name: draft.name.trim(),
                icon: draft.icon.trim() || undefined,
                isActive: draft.isActive,
              }),
            );

      setCategories((current) => {
        const next =
          mode === "edit" && selected
            ? current.map((item) => (item.id === response.category.id ? response.category : item))
            : [response.category, ...current];

        return next.sort((a, b) => a.name.localeCompare(b.name, "es"));
      });
      setSelectedId(response.category.id);
      setMode("edit");
      setFeedback(response.message || "Categoria guardada.");
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos guardar la categoria.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        kicker="/ Admin · Catalogo"
        title="Categorías"
        titleAccent="operativas"
        tabs={tabs}
      />

      <div className="main-content">
        <div className="panel panel-compact" style={{ marginBottom: 18 }}>
          <div className="panel-heading">
            <div className="panel-heading-stack">
              <h2>Rubros y cobertura</h2>
              <p>
                Gestiona el catalogo de categorias y revisa cuantas ya tienen comercios listos
                para mapa.
              </p>
            </div>
          </div>
        </div>

        {feedback ? <Alert tone="success" message={feedback} /> : null}
        {error ? <Alert tone="danger" message={error} /> : null}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por nombre o slug..."
          countLabel={`${categories.length} categorias`}
        />

        <div className="toolbar" style={{ marginTop: -6 }}>
          <div className="toolbar-start">
            <FilterChips
              value={activeFilter}
              onChange={(next) => setActiveFilter(next as "all" | "active" | "inactive")}
              options={[
                { id: "all", label: "Todas" },
                { id: "active", label: "Activas" },
                { id: "inactive", label: "Inactivas" },
              ]}
            />
          </div>
          <div className="toolbar-end">
            <button className="btn btn-primary btn-sm" type="button" onClick={() => setMode("create")}>
              <IconPlus size={13} /> Nueva categoria
            </button>
            {selected ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMode("edit")}>
                <IconEdit size={13} /> Editar seleccionada
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <LoadingBlock title="Cargando categorias" text="Trayendo rubros y metricas de cobertura." />
        ) : (
          <div className="detail-layout">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Comercios</th>
                    <th>Mapa listo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className={selected?.id === category.id ? "is-selected" : ""}
                      onClick={() => {
                        setSelectedId(category.id);
                        setMode("edit");
                      }}
                    >
                      <td>
                        <div className="cell-primary">{category.name}</div>
                        <span className="cell-sub">{category.slug}</span>
                      </td>
                      <td>
                        <div className="cell-primary">{category.commerceCount}</div>
                        <span className="cell-sub">{category.approvedCommerceCount} aprobados</span>
                      </td>
                      <td>
                        <div className="cell-primary">{category.mapReadyCommerceCount}</div>
                        <span className="cell-sub">{category.incompleteCommerceCount} con faltantes</span>
                      </td>
                      <td>
                        <MiniBadge
                          tone={category.isActive ? "success" : "neutral"}
                          label={category.isActive ? "Activa" : "Inactiva"}
                        />
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="data-empty">No encontramos categorias para este filtro.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <aside className="detail-card">
              <div className="page-kicker">{mode === "edit" ? "Edicion" : "Alta"}</div>
              <h2 className="detail-title">
                {mode === "edit" && selected ? selected.name : "Nueva categoria"}
              </h2>
              <p className="detail-desc">
                {mode === "edit" && selected
                  ? `${selected.mapReadyCommerceCount} comercios ya estan listos para mapa dentro de este rubro.`
                  : "Crea una categoria cuidando el nombre canonico que va a ordenar el catalogo."}
              </p>

              {selected && mode === "edit" ? (
                <div className="stacked-badges" style={{ marginBottom: 14 }}>
                  <MiniBadge
                    tone={selected.isActive ? "success" : "neutral"}
                    label={selected.isActive ? "Activa" : "Inactiva"}
                  />
                  <MiniBadge
                    tone={selected.incompleteCommerceCount > 0 ? "warning" : "success"}
                    label={
                      selected.incompleteCommerceCount > 0
                        ? `${selected.incompleteCommerceCount} comercios a corregir`
                        : "Cobertura prolija"
                    }
                  />
                </div>
              ) : null}

              <div className="form-grid">
                <div className="field">
                  <label className="field-label">Nombre</label>
                  <input
                    className="field-input"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Ej. Gastronomia"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Icono</label>
                  <input
                    className="field-input"
                    value={draft.icon}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, icon: event.target.value }))
                    }
                    placeholder="Ej. burger"
                  />
                </div>
              </div>

              <div className="stacked-badges" style={{ marginTop: 14, marginBottom: 16 }}>
                <button
                  type="button"
                  className={draft.isActive ? "chip is-active" : "chip"}
                  onClick={() => setDraft((current) => ({ ...current, isActive: true }))}
                >
                  Activa
                </button>
                <button
                  type="button"
                  className={!draft.isActive ? "chip is-active" : "chip"}
                  onClick={() => setDraft((current) => ({ ...current, isActive: false }))}
                >
                  Inactiva
                </button>
              </div>

              {selected && mode === "edit" ? (
                <div className="detail-list" style={{ marginBottom: 16 }}>
                  <DetailRow label="Slug" value={selected.slug} />
                  <DetailRow label="Comercios" value={String(selected.commerceCount)} />
                  <DetailRow label="Aprobados" value={String(selected.approvedCommerceCount)} />
                  <DetailRow label="Mapa listo" value={String(selected.mapReadyCommerceCount)} />
                </div>
              ) : null}

              <div className="modal-footer" style={{ marginTop: 0 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setMode("create");
                    setDraft({ name: "", icon: "", isActive: true });
                  }}
                >
                  Limpiar
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving}
                  onClick={handleSubmit}
                >
                  {saving ? "Guardando..." : mode === "edit" ? "Actualizar categoria" : "Crear categoria"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
