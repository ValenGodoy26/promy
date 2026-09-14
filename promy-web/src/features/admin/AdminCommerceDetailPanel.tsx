import React from "react";
import type { AdminAuditLogItem, AdminCommerceItem } from "../../types/api";
import { IconCheck, IconPause, IconX } from "../../components/Icons";
import {
  Alert,
  AuditTimelineCard,
  DetailRow,
  MiniBadge,
  formatMissingFields,
  getStatusLabel,
} from "./AdminShared";
import { getApprovalBlockingFields, getReadinessSummary } from "./commerceReadiness";

type AdminCommerceDetailPanelProps = {
  selected: AdminCommerceItem;
  auditLogs: AdminAuditLogItem[];
  auditLoading: boolean;
  auditError: string | null;
  onModerate: (nextStatus: string) => void;
  controlPanel: React.ReactNode;
};

export function AdminCommerceDetailPanel({
  selected,
  auditLogs,
  auditLoading,
  auditError,
  onModerate,
  controlPanel,
}: AdminCommerceDetailPanelProps) {
  const readiness = getReadinessSummary(selected);
  const approvalBlockingFields = getApprovalBlockingFields(selected);

  return (
    <aside className="detail-card">
      <div className="page-kicker">Detalle del comercio</div>
      <h2 className="detail-title">{selected.name}</h2>
      <p className="detail-desc">
        {selected.shortDescription || selected.description || "Sin descripcion cargada."}
      </p>

      <div className="stacked-badges" style={{ marginBottom: 14 }}>
        <MiniBadge
          tone={readiness.tone}
          label={readiness.label}
        />
        <MiniBadge
          tone={selected.readiness.isProfileComplete ? "success" : "neutral"}
          label={
            selected.readiness.isProfileComplete
              ? "Perfil completo"
              : `${selected.readiness.missingFields.length} faltantes`
          }
        />
      </div>

      <div className="detail-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={() => onModerate("APPROVED")}>
          <IconCheck size={13} /> Aprobar
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => onModerate("REJECTED")}>
          <IconX size={13} /> Rechazar
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => onModerate("INACTIVE")}>
          <IconPause size={13} /> Inactivar
        </button>
      </div>

      <div className="detail-list">
        <DetailRow label="Estado" value={getStatusLabel(selected.status)} />
        <DetailRow label="Owner" value={`${selected.owner.fullName} · ${selected.owner.email}`} />
        <DetailRow
          label="Ubicacion"
          value={`${selected.address || "Sin direccion"} · ${selected.city.name}`}
        />
        <DetailRow label="Categoria" value={selected.category.name} />
        <DetailRow
          label="Actividad"
          value={`${selected._count.promotions} promos / ${selected._count.redemptions} canjes`}
        />
        <DetailRow
          label="Observacion"
          value={selected.moderationNote || "Sin observaciones de moderacion."}
        />
      </div>

      <div className="detail-list" style={{ marginTop: 12 }}>
        <DetailRow
          label="Mapa"
          value={
            selected.readiness.isMapReady
              ? "Visible para cercania y marcadores"
              : approvalBlockingFields.length
                ? formatMissingFields(approvalBlockingFields)
                : "Disponible cuando el estado administrativo lo habilite"
          }
        />
        <DetailRow
          label="Perfil"
          value={
            selected.readiness.isProfileComplete
              ? "Sin faltantes operativos"
              : formatMissingFields(selected.readiness.missingFields)
          }
        />
        <DetailRow
          label="Aprobacion"
          value={
            approvalBlockingFields.length
              ? `Bloqueada por: ${formatMissingFields(approvalBlockingFields)}`
              : selected.status === "PENDING"
                ? "Lista para decision administrativa"
                : getStatusLabel(selected.status)
          }
        />
      </div>

      {controlPanel}

      <AuditTimelineCard
        title="Historial"
        subtitle={auditLoading ? "Actualizando..." : "Cambios sobre este comercio"}
        logs={auditLogs}
        emptyMessage="Sin acciones administrativas registradas."
        inline
      />
      {auditError ? <Alert tone="danger" message={auditError} style={{ marginTop: 12 }} /> : null}
    </aside>
  );
}
