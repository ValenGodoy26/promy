import React from "react";
import type { CommerceManagedRedemption } from "../../types/api";
import { formatDate, StatusBadge } from "./CommerceShared";

function escapeCSVCell(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildCSVContent(redemptions: CommerceManagedRedemption[]) {
  const headers = [
    "ID",
    "Cliente",
    "Promocion",
    "Tipo",
    "Descuento",
    "Cupo maximo",
    "Canjes exitosos",
    "Metodo validacion",
    "Estado",
    "Codigo",
    "Fecha",
  ];

  const rows = redemptions.map((r) => [
    r.id,
    r.user.fullName,
    r.promotion.title,
    r.promotion.promotionType,
    r.promotion.discountValue ?? "",
    r.promotion.maxRedemptions ?? "Sin cupo",
    (r.promotion as { successRedemptionsCount?: number }).successRedemptionsCount ?? "",
    r.validationMethod === "MANUAL_CODE" ? "Codigo manual" : "QR",
    r.status,
    r.validationCode ?? "",
    formatDate(r.redeemedAt || r.createdAt),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCSVCell).join(","))
    .join("\n");
}

function downloadCSV(content: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildExportFilename() {
  const date = new Date().toISOString().split("T")[0];
  return `canjes-${date}.csv`;
}

type CommerceRedemptionsHistoryTableProps = {
  redemptions: CommerceManagedRedemption[];
};

export function CommerceRedemptionsHistoryTable({
  redemptions,
}: CommerceRedemptionsHistoryTableProps) {
  const handleExport = () => {
    if (redemptions.length === 0) return;
    const content = buildCSVContent(redemptions);
    downloadCSV(content, buildExportFilename());
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <span className="summary-count">{redemptions.length} registros</span>

        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={handleExport}
          disabled={redemptions.length === 0}
          title="Exportar todos los canjes a un archivo CSV compatible con Excel"
        >
          ↓ Exportar CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Promocion</th>
              <th>Metodo</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((redemption) => (
              <tr key={redemption.id}>
                <td>
                  <div className="cell-primary">{redemption.user.fullName}</div>
                </td>
                <td>{redemption.promotion.title}</td>
                <td>
                  <span className="font-mono" style={{ fontSize: 12 }}>
                    {redemption.validationMethod === "MANUAL_CODE" ? "Codigo manual" : "QR"}
                  </span>
                </td>
                <td>
                  <StatusBadge status={redemption.status} />
                </td>
                <td>
                  <span className="font-mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
                    {formatDate(redemption.redeemedAt || redemption.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
