import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  fetchAdminAuditLogs,
  fetchAdminPromotionsFiltered,
  updateAdminPromotion,
  updateAdminPromotionStatus,
} from "../../lib/api";
import type { AdminAuditLogItem, AdminPromotionItem } from "../../types/api";
import { IconCheck, IconPause, IconX } from "../../components/Icons";
import {
  Alert,
  AuditTimelineCard,
  DetailRow,
  FilterChips,
  formatDiscount,
  getAvailablePromotionTransitions,
  getConfirmLabel,
  getPromotionModalTitle,
  getPromotionTypeLabel,
  getStatusLabel,
  LoadingBlock,
  MiniBadge,
  ModerationModal,
  PageHeader,
  StatusBadge,
  Toolbar,
} from "./AdminShared";

type PromotionFilter =
  | "all"
  | "draft"
  | "pending_review"
  | "approved_visible"
  | "rejected"
  | "expired";

type ModerationModalState =
  | { kind: "promotion"; item: AdminPromotionItem; nextStatus: string }
  | null;

type AdminPromotionDraft = {
  title: string;
  description: string;
  conditions: string;
  imageUrl: string;
  discountValue: string;
  isFeatured: boolean;
  featuredRank: string;
  isHiddenByAdmin: boolean;
  adminNote: string;
};

const ADMIN_TABLE_PAGE_SIZE = 25;

export function AdminPromotionsPage({
  tabs,
  realtimeVersion,
}: {
  tabs: Array<{ to: string; label: string; end?: boolean }>;
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [promotions, setPromotions] = useState<AdminPromotionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<PromotionFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalState, setModalState] = useState<ModerationModalState>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(ADMIN_TABLE_PAGE_SIZE);
  const [promotionDraft, setPromotionDraft] = useState<AdminPromotionDraft | null>(null);

  useEffect(() => {
    setLoading(true);
    void withSession((s) =>
      fetchAdminPromotionsFiltered(s, {
        status: filter === "all" ? undefined : filter.toUpperCase(),
        search: deferredSearch || undefined,
        limit: 120,
      }),
    )
      .then((response) => {
        setPromotions(response.promotions);
        setSelectedId((current) => {
          if (current && response.promotions.some((item) => item.id === current)) {
            return current;
          }
          return response.promotions[0]?.id ?? null;
        });
        setError(null);
        setAuditError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar promociones.");
      })
      .finally(() => setLoading(false));
  }, [deferredSearch, filter, realtimeVersion, withSession]);

  const selected = useMemo(
    () => promotions.find((item) => item.id === selectedId) || promotions[0] || null,
    [promotions, selectedId],
  );
  const visiblePromotions = useMemo(() => promotions.slice(0, visibleCount), [promotions, visibleCount]);

  useEffect(() => {
    if (!selected) {
      setPromotionDraft(null);
      return;
    }

    setPromotionDraft({
      title: selected.title,
      description: selected.description,
      conditions: selected.conditions || "",
      imageUrl: selected.imageUrl || "",
      discountValue:
        typeof selected.discountValue === "number" ? String(selected.discountValue) : "",
      isFeatured: Boolean(selected.isFeatured),
      featuredRank: String(selected.featuredRank ?? 0),
      isHiddenByAdmin: Boolean(selected.isHiddenByAdmin),
      adminNote: selected.adminNote || "",
    });
  }, [selected?.id]);

  useEffect(() => {
    setVisibleCount(ADMIN_TABLE_PAGE_SIZE);
  }, [deferredSearch, filter]);

  useEffect(() => {
    if (!selected) {
      setAuditLogs([]);
      setAuditError(null);
      return;
    }

    setAuditLoading(true);
    void withSession((s) =>
      fetchAdminAuditLogs(s, {
        targetType: "PROMOTION",
        targetId: selected.id,
        commerceId: selected.commerce.id,
        limit: 10,
      }),
    )
      .then((response) => {
        setAuditLogs(response.auditLogs);
        setAuditError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar auditoria.");
      })
      .finally(() => setAuditLoading(false));
  }, [realtimeVersion, selected, withSession]);

  useEffect(() => {
    if (selected && error && !loading) {
      setAuditError(error);
    }
  }, [error, loading, selected]);

  const submitModal = async (note: string) => {
    if (!modalState || modalState.kind !== "promotion") return;

    try {
      setSaving(true);
      setFeedback(null);
      const response = await withSession((s) =>
        updateAdminPromotionStatus(
          s,
          modalState.item.id,
          modalState.nextStatus,
          note.trim() || undefined,
        ),
      );

      setPromotions((current) =>
        current.map((item) =>
          item.id === modalState.item.id
            ? {
                ...item,
                status: response.promotion.status,
                moderationNote: response.promotion.moderationNote || null,
                updatedAt: response.promotion.updatedAt,
              }
            : item,
        ),
      );
      setModalState(null);
      setFeedback(response.message || "Estado de la promocion actualizado.");

      const auditResponse = await withSession((s) =>
        fetchAdminAuditLogs(s, {
          targetType: "PROMOTION",
          targetId: modalState.item.id,
          commerceId: modalState.item.commerce.id,
          limit: 10,
        }),
      );
      setAuditLogs(auditResponse.auditLogs);
      setAuditError(null);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No pudimos actualizar la promocion.",
      );
    } finally {
      setSaving(false);
    }
  };

  const savePromotionControl = async () => {
    if (!selected || !promotionDraft) return;

    const discountValue = promotionDraft.discountValue.trim()
      ? Number(promotionDraft.discountValue.replace(",", "."))
      : null;
    const featuredRank = promotionDraft.featuredRank.trim()
      ? Number(promotionDraft.featuredRank)
      : 0;

    if (!promotionDraft.title.trim() || !promotionDraft.description.trim()) {
      setError("La promocion necesita titulo y descripcion visibles.");
      return;
    }

    if (discountValue != null && !Number.isFinite(discountValue)) {
      setError("El descuento debe ser un numero valido.");
      return;
    }

    if (!Number.isInteger(featuredRank) || featuredRank < 0) {
      setError("El orden destacado debe ser un numero entero positivo.");
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const response = await withSession((s) =>
        updateAdminPromotion(s, selected.id, {
          title: promotionDraft.title.trim(),
          description: promotionDraft.description.trim(),
          conditions: promotionDraft.conditions.trim() || null,
          imageUrl: promotionDraft.imageUrl.trim() || null,
          discountValue,
          isFeatured: promotionDraft.isFeatured,
          featuredRank,
          isHiddenByAdmin: promotionDraft.isHiddenByAdmin,
          adminNote: promotionDraft.adminNote.trim() || null,
          note: "Control editorial desde admin",
        }),
      );

      setPromotions((current) =>
        current.map((item) => (item.id === selected.id ? response.promotion : item)),
      );
      setFeedback("Promocion actualizada desde control admin.");
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos guardar la promocion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        kicker="/ Admin · Moderacion"
        title="Promociones"
        titleAccent="moderables"
        tabs={tabs}
      />

      <div className="main-content">
        <div className="panel panel-compact" style={{ marginBottom: 18 }}>
          <div className="panel-heading">
            <div className="panel-heading-stack">
              <h2>Moderacion de contenido</h2>
              <p>
                Revisa promos, detecta inactividad y deja trazabilidad interna sobre cada cambio de
                estado.
              </p>
            </div>
          </div>
        </div>

        {feedback ? <Alert tone="success" message={feedback} /> : null}
        {error && !auditError ? <Alert tone="danger" message={error} /> : null}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por promo, comercio, owner o ciudad..."
          countLabel={`${visiblePromotions.length} de ${promotions.length} cargados`}
        />

        <FilterChips
          value={filter}
          onChange={(next) => setFilter(next as PromotionFilter)}
          options={[
            { id: "all", label: "Todas" },
            { id: "draft", label: "Borrador" },
            { id: "pending_review", label: "En revision" },
            { id: "approved_visible", label: "Visibles" },
            { id: "rejected", label: "Rechazadas" },
            { id: "expired", label: "Expiradas" },
          ]}
        />

        {loading ? (
          <LoadingBlock title="Cargando promociones" text="Trayendo contenido moderable." />
        ) : (
          <div className="detail-layout">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Promocion</th>
                    <th>Comercio</th>
                    <th>Tipo</th>
                    <th>Canjes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePromotions.map((promotion) => (
                    <tr
                      key={promotion.id}
                      className={selected?.id === promotion.id ? "is-selected" : ""}
                      onClick={() => setSelectedId(promotion.id)}
                    >
                      <td>
                        <div className="cell-primary">{promotion.title}</div>
                        <span
                          className="cell-sub"
                          style={{
                            maxWidth: 280,
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {promotion.description}
                        </span>
                      </td>
                      <td>
                        <div className="cell-primary">{promotion.commerce.name}</div>
                        <span className="cell-sub">{promotion.commerce.owner.fullName}</span>
                      </td>
                      <td>{getPromotionTypeLabel(promotion.promotionType)}</td>
                      <td>
                        <span className="font-mono" style={{ fontSize: 13 }}>
                          {promotion._count.redemptions}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={promotion.status} />
                      </td>
                    </tr>
                  ))}
                  {visiblePromotions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="data-empty">Sin resultados para este filtro.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {promotions.length > visiblePromotions.length ? (
                <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setVisibleCount((current) => current + ADMIN_TABLE_PAGE_SIZE)}
                  >
                    Ver mas promociones
                  </button>
                </div>
              ) : null}
            </div>

            {selected ? (
              <aside className="detail-card">
                {(() => {
                  const availableTransitions = getAvailablePromotionTransitions(selected.status);

                  return (
                    <>
                      <div className="page-kicker">Detalle</div>
                      <h2 className="detail-title">{selected.title}</h2>
                      <p className="detail-desc">{selected.description}</p>

                      <div className="detail-actions">
                        {availableTransitions.includes("APPROVED_VISIBLE") ? (
                          <button
                            className="btn btn-primary btn-sm"
                            type="button"
                            onClick={() =>
                              setModalState({
                                kind: "promotion",
                                item: selected,
                                nextStatus: "APPROVED_VISIBLE",
                              })
                            }
                          >
                            <IconCheck size={13} /> Aprobar visible
                          </button>
                        ) : null}
                        {availableTransitions.includes("PENDING_REVIEW") ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() =>
                              setModalState({
                                kind: "promotion",
                                item: selected,
                                nextStatus: "PENDING_REVIEW",
                              })
                            }
                          >
                            <IconPause size={13} /> Mandar a revision
                          </button>
                        ) : null}
                        {availableTransitions.includes("REJECTED") ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() =>
                              setModalState({
                                kind: "promotion",
                                item: selected,
                                nextStatus: "REJECTED",
                              })
                            }
                          >
                            <IconX size={13} /> Rechazar
                          </button>
                        ) : null}
                        {availableTransitions.includes("EXPIRED") ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() =>
                              setModalState({
                                kind: "promotion",
                                item: selected,
                                nextStatus: "EXPIRED",
                              })
                            }
                          >
                            <IconX size={13} /> Expirar
                          </button>
                        ) : null}
                      </div>

                      {selected.imageUrl ? (
                        <div className="detail-media">
                          <img alt={selected.title} src={selected.imageUrl} />
                        </div>
                      ) : null}

                      <div className="detail-list">
                        <DetailRow label="Estado" value={getStatusLabel(selected.status)} />
                        <DetailRow
                          label="Comercio"
                          value={`${selected.commerce.name} · ${selected.commerce.owner.fullName}`}
                        />
                        <DetailRow
                          label="Ubicacion"
                          value={`${selected.commerce.city.name}, ${selected.commerce.city.province}`}
                        />
                        <DetailRow
                          label="Tipo"
                          value={getPromotionTypeLabel(selected.promotionType)}
                        />
                        <DetailRow
                          label="Descuento"
                          value={formatDiscount(selected.discountValue, selected.promotionType)}
                        />
                        <DetailRow label="Canjes" value={String(selected._count.redemptions)} />
                        <DetailRow
                          label="Observacion"
                          value={selected.moderationNote || "Sin observaciones."}
                        />
                      </div>

                      {promotionDraft ? (
                        <section className="admin-editor-panel">
                          <div className="page-kicker">Control admin</div>
                          <h3>Contenido en la app</h3>
                          <p>
                            Edita texto, imagen, prioridad y visibilidad sin pedirle al comercio
                            que vuelva a cargar la publicacion.
                          </p>

                          <div className="stacked-badges" style={{ marginBottom: 12 }}>
                            <MiniBadge
                              tone={promotionDraft.isFeatured ? "success" : "neutral"}
                              label={promotionDraft.isFeatured ? "Destacada" : "Orden normal"}
                            />
                            <MiniBadge
                              tone={promotionDraft.isHiddenByAdmin ? "warning" : "success"}
                              label={
                                promotionDraft.isHiddenByAdmin ? "Oculta en app" : "Publicable en app"
                              }
                            />
                          </div>

                          <div className="form-grid">
                            <div className="field field-wide">
                              <label className="field-label">Titulo</label>
                              <input
                                className="field-input"
                                value={promotionDraft.title}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current ? { ...current, title: event.target.value } : current,
                                  )
                                }
                              />
                            </div>
                            <div className="field field-wide">
                              <label className="field-label">Descripcion</label>
                              <textarea
                                className="field-textarea"
                                value={promotionDraft.description}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current
                                      ? { ...current, description: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="field field-wide">
                              <label className="field-label">Condiciones</label>
                              <textarea
                                className="field-textarea"
                                value={promotionDraft.conditions}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current
                                      ? { ...current, conditions: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="field field-wide">
                              <label className="field-label">Imagen URL</label>
                              <input
                                className="field-input"
                                value={promotionDraft.imageUrl}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current
                                      ? { ...current, imageUrl: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="field">
                              <label className="field-label">Descuento</label>
                              <input
                                className="field-input"
                                value={promotionDraft.discountValue}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current
                                      ? { ...current, discountValue: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="field">
                              <label className="field-label">Orden destacado</label>
                              <input
                                className="field-input"
                                inputMode="numeric"
                                value={promotionDraft.featuredRank}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current
                                      ? { ...current, featuredRank: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="field field-wide">
                              <label className="field-label">Nota interna</label>
                              <textarea
                                className="field-textarea"
                                value={promotionDraft.adminNote}
                                onChange={(event) =>
                                  setPromotionDraft((current) =>
                                    current
                                      ? { ...current, adminNote: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="admin-control-switches">
                            <button
                              type="button"
                              className={promotionDraft.isFeatured ? "chip is-active" : "chip"}
                              onClick={() =>
                                setPromotionDraft((current) =>
                                  current ? { ...current, isFeatured: !current.isFeatured } : current,
                                )
                              }
                            >
                              Destacada
                            </button>
                            <button
                              type="button"
                              className={promotionDraft.isHiddenByAdmin ? "chip is-active" : "chip"}
                              onClick={() =>
                                setPromotionDraft((current) =>
                                  current
                                    ? { ...current, isHiddenByAdmin: !current.isHiddenByAdmin }
                                    : current,
                                )
                              }
                            >
                              Oculta en app
                            </button>
                          </div>

                          <button
                            className="btn btn-primary"
                            type="button"
                            disabled={saving}
                            onClick={savePromotionControl}
                          >
                            {saving ? "Guardando..." : "Guardar control de promocion"}
                          </button>
                        </section>
                      ) : null}

                      <AuditTimelineCard
                        title="Historial"
                        subtitle={auditLoading ? "Actualizando..." : "Cambios sobre esta promo"}
                        logs={auditLogs}
                        emptyMessage="Sin acciones administrativas registradas."
                        inline
                      />
                      {auditError ? (
                        <Alert tone="danger" message={auditError} style={{ marginTop: 12 }} />
                      ) : null}
                    </>
                  );
                })()}
              </aside>
            ) : null}
          </div>
        )}
      </div>

      <ModerationModal
        open={modalState?.kind === "promotion"}
        title={getPromotionModalTitle(modalState?.nextStatus)}
        description={
          modalState?.kind === "promotion"
            ? `Estas por cambiar el estado de ${modalState.item.title}.`
            : ""
        }
        defaultNote={
          modalState?.kind === "promotion" ? modalState.item.moderationNote || "" : ""
        }
        requireNote={modalState?.kind === "promotion" && modalState.nextStatus === "REJECTED"}
        confirmLabel={getConfirmLabel(modalState?.nextStatus)}
        loading={saving}
        onClose={() => !saving && setModalState(null)}
        onSubmit={submitModal}
      />
    </>
  );
}
