export type CommerceRedemptionUser = {
  id: number;
  fullName: string;
} | null;

export function getCommerceRedemptionUserLabel(user: CommerceRedemptionUser) {
  return user ? user.fullName : "Cuenta eliminada";
}
