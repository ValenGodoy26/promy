import React from "react";
import type { AdminCommerceItem } from "../../types/api";
import { AdminDataTable, AdminPagination, MiniBadge, StatusBadge } from "./AdminShared";
import { getReadinessSummary } from "./commerceReadiness";

type AdminCommercesTableProps = {
  commerces: AdminCommerceItem[];
  selectedId: number | null;
  totalCount: number;
  canLoadMore: boolean;
  onSelect: (commerceId: number) => void;
  onLoadMore: () => void;
};

export function AdminCommercesTable({
  commerces,
  selectedId,
  totalCount,
  canLoadMore,
  onSelect,
  onLoadMore,
}: AdminCommercesTableProps) {
  return (
    <AdminDataTable
      label="Comercios adheridos"
      footer={canLoadMore ? (
        <AdminPagination
          shown={commerces.length}
          total={totalCount}
          label="comercios"
          onLoadMore={onLoadMore}
        />
      ) : null}
    >
        <thead>
          <tr>
            <th>Comercio</th>
            <th>Owner</th>
            <th>Categoria</th>
            <th>Actividad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {commerces.map((commerce) => {
            const readiness = getReadinessSummary(commerce);
            return <tr
              key={commerce.id}
              className={selectedId === commerce.id ? "is-selected" : ""}
              onClick={() => onSelect(commerce.id)}
            >
              <td>
                <div className="cell-primary">{commerce.name}</div>
                <span className="cell-sub">{commerce.city.name}</span>
              </td>
              <td>
                <div className="cell-primary">{commerce.owner.fullName || "-"}</div>
                <span className="cell-sub cell-email">{commerce.owner.email}</span>
              </td>
              <td>
                <div className="cell-primary">{commerce.category.name}</div>
                <span className="cell-sub">
                  {readiness.label}
                </span>
              </td>
              <td>
                <span className="admin-cell-mono">
                  {commerce._count.promotions} promos · {commerce._count.redemptions} canjes
                </span>
              </td>
              <td>
                <div className="stacked-badges">
                  <StatusBadge status={commerce.status} />
                  <MiniBadge
                    tone={readiness.tone}
                    label={readiness.label}
                  />
                </div>
              </td>
            </tr>;
          })}
          {commerces.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="empty-state-inline">
                  <div className="empty-state-icon">◍</div>
                  <div className="empty-state-text">Sin resultados para este filtro</div>
                  <div className="empty-state-hint">
                    Proba cambiando el filtro de estado o el texto de busqueda.
                  </div>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
    </AdminDataTable>
  );
}
