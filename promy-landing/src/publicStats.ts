export type PublicStats = {
  approvedCommerces: number;
  activePromotions: number;
  activeCities: number;
};

export type PublicStatsState =
  | { status: "loading" | "unavailable"; data: null }
  | { status: "available"; data: PublicStats };

export const INITIAL_PUBLIC_STATS: PublicStatsState = { status: "loading", data: null };

export function parsePublicStats(input: unknown): PublicStats | null {
  if (!input || typeof input !== "object") return null;
  const stats = input as Partial<PublicStats>;
  const values = [stats.approvedCommerces, stats.activePromotions, stats.activeCities];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) {
    return null;
  }
  return {
    approvedCommerces: stats.approvedCommerces as number,
    activePromotions: stats.activePromotions as number,
    activeCities: stats.activeCities as number,
  };
}

export function displayPublicStat(state: PublicStatsState, key: keyof PublicStats) {
  return state.status === "available" ? String(state.data[key]) : "—";
}
