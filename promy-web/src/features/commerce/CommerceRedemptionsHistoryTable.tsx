import React from "react";
import { IconCheck, IconClock, IconReceipt } from "../../components/Icons";
import type { CommerceManagedRedemption } from "../../types/api";
import { formatDate, getStatusLabel } from "./CommerceShared";
import { escapeCSVCell } from "./csv";

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
    r.user?.fullName || "Cuenta eliminada",
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

function getHistoryTone(status: string) {
  if (status === "SUCCESS") return "success";
  if (status === "PENDING") return "pending";
  return "neutral";
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
    <section className="redeem-history" aria-labelledby="redeem-history-title">
      <div className="redeem-history-head">
        <div>
          <span className="redeem-history-eyebrow">Actividad</span>
          <h2 id="redeem-history-title">Canjes recientes</h2>
        </div>
        <button
          className="redeem-history-export"
          type="button"
          onClick={handleExport}
          title="Descargar el historial de canjes"
        >
          Exportar
        </button>
      </div>

      <div className="redeem-history-list">
        {redemptions.map((redemption) => {
          const isSuccess = redemption.status === "SUCCESS";
          return (
            <article className="redeem-history-row" key={redemption.id}>
              <span className={`redeem-history-icon is-${getHistoryTone(redemption.status)}`}>
                {isSuccess ? <IconCheck size={15} /> : redemption.status === "PENDING" ? <IconClock size={15} /> : <IconReceipt size={15} />}
              </span>
              <div className="redeem-history-main">
                <strong>{redemption.promotion.title}</strong>
                <span>
                  {redemption.user?.fullName || "Cuenta eliminada"} · {formatDate(redemption.redeemedAt || redemption.createdAt)}
                </span>
              </div>
              <span className={`redeem-history-status is-${getHistoryTone(redemption.status)}`}>
                {getStatusLabel(redemption.status)}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
