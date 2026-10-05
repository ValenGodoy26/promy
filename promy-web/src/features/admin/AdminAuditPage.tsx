import React, { useDeferredValue, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { fetchAdminAuditLogs } from "../../lib/api";
import type { AdminAuditLogItem } from "../../types/api";
import {
  Alert,
  AdminPageFrame,
  AuditTimelineCard,
  LoadingBlock,
  Toolbar,
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
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar auditoria.");
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
        kicker="/ Admin · Operacion"
        title="Auditoria"
        titleAccent="visible"
        description="Filtrá acciones, recursos y eventos críticos para revisar decisiones administrativas."
      />

      <div className="main-content">
        {error ? <Alert tone="danger" message={error} /> : null}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por admin, comercio, promoción o nota..."
          countLabel={`${logs.length} de ${total} registros`}
        />

        <div className="admin-filter-chips">
          {[
            { id: "all", label: "Todo" },
            { id: "COMMERCE", label: "Comercios" },
            { id: "PROMOTION", label: "Promociones" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={targetFilter === option.id ? "chip is-active" : "chip"}
              onClick={() => setTargetFilter(option.id as AuditTargetFilter)}
            >
              {option.label}
            </button>
          ))}
          {[
            { id: "all", label: "Todas las acciones" },
            { id: "UPDATE_COMMERCE_STATUS", label: "Estados de comercio" },
            { id: "UPDATE_PROMOTION_STATUS", label: "Estados de promo" },
            { id: "UPDATE_COMMERCE_CONTENT", label: "Edicion comercio" },
            { id: "UPDATE_PROMOTION_CONTENT", label: "Edicion promo" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={actionFilter === option.id ? "chip is-active" : "chip"}
              onClick={() => setActionFilter(option.id as AuditActionFilter)}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            className={incidentOnly ? "chip is-active" : "chip"}
            onClick={() => setIncidentOnly((current) => !current)}
          >
            Solo incidentes
          </button>
        </div>

        {loading ? (
          <LoadingBlock title="Cargando auditoria" text="Trayendo historial administrativo." />
        ) : (
          <AuditTimelineCard
            title="Bitacora operativa"
            subtitle="Busqueda por usuario, comercio, promo y eventos criticos"
            logs={logs}
            emptyMessage="No encontramos eventos con esos filtros."
          />
        )}
        {hasMore ? (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setPage((current) => current + 1)}
            >
              Ver mas registros
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
