import React, { useDeferredValue, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { fetchAdminAuditLogs } from "../../lib/api";
import type { AdminAuditLogItem } from "../../types/api";
import {
  AdminPageFrame,
  AdminPagination,
  AuditTimelineCard,
  LoadingBlock,
  Toolbar,
  Alert,
} from "./AdminShared";

type AuditTargetFilter = "all" | "COMMERCE" | "PROMOTION";
type AuditActionFilter =
  | "all"
  | "UPDATE_COMMERCE_STATUS"
  | "UPDATE_PROMOTION_STATUS"
  | "UPDATE_COMMERCE_CONTENT"
  | "UPDATE_PROMOTION_CONTENT";

const ADMIN_AUDIT_PAGE_SIZE = 20;

export function AdminAuditPage({
  realtimeVersion,
}: {
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [targetFilter, setTargetFilter] = useState<AuditTargetFilter>("all");
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [incidentOnly, setIncidentOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void withSession((s) =>
      fetchAdminAuditLogs(s, {
        targetType: targetFilter === "all" ? undefined : targetFilter,
        action: actionFilter === "all" ? undefined : actionFilter,
        search: deferredSearch || undefined,
        incidentOnly,
        page,
        limit: ADMIN_AUDIT_PAGE_SIZE,
      }),
    )
      .then((response) => {
        if (cancelled) return;
        setLogs((current) => {
          if (page === 1) return response.auditLogs;
          const byId = new Map(current.map((item) => [item.id, item]));
          response.auditLogs.forEach((item) => byId.set(item.id, item));
          return Array.from(byId.values());
        });
        setHasMore(response.hasMore);
        setTotal(response.total);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar auditoría.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actionFilter, deferredSearch, incidentOnly, page, realtimeVersion, targetFilter, withSession]);

  useEffect(() => {
    setPage(1);
    setLogs([]);
  }, [actionFilter, deferredSearch, incidentOnly, targetFilter]);

  return (
    <>
      <AdminPageFrame
        kicker="Admin / Operación"
        title="Auditoría"
        titleAccent="visible"
        description="Filtrá acciones, recursos y eventos críticos para revisar decisiones administrativas."
      />

      <div className="main-content admin-audit-page">
        {error ? <Alert tone="danger" message={error} /> : null}

        <div className="admin-audit-controls">
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Buscar por admin, comercio, promoción o nota..."
            countLabel={`${logs.length} de ${total} registros`}
          />

          <div className="admin-audit-filter-grid" aria-label="Filtros de auditoría">
            <label className="admin-audit-filter-field">
              <span className="field-label">Recurso</span>
              <select
                className="field-select"
                value={targetFilter}
                onChange={(event) => setTargetFilter(event.target.value as AuditTargetFilter)}
              >
                <option value="all">Todos los recursos</option>
                <option value="COMMERCE">Comercios</option>
                <option value="PROMOTION">Promociones</option>
              </select>
            </label>
            <label className="admin-audit-filter-field">
              <span className="field-label">Acción</span>
              <select
                className="field-select"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value as AuditActionFilter)}
              >
                <option value="all">Todas las acciones</option>
                <option value="UPDATE_COMMERCE_STATUS">Estados de comercio</option>
                <option value="UPDATE_PROMOTION_STATUS">Estados de promoción</option>
                <option value="UPDATE_COMMERCE_CONTENT">Edición de comercio</option>
                <option value="UPDATE_PROMOTION_CONTENT">Edición de promoción</option>
              </select>
            </label>
            <label className="admin-audit-incident-toggle">
              <input
                type="checkbox"
                checked={incidentOnly}
                onChange={(event) => setIncidentOnly(event.target.checked)}
              />
              <span>
                <strong>Solo incidentes</strong>
                <small>Oculta actividad rutinaria</small>
              </span>
            </label>
          </div>
        </div>

        {loading && page === 1 ? (
          <LoadingBlock title="Cargando auditoría" text="Trayendo historial administrativo." />
        ) : (
          <AuditTimelineCard
            title="Bitácora operativa"
            subtitle="Actividad administrativa ordenada por fecha y contexto"
            logs={logs}
            emptyMessage="No encontramos eventos con esos filtros."
            compact
          />
        )}

        {hasMore ? (
          <AdminPagination
            shown={logs.length}
            total={total}
            label="registros"
            loading={loading}
            onLoadMore={() => setPage((current) => current + 1)}
          />
        ) : null}
      </div>
    </>
  );
}
