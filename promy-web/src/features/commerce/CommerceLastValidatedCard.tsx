import React from "react";
import type { CommerceManagedRedemption } from "../../types/api";
import { formatDate, getStatusLabel } from "./CommerceShared";

type CommerceLastValidatedCardProps = {
  redemption: CommerceManagedRedemption;
};

export function CommerceLastValidatedCard({ redemption }: CommerceLastValidatedCardProps) {
  return (
    <section className="panel redeem-detail-panel">
      <div className="panel-heading">
        <div className="panel-heading-stack">
          <h2>Ultimo canje validado</h2>
          <p>Resumen inmediato para confirmar que el canje correcto quedo registrado.</p>
        </div>
      </div>

      <div className="redeem-detail-grid">
        <div className="redeem-detail-card">
          <span className="redeem-detail-label">Promocion</span>
          <strong>{redemption.promotion.title}</strong>
        </div>
        <div className="redeem-detail-card">
          <span className="redeem-detail-label">Cliente</span>
          <strong>{redemption.user.fullName}</strong>
        </div>
        <div className="redeem-detail-card">
          <span className="redeem-detail-label">Codigo</span>
          <strong className="font-mono">{redemption.validationCode || "-"}</strong>
        </div>
        <div className="redeem-detail-card">
          <span className="redeem-detail-label">Validado</span>
          <strong>{formatDate(redemption.redeemedAt || redemption.createdAt)}</strong>
        </div>
        <div className="redeem-detail-card redeem-detail-card-wide">
          <span className="redeem-detail-label">Comercio y estado</span>
          <strong>
            {redemption.commerce.name} · {getStatusLabel(redemption.status)}
          </strong>
        </div>
      </div>
    </section>
  );
}
