import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  fetchAdminAuditLogs,
  fetchAdminCommercesFiltered,
  updateAdminCommerce,
  updateAdminCommerceStatus,
} from "../../lib/api";
import type { AdminAuditLogItem, AdminCommerceItem, AdminPromotionItem } from "../../types/api";
import {
  Alert,
  ConfirmDialog,
  FilterChips,
  getCommerceModalTitle,
  getConfirmLabel,
  LoadingBlock,
  ModerationModal,
  PageHeader,
  Toolbar,
} from "./AdminShared";
import { AdminCommercesTable } from "./AdminCommercesTable";
import { AdminCommerceControlPanel, type AdminCommerceDraft } from "./AdminCommerceControlPanel";
import { AdminCommerceDetailPanel } from "./AdminCommerceDetailPanel";

type CommerceFilter = "all" | "pending" | "approved" | "inactive" | "rejected";
type CommerceReadinessFilter = "all" | "map-ready" | "incomplete";
type ModerationModalState =
  | { kind: "commerce"; item: AdminCommerceItem; nextStatus: string }
  | { kind: "promotion"; item: AdminPromotionItem; nextStatus: string }
  | null;

const ADMIN_TABLE_PAGE_SIZE = 25;

function getCommerceModerationDescription(modalState: ModerationModalState) {
  if (!modalState || modalState.kind !== "commerce") return "";

  if (modalState.nextStatus === "REJECTED") {
    return `Vas a rechazar ${modalState.item.name}. Explica el motivo con claridad para que el comercio sepa que corregir y el equipo tenga trazabilidad.`;
  }

  if (modalState.nextStatus === "APPROVED") {
    return `Vas a aprobar ${modalState.item.name}. Revisa antes coordenadas, datos visibles y estado general del perfil.`;
  }

  if (modalState.nextStatus === "INACTIVE") {
    return `Vas a pausar ${modalState.item.name}. El comercio dejara de mostrarse en la app hasta una nueva revision.`;
  }

  return `Vas a actualizar el estado de ${modalState.item.name}.`;
}

export function AdminCommercesPage({
  tabs,
  realtimeVersion,
}: {
  tabs: Array<{ to: string; label: string; end?: boolean }>;
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [commerces, setCommerces] = useState<AdminCommerceItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<CommerceFilter>("all");
  const [readinessFilter, setReadinessFilter] = useState<CommerceReadinessFilter>("all");
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
  const [commerceDraft, setCommerceDraft] = useState<AdminCommerceDraft | null>(null);
  const [showHideCommerceConfirm, setShowHideCommerceConfirm] = useState(false);

  useEffect(() => {
    setLoading(true);
    void withSession((s) =>
      fetchAdminCommercesFiltered(s, {
        status: filter === "all" ? undefined : filter.toUpperCase(),
        mapReady: readinessFilter === "all" ? undefined : readinessFilter === "map-ready",
        profileComplete: readinessFilter === "incomplete" ? false : undefined,
        search: deferredSearch || undefined,
        limit: 120,
      }),
    )
      .then((response) => {
        setCommerces(response.commerces);
        setSelectedId((current) => {
          if (current && response.commerces.some((item) => item.id === current)) {
            return current;
          }
          return response.commerces[0]?.id ?? null;
        });
        setError(null);
        setAuditError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar comercios.");
      })
      .finally(() => setLoading(false));
  }, [deferredSearch, filter, readinessFilter, realtimeVersion, withSession]);

  const selected = useMemo(
    () => commerces.find((item) => item.id === selectedId) || commerces[0] || null,
    [commerces, selectedId],
  );
  const visibleCommerces = useMemo(() => commerces.slice(0, visibleCount), [commerces, visibleCount]);

  useEffect(() => {
    if (!selected) {
      setCommerceDraft(null);
      return;
    }

    setCommerceDraft({
      name: selected.name,
      shortDescription: selected.shortDescription || "",
      address: selected.address || "",
      phone: selected.phone || "",
      instagram: selected.instagram || "",
      logoUrl: selected.logoUrl || "",
      coverUrl: selected.coverUrl || "",
      latitude: typeof selected.latitude === "number" ? String(selected.latitude) : "",
      longitude: typeof selected.longitude === "number" ? String(selected.longitude) : "",
      isFeatured: Boolean(selected.isFeatured),
      featuredRank: String(selected.featuredRank ?? 0),
      isHiddenByAdmin: Boolean(selected.isHiddenByAdmin),
      adminNote: selected.adminNote || "",
    });
  }, [selected?.id]);

  useEffect(() => {
    setVisibleCount(ADMIN_TABLE_PAGE_SIZE);
  }, [deferredSearch, filter, readinessFilter]);

  useEffect(() => {
    if (!selected) {
      setAuditLogs([]);
      setAuditError(null);
      return;
    }

    setAuditLoading(true);
    void withSession((s) =>
      fetchAdminAuditLogs(s, {
        targetType: "COMMERCE",
        targetId: selected.id,
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
    if (!modalState || modalState.kind !== "commerce") return;

    try {
      setSaving(true);
      setFeedback(null);
      const response = await withSession((s) =>
        updateAdminCommerceStatus(
          s,
          modalState.item.id,
          modalState.nextStatus,
          note.trim() || undefined,
        ),
      );

      setCommerces((current) =>
        current.map((item) =>
          item.id === modalState.item.id
            ? {
                ...item,
                status: response.commerce.status,
                moderationNote: response.commerce.moderationNote || null,
                updatedAt: response.commerce.updatedAt,
              }
            : item,
        ),
      );
      setModalState(null);
      setFeedback(response.message || "Estado del comercio actualizado.");

      const auditResponse = await withSession((s) =>
        fetchAdminAuditLogs(s, {
          targetType: "COMMERCE",
          targetId: modalState.item.id,
          limit: 10,
        }),
      );
      setAuditLogs(auditResponse.auditLogs);
      setAuditError(null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos actualizar el comercio.");
    } finally {
      setSaving(false);
    }
  };

  const saveCommerceControl = async () => {
    if (!selected || !commerceDraft) return;

    // Si el admin está ocultando un comercio que hoy es visible,
    // pedimos confirmación explícita antes de continuar.
    const isHiding = commerceDraft.isHiddenByAdmin && !selected.isHiddenByAdmin;
    if (isHiding) {
      setShowHideCommerceConfirm(true);
      return;
    }

    await doSaveCommerceControl();
  };

  const doSaveCommerceControl = async () => {
    if (!selected || !commerceDraft) return;

    const latitude = commerceDraft.latitude.trim()
      ? Number(commerceDraft.latitude.replace(",", "."))
      : null;
    const longitude = commerceDraft.longitude.trim()
      ? Number(commerceDraft.longitude.replace(",", "."))
      : null;
    const featuredRank = commerceDraft.featuredRank.trim()
      ? Number(commerceDraft.featuredRank)
      : 0;

    if (!commerceDraft.name.trim()) {
      setError("El comercio necesita un nombre visible.");
      return;
    }

    if (latitude != null && !Number.isFinite(latitude)) {
      setError("La latitud debe ser un numero valido.");
      return;
    }

    if (longitude != null && !Number.isFinite(longitude)) {
      setError("La longitud debe ser un numero valido.");
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
        updateAdminCommerce(s, selected.id, {
          name: commerceDraft.name.trim(),
          shortDescription: commerceDraft.shortDescription.trim() || null,
          address: commerceDraft.address.trim(),
          phone: commerceDraft.phone.trim() || null,
          instagram: commerceDraft.instagram.trim() || null,
          logoUrl: commerceDraft.logoUrl.trim() || null,
          coverUrl: commerceDraft.coverUrl.trim() || null,
          latitude,
          longitude,
          isFeatured: commerceDraft.isFeatured,
          featuredRank,
          isHiddenByAdmin: commerceDraft.isHiddenByAdmin,
          adminNote: commerceDraft.adminNote.trim() || null,
          note: "Control editorial desde admin",
        }),
      );

      setCommerces((current) =>
        current.map((item) => (item.id === selected.id ? response.commerce : item)),
      );
      setFeedback("Comercio actualizado desde control admin.");
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos guardar el comercio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        kicker="/ Admin · Moderacion"
        title="Comercios"
        titleAccent="adheridos"
        tabs={tabs}
      />

      <div className="main-content">
        <div className="panel panel-compact" style={{ marginBottom: 18 }}>
          <div className="panel-heading">
            <div className="panel-heading-stack">
              <h2>Consola de revision</h2>
              <p>
                Busca por owner, ciudad o categoria y opera el alta de comercios sin salir del
                backoffice.
              </p>
            </div>
          </div>
        </div>

        {feedback ? <Alert tone="success" message={feedback} /> : null}
        {error ? <Alert tone="danger" message={error} /> : null}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por comercio, owner, ciudad o categoria..."
          countLabel={`${visibleCommerces.length} de ${commerces.length} cargados`}
        />

        <FilterChips
          value={filter}
          onChange={(next) => setFilter(next as CommerceFilter)}
          options={[
            { id: "all", label: "Todos" },
            { id: "pending", label: "Pendientes" },
            { id: "approved", label: "Aprobados" },
            { id: "rejected", label: "Rechazados" },
            { id: "inactive", label: "Inactivos" },
          ]}
        />

        <FilterChips
          value={readinessFilter}
          onChange={(next) => setReadinessFilter(next as CommerceReadinessFilter)}
          options={[
            { id: "all", label: "Todo el catalogo" },
            { id: "map-ready", label: "Listos para mapa" },
            { id: "incomplete", label: "Con faltantes" },
          ]}
        />

        {loading ? (
          <LoadingBlock title="Cargando comercios" text="Trayendo panel administrativo." />
        ) : (
          <div className="detail-layout">
            <AdminCommercesTable
              commerces={visibleCommerces}
              selectedId={selected?.id ?? null}
              totalCount={commerces.length}
              canLoadMore={commerces.length > visibleCommerces.length}
              onSelect={setSelectedId}
              onLoadMore={() => setVisibleCount((current) => current + ADMIN_TABLE_PAGE_SIZE)}
            />

            {selected ? (
              <AdminCommerceDetailPanel
                selected={selected}
                auditLogs={auditLogs}
                auditLoading={auditLoading}
                auditError={auditError}
                onModerate={(nextStatus) =>
                  setModalState({
                    kind: "commerce",
                    item: selected,
                    nextStatus,
                  })
                }
                controlPanel={
                  commerceDraft ? (
                    <AdminCommerceControlPanel
                      draft={commerceDraft}
                      saving={saving}
                      onDraftChange={(updater) =>
                        setCommerceDraft((current) => (current ? updater(current) : current))
                      }
                      onSave={saveCommerceControl}
                    />
                  ) : null
                }
              />
            ) : null}
          </div>
        )}
      </div>

      <ModerationModal
        open={modalState?.kind === "commerce"}
        title={getCommerceModalTitle(modalState?.nextStatus)}
        description={getCommerceModerationDescription(modalState)}
        defaultNote={modalState?.kind === "commerce" ? modalState.item.moderationNote || "" : ""}
        requireNote={modalState?.kind === "commerce" && modalState.nextStatus === "REJECTED"}
        confirmLabel={getConfirmLabel(modalState?.nextStatus)}
        loading={saving}
        onClose={() => !saving && setModalState(null)}
        onSubmit={submitModal}
      />

      <ConfirmDialog
        open={showHideCommerceConfirm}
        title={`Ocultar ${selected?.name ?? "este comercio"} de la app`}
        description="El comercio dejará de aparecer para todos los usuarios en el catálogo, el mapa y la búsqueda. Podés volver a mostrarlo en cualquier momento desmarcando 'Oculto en app'."
        confirmLabel="Sí, ocultar"
        tone="danger"
        onClose={() => setShowHideCommerceConfirm(false)}
        onConfirm={() => {
          setShowHideCommerceConfirm(false);
          void doSaveCommerceControl();
        }}
      />
    </>
  );
}
