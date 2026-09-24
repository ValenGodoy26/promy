import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { IconAlert, IconArrowRight, IconTrending } from "../../components/Icons";
import { fetchCommercePromotions, fetchCommerceRedemptions } from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceManagedPromotion, CommerceManagedRedemption } from "../../types/api";
import { LoadingBlock } from "./CommerceShared";

type RangePreset = "today" | "7d" | "30d" | "custom";
type ChartMode = "all" | "generated" | "validated";

type DateRange = {
  start: Date;
  endExclusive: Date;
};

type DailyPoint = {
  key: string;
  date: Date;
  generated: number;
  validated: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function toInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPresetRange(preset: Exclude<RangePreset, "custom">, now = new Date()): DateRange {
  const today = startOfDay(now);
  const endExclusive = addDays(today, 1);

  if (preset === "today") return { start: today, endExclusive };
  if (preset === "7d") return { start: addDays(today, -6), endExclusive };
  return { start: addDays(today, -29), endExclusive };
}

function isWithinRange(value: string | null | undefined, range: DateRange) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date < range.endExclusive;
}

function formatCompactDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(value);
}

function formatLongDay(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" }).format(value);
}

function formatRangeLabel(range: DateRange) {
  const end = addDays(range.endExclusive, -1);
  const formatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
  if (toInputDate(range.start) === toInputDate(end)) return formatter.format(range.start);
  return `${formatter.format(range.start)} – ${formatter.format(end)}`;
}

function buildDailySeries(redemptions: CommerceManagedRedemption[], range: DateRange): DailyPoint[] {
  const days = Math.max(1, Math.round((range.endExclusive.getTime() - range.start.getTime()) / DAY_MS));
  const points: DailyPoint[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = addDays(range.start, index);
    points.push({ key: toInputDate(date), date, generated: 0, validated: 0 });
  }

  const byKey = new Map(points.map((point) => [point.key, point]));
  redemptions.forEach((redemption) => {
    const created = new Date(redemption.createdAt);
    if (Number.isNaN(created.getTime())) return;
    const point = byKey.get(toInputDate(created));
    if (!point) return;
    point.generated += 1;
    if (redemption.status === "SUCCESS") point.validated += 1;
  });

  return points;
}

function buildLinePoints(values: number[], max: number, width: number, height: number, padding: number) {
  if (!values.length) return "";
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const denominator = Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = padding + (index / denominator) * usableWidth;
      const y = height - padding - (value / Math.max(max, 1)) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function CommerceStatisticsPage({ realtimeVersion }: { realtimeVersion: number }) {
  const { withSession } = useAuth();
  const [promotions, setPromotions] = useState<CommerceManagedPromotion[]>([]);
  const [redemptions, setRedemptions] = useState<CommerceManagedRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [chartMode, setChartMode] = useState<ChartMode>("all");
  const defaultRange = getPresetRange("30d");
  const [customStart, setCustomStart] = useState(toInputDate(defaultRange.start));
  const [customEnd, setCustomEnd] = useState(toInputDate(addDays(defaultRange.endExclusive, -1)));

  const loadStatistics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [promotionResponse, redemptionResponse] = await Promise.all([
        withSession((session) => fetchCommercePromotions(session)),
        withSession((session) => fetchCommerceRedemptions(session)),
      ]);
      setPromotions(promotionResponse.promotions);
      setRedemptions(redemptionResponse.redemptions);
      setError(null);
    } catch (loadError) {
      setError(getUserFacingErrorMessage(loadError, "load"));
      throw loadError;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [withSession]);

  useEffect(() => {
    void loadStatistics().catch(() => undefined);
  }, [loadStatistics, realtimeVersion]);

  useLiveRefresh(() => loadStatistics(true).catch(() => undefined), { intervalMs: 30000 });

  const range = useMemo<DateRange>(() => {
    if (preset !== "custom") return getPresetRange(preset);
    const start = parseInputDate(customStart);
    const end = parseInputDate(customEnd);
    if (!start || !end || start > end) return getPresetRange("30d");
    return { start: startOfDay(start), endExclusive: addDays(startOfDay(end), 1) };
  }, [customEnd, customStart, preset]);

  const filteredRedemptions = useMemo(
    () => redemptions.filter((redemption) => isWithinRange(redemption.createdAt, range)),
    [range, redemptions],
  );

  const generatedCount = filteredRedemptions.length;
  const validatedCount = filteredRedemptions.filter((redemption) => redemption.status === "SUCCESS").length;
  const validationRate = generatedCount ? Math.round((validatedCount / generatedCount) * 100) : 0;
  const activePromotions = promotions.filter((promotion) => promotion.status === "APPROVED_VISIBLE").length;

  const dailySeries = useMemo(() => buildDailySeries(filteredRedemptions, range), [filteredRedemptions, range]);

  const allPromoPerformance = useMemo(() => {
    const counts = new Map<number, { generated: number; validated: number }>();
    filteredRedemptions.forEach((redemption) => {
      const current = counts.get(redemption.promotion.id) ?? { generated: 0, validated: 0 };
      current.generated += 1;
      if (redemption.status === "SUCCESS") current.validated += 1;
      counts.set(redemption.promotion.id, current);
    });

    return promotions
      .map((promotion) => {
        const count = counts.get(promotion.id) ?? { generated: 0, validated: 0 };
        return {
          promotion,
          ...count,
          rate: count.generated ? Math.round((count.validated / count.generated) * 100) : 0,
        };
      })
      .sort((a, b) => b.validated - a.validated || b.generated - a.generated || a.promotion.title.localeCompare(b.promotion.title));
  }, [filteredRedemptions, promotions]);

  const promoPerformance = allPromoPerformance.slice(0, 8);
  const movingPromotions = allPromoPerformance.filter((row) => row.generated > 0).length;
  const bestPromotion = allPromoPerformance.find((row) => row.validated > 0 || row.generated > 0) ?? null;
  const bestDay = [...dailySeries].sort((a, b) => b.validated - a.validated || b.generated - a.generated)[0] ?? null;
  const daysInRange = Math.max(1, dailySeries.length);
  const dailyAverage = generatedCount / daysInRange;

  const chartMax = Math.max(1, ...dailySeries.flatMap((point) => [point.generated, point.validated]));
  const chartGeneratedPoints = buildLinePoints(dailySeries.map((point) => point.generated), chartMax, 1000, 178, 22);
  const chartValidatedPoints = buildLinePoints(dailySeries.map((point) => point.validated), chartMax, 1000, 178, 22);
  const hasChartData = dailySeries.some((point) => point.generated > 0 || point.validated > 0);
  const customRangeInvalid = preset === "custom" && (() => {
    const start = parseInputDate(customStart);
    const end = parseInputDate(customEnd);
    return !start || !end || start > end;
  })();

  return (
    <div className="commerce-stats-page">
      <header className="commerce-stats-header">
        <div className="commerce-stats-header-inner">
          <div>
            <div className="commerce-simple-eyebrow">Estadísticas</div>
            <h1>Entendé qué promociones generan movimiento</h1>
            <p>Canjes, validaciones y rendimiento para decidir qué promociones vale la pena repetir.</p>
          </div>
        </div>
      </header>

      <div className="commerce-stats-content">
        {error ? (
          <div className="commerce-stats-error">
            <div className="alert alert-danger"><IconAlert size={14} className="alert-icon" /> <span>{error}</span></div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => void loadStatistics().catch(() => undefined)}>Reintentar</button>
          </div>
        ) : null}

        {loading && !error ? <LoadingBlock title="Cargando estadísticas" text="Estamos ordenando tus canjes y promociones." /> : null}

        {!loading ? (
          <>
            <section className="commerce-stats-toolbar" aria-label="Período de estadísticas">
              <div className="commerce-stats-range-tabs">
                {[
                  ["today", "Hoy"],
                  ["7d", "7 días"],
                  ["30d", "30 días"],
                  ["custom", "Personalizado"],
                ].map(([value, label]) => (
                  <button key={value} className={preset === value ? "is-active" : ""} type="button" onClick={() => setPreset(value as RangePreset)}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="commerce-stats-range-label">{formatRangeLabel(range)}</span>
            </section>

            {preset === "custom" ? (
              <section className="commerce-stats-custom-range">
                <label><span>Desde</span><input type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} /></label>
                <label><span>Hasta</span><input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} /></label>
                {customRangeInvalid ? <small>Elegí un rango válido para ver tus estadísticas.</small> : null}
              </section>
            ) : null}

            <section className="commerce-stats-metrics commerce-stats-metrics--five" aria-label="Resumen del período">
              <article className="is-future-metric">
                <div className="commerce-stats-metric-title"><span>Vistas</span><em>Tracking en preparación</em></div>
                <strong>—</strong>
                <small>Impresiones de tus promos en la app.</small>
              </article>
              <article className="is-future-metric">
                <div className="commerce-stats-metric-title"><span>Aperturas</span><em>Tracking en preparación</em></div>
                <strong>—</strong>
                <small>Personas que abrieron el detalle.</small>
              </article>
              <article>
                <span>Canjes generados</span>
                <strong>{generatedCount.toLocaleString("es-AR")}</strong>
                <small>Personas que generaron un beneficio.</small>
              </article>
              <article>
                <span>Canjes validados</span>
                <strong>{validatedCount.toLocaleString("es-AR")}</strong>
                <small>Canjes que efectivamente llegaron al local.</small>
              </article>
              <article>
                <span>Tasa de validación</span>
                <strong>{generatedCount > 0 ? `${validationRate}%` : "—"}</strong>
                <small>{generatedCount > 0 ? "Validados sobre canjes generados." : "Se calcula cuando haya canjes."}</small>
              </article>
            </section>

            <section className="commerce-stats-card commerce-stats-funnel-card">
              <div className="commerce-stats-card-head">
                <div>
                  <span className="commerce-stats-kicker">Recorrido</span>
                  <h2>De descubrir una promo a usarla</h2>
                </div>
                <span className="commerce-stats-tracking-note">Vistas y aperturas se activan con tracking del cliente</span>
              </div>
              <div className="commerce-stats-funnel">
                <div className="is-pending"><span>Vistas</span><strong>—</strong><small>por medir</small></div>
                <i>→</i>
                <div className="is-pending"><span>Aperturas</span><strong>—</strong><small>por medir</small></div>
                <i>→</i>
                <div><span>Canjes</span><strong>{generatedCount.toLocaleString("es-AR")}</strong><small>generados</small></div>
                <i>→</i>
                <div className="is-final"><span>Validados</span><strong>{validatedCount.toLocaleString("es-AR")}</strong><small>{generatedCount ? `${validationRate}% de los canjes` : "sin canjes todavía"}</small></div>
              </div>
            </section>

            <section className="commerce-stats-card commerce-stats-chart-card">
              <div className="commerce-stats-card-head commerce-stats-card-head--chart">
                <div>
                  <span className="commerce-stats-kicker">Actividad</span>
                  <h2>Movimiento por día</h2>
                </div>
                <div className="commerce-stats-chart-controls" aria-label="Series del gráfico">
                  {[ ["all", "Todos"], ["generated", "Canjes"], ["validated", "Validados"] ].map(([value, label]) => (
                    <button key={value} type="button" className={chartMode === value ? "is-active" : ""} onClick={() => setChartMode(value as ChartMode)}>{label}</button>
                  ))}
                </div>
              </div>

              {hasChartData ? (
                <div className="commerce-stats-chart-wrap">
                  <svg className="commerce-stats-chart" viewBox="0 0 1000 178" role="img" aria-label="Canjes generados y validados por día">
                    {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="22" x2="978" y1={22 + ratio * 134} y2={22 + ratio * 134} className="commerce-stats-chart-grid" />)}
                    {chartMode !== "validated" ? <polyline points={chartGeneratedPoints} className="commerce-stats-chart-line is-generated" /> : null}
                    {chartMode !== "generated" ? <polyline points={chartValidatedPoints} className="commerce-stats-chart-line is-validated" /> : null}
                  </svg>
                  <div className="commerce-stats-chart-axis">
                    <span>{formatCompactDate(dailySeries[0]?.date ?? range.start)}</span>
                    {dailySeries.length > 2 ? <span>{formatCompactDate(dailySeries[Math.floor(dailySeries.length / 2)].date)}</span> : null}
                    <span>{formatCompactDate(dailySeries[dailySeries.length - 1]?.date ?? addDays(range.endExclusive, -1))}</span>
                  </div>
                </div>
              ) : (
                <div className="commerce-stats-empty-chart commerce-stats-empty-chart--compact">
                  <IconTrending size={20} />
                  <strong>Todavía no hay movimiento en este período.</strong>
                  <span>Cuando se generen canjes, la actividad va a aparecer acá.</span>
                </div>
              )}
            </section>

            {generatedCount > 0 ? (
              <section className="commerce-stats-insights" aria-label="Lecturas rápidas">
                <article>
                  <span>Promo con más movimiento</span>
                  <strong>{bestPromotion ? bestPromotion.promotion.title : "Todavía sin datos"}</strong>
                  <small>{bestPromotion ? `${bestPromotion.validated} validados · ${bestPromotion.generated} generados` : "Aparecerá cuando haya canjes."}</small>
                </article>
                <article>
                  <span>Mejor día</span>
                  <strong>{bestDay && (bestDay.generated > 0 || bestDay.validated > 0) ? formatLongDay(bestDay.date) : "Todavía sin datos"}</strong>
                  <small>{bestDay && (bestDay.generated > 0 || bestDay.validated > 0) ? `${bestDay.validated} validados · ${bestDay.generated} generados` : "Aparecerá cuando haya actividad."}</small>
                </article>
                <article>
                  <span>Promos con movimiento</span>
                  <strong>{movingPromotions.toLocaleString("es-AR")} de {activePromotions.toLocaleString("es-AR")}</strong>
                  <small>{`${dailyAverage.toLocaleString("es-AR", { maximumFractionDigits: 1 })} canjes por día en promedio.`}</small>
                </article>
              </section>
            ) : (
              <section className="commerce-stats-insights commerce-stats-insights--empty" aria-label="Lecturas rápidas">
                <article>
                  <IconTrending size={18} />
                  <div>
                    <strong>Todavía no hay suficiente actividad para destacar tendencias.</strong>
                    <small>Cuando empiecen a generarse canjes, acá vas a ver tu promo con más movimiento, el mejor día y cuántas promociones están funcionando.</small>
                  </div>
                </article>
              </section>
            )}

            <section className="commerce-stats-card">
              <div className="commerce-stats-card-head">
                <div>
                  <span className="commerce-stats-kicker">Rendimiento</span>
                  <h2>Promociones</h2>
                </div>
                <Link to="/commerce/promotions">Gestionar promociones <IconArrowRight size={13} /></Link>
              </div>

              {promoPerformance.length ? (
                <div className="commerce-stats-table-wrap">
                  <table className="commerce-stats-table commerce-stats-table--analytics">
                    <thead><tr><th>Promoción</th><th>Vistas</th><th>Aperturas</th><th>Canjes</th><th>Validados</th><th>Tasa</th></tr></thead>
                    <tbody>
                      {promoPerformance.map(({ promotion, generated, validated, rate }) => (
                        <tr key={promotion.id}>
                          <td><Link to={`/commerce/promotions/${promotion.id}`}>{promotion.title}</Link><span>{promotion.status === "APPROVED_VISIBLE" ? "Activa" : ""}</span></td>
                          <td className="is-tracking-pending">—</td>
                          <td className="is-tracking-pending">—</td>
                          <td>{generated.toLocaleString("es-AR")}</td>
                          <td>{validated.toLocaleString("es-AR")}</td>
                          <td><strong>{generated ? `${rate}%` : "—"}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="commerce-stats-table-empty"><strong>Todavía no tenés promociones para comparar.</strong><Link to="/commerce/promotions/new">Crear una promoción</Link></div>
              )}
            </section>

            <aside className="commerce-stats-note commerce-stats-note--tracking">
              <div><strong>Datos reales.</strong><span>No mostramos vistas ni aperturas inventadas: esas dos métricas se activarán cuando el cliente mobile empiece a registrar impresiones y aperturas.</span></div>
              <span>Promociones activas ahora: <strong>{activePromotions}</strong></span>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
