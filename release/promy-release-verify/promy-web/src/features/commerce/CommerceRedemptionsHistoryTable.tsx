import React from "react";
import type { CommerceManagedRedemption } from "../../types/api";
import { formatDate, StatusBadge } from "./CommerceShared";

type CommerceRedemptionsHistoryTableProps = {
  redemptions: CommerceManagedRedemption[];
};

export function CommerceRedemptionsHistoryTable({
  redemptions,
}: CommerceRedemptionsHistoryTableProps) {
  return (
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
                <span className="cell-sub">{redemption.user.email}</span>
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
  );
}
