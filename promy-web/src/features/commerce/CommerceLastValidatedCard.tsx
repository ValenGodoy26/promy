import React from "react";
import { IconCheck } from "../../components/Icons";
import type { CommerceManagedRedemption } from "../../types/api";
import { formatDate } from "./CommerceShared";

type CommerceLastValidatedCardProps = {
  redemption: CommerceManagedRedemption;
};

export function CommerceLastValidatedCard({ redemption }: CommerceLastValidatedCardProps) {
  const customerName = redemption.user?.fullName || "el cliente";

  return (
    <section className="redeem-result redeem-result-success" aria-live="polite">
      <span className="redeem-result-icon"><IconCheck size={22} /></span>
      <div className="redeem-result-copy">
        <strong>Canje aprobado</strong>
        <span>
          {redemption.promotion.title} quedó registrado para {customerName}.
        </span>
        <small>{formatDate(redemption.redeemedAt || redemption.createdAt)}</small>
      </div>
    </section>
  );
}
