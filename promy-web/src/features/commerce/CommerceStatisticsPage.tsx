import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { IconAlert, IconArrowRight, IconTrending } from "../../components/Icons";
import { fetchCommerceStatistics } from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceStatistics } from "../../types/api";
import { LoadingBlock } from "./CommerceShared";

type RangePreset = "today" | "7d" | "30d" | "custom";
type ChartMode = "all" | "impressions" | "opens" | "generated" | "validated";

function formatDateOnly(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-AR", { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatRangeLabel(range: CommerceStatistics["range"]) {
  const from = formatDateOnly(range.from);
  const to = formatDateOnly(range.to);
  return range.from === range.to ? from : `${from} – ${to}`;
}

function formatMetric(value: number | null) {
  return value == null ? "—" : value.toLocaleString("es-AR");
}

function formatRate(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function buildLinePoints(values: number[], max: number, width = 1000, height = 178, padding = 22) {
  if (!values.length) return "";
  return values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / Math.max(max, 1)) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function CommerceStatisticsPage({ realtimeVersion }: { realtimeVersion: number }) {
  const { withSession } = useAuth();
  const [statistics, setStatistics] = useState<CommerceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [chartMode, setChartMode] = useState<ChartMode>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const customRangeInvalid = preset === "custom" && (!customStart || !customEnd || customStart > customEnd);

  const loadStatistics = useCallback(async (silent = false) => {
    if (preset === "custom" && (!customStart || !customEnd || customStart > customEnd)) return;
    if (!silent) setLoading(true);
    try {
      const response = await withSession((session) => fetchCommerceStatistics(session, {
        range: preset,
        from: preset === "custom" ? customStart : undefined,
        to: preset === "custom" ? customEnd : undefined,
      }));
      setStatistics(response.statistics);
      setError(null);
    } catch (loadError) {
      setError(getUserFacingErrorMessage(loadError, "load"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [customEnd, customStart, preset, withSession]);

  useEffect(() => { void loadStatistics(); }, [loadStatistics, realtimeVersion]);
  useLiveRefresh(() => loadStatistics(true), { intervalMs: 30000 });

  const summary = statistics?.summary;
  const series = statistics?.series ?? [];
  const chartValues = useMemo(() => {
    if (chartMode === "impressions") return series.map((point) => point.impressions ?? 0);
    if (chartMode === "opens") return series.map((point) => point.opens ?? 0);
    if (chartMode === "generated") return series.map((point) => point.generated);
    if (chartMode === "validated") return series.map((point) => point.validated);
    return series.flatMap((point) => [point.impressions ?? 0, point.opens ?? 0, point.generated, point.validated]);
  }, [chartMode, series]);
  const chartMax = Math.max(1, ...chartValues);
  const partiallyCovered = Boolean(statistics?.analyticsDataFrom && statistics.range.from < statistics.analyticsDataFrom);
  const hasActivity = series.some((point) => (point.impressions ?? 0) > 0 || (point.opens ?? 0) > 0 || point.generated > 0 || point.validated > 0);
  const bestPromotion = statistics?.promotions.find((promotion) => promotion.validated > 0 || promotion.generated > 0 || (promotion.opens ?? 0) > 0 || (promotion.impressions ?? 0) > 0) ?? null;
  const activePromotions = statistics?.promotions.filter((promotion) => promotion.status === "APPROVED_VISIBLE").length ?? 0;

  return (
    <div className="commerce-stats-page">
      <header className="commerce-stats-header"><div className="commerce-stats-header-inner"><div><div className="commerce-simple-eyebrow">Estadísticas</div><h1>Entendé qué promociones generan movimiento</h1><p>Vistas, aperturas, canjes y validaciones para decidir qué promociones vale la pena repetir.</p></div></div></header>
      <div className="commerce-stats-content">
        {error ? <div className="commerce-stats-error"><div className="alert alert-danger"><IconAlert size={14} className="alert-icon" /><span>{error}</span></div><button className="btn btn-secondary btn-sm" type="button" onClick={() => void loadStatistics()}>Reintentar</button></div> : null}
        {loading && !statistics ? <LoadingBlock title="Cargando estadísticas" text="Estamos ordenando la actividad de tus promociones." /> : null}
        {statistics ? <>
          <section className="commerce-stats-toolbar" aria-label="Período de estadísticas"><div className="commerce-stats-range-tabs">{[["today", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["custom", "Personalizado"]].map(([value, label]) => <button key={value} className={preset === value ? "is-active" : ""} type="button" onClick={() => setPreset(value as RangePreset)}>{label}</button>)}</div><span className="commerce-stats-range-label">{formatRangeLabel(statistics.range)}</span></section>
          {preset === "custom" ? <section className="commerce-stats-custom-range"><label><span>Desde</span><input type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} /></label><label><span>Hasta</span><input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} /></label>{customRangeInvalid ? <small>Elegí un rango válido para ver tus estadísticas.</small> : null}</section> : null}
          {statistics.analyticsDataFrom === null ? <aside className="commerce-stats-note commerce-stats-note--tracking"><div><strong>La medición está activa.</strong><span>Todavía no hay actividad registrada de vistas ni aperturas.</span></div></aside> : null}
          {partiallyCovered ? <aside className="commerce-stats-note commerce-stats-note--tracking"><div><strong>Cobertura parcial.</strong><span>Vistas y aperturas disponibles desde {formatDateOnly(statistics.analyticsDataFrom!, { day: "2-digit", month: "2-digit", year: "numeric" })}.</span></div></aside> : null}
          <section className="commerce-stats-metrics commerce-stats-metrics--five" aria-label="Resumen del período">
            <article><span>Vistas</span><strong>{formatMetric(summary!.impressions)}</strong><small>Impresiones medidas en Explorar.</small></article>
            <article><span>Aperturas</span><strong>{formatMetric(summary!.opens)}</strong><small>Detalles públicos abiertos.</small></article>
            <article><span>Canjes generados</span><strong>{summary!.generatedRedemptions.toLocaleString("es-AR")}</strong><small>Beneficios generados en el período.</small></article>
            <article><span>Canjes validados</span><strong>{summary!.validatedRedemptions.toLocaleString("es-AR")}</strong><small>Canjes confirmados en el local.</small></article>
            <article><span>Tasa de validación</span><strong>{formatRate(summary!.validationRate)}</strong><small>Validados sobre canjes generados.</small></article>
          </section>
          <section className="commerce-stats-card commerce-stats-funnel-card"><div className="commerce-stats-card-head"><div><span className="commerce-stats-kicker">Recorrido</span><h2>De descubrir una promo a usarla</h2></div><span className="commerce-stats-tracking-note">Medición real, sin vistas inventadas</span></div><div className="commerce-stats-funnel"><div><span>Vistas</span><strong>{formatMetric(summary!.impressions)}</strong><small>medidas</small></div><i>→</i><div><span>Aperturas</span><strong>{formatMetric(summary!.opens)}</strong><small>{formatRate(summary!.openRate)} de vistas</small></div><i>→</i><div><span>Canjes</span><strong>{summary!.generatedRedemptions.toLocaleString("es-AR")}</strong><small>{formatRate(summary!.redemptionRate)} de aperturas</small></div><i>→</i><div className="is-final"><span>Validados</span><strong>{summary!.validatedRedemptions.toLocaleString("es-AR")}</strong><small>{formatRate(summary!.finalConversion)} de vistas</small></div></div></section>
          <section className="commerce-stats-card commerce-stats-chart-card"><div className="commerce-stats-card-head commerce-stats-card-head--chart"><div><span className="commerce-stats-kicker">Actividad</span><h2>Movimiento por día</h2></div><div className="commerce-stats-chart-controls" aria-label="Series del gráfico">{[["all", "Todos"], ["impressions", "Vistas"], ["opens", "Aperturas"], ["generated", "Canjes"], ["validated", "Validados"]].map(([value, label]) => <button key={value} type="button" className={chartMode === value ? "is-active" : ""} onClick={() => setChartMode(value as ChartMode)}>{label}</button>)}</div></div>
            {hasActivity ? <div className="commerce-stats-chart-wrap"><svg className="commerce-stats-chart" viewBox="0 0 1000 178" role="img" aria-label="Actividad de promociones por día">{[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="22" x2="978" y1={22 + ratio * 134} y2={22 + ratio * 134} className="commerce-stats-chart-grid" />)}{chartMode === "all" || chartMode === "impressions" ? <polyline points={buildLinePoints(series.map((point) => point.impressions ?? 0), chartMax)} className="commerce-stats-chart-line is-generated" /> : null}{chartMode === "all" || chartMode === "opens" ? <polyline points={buildLinePoints(series.map((point) => point.opens ?? 0), chartMax)} className="commerce-stats-chart-line is-validated" /> : null}{chartMode === "all" || chartMode === "generated" ? <polyline points={buildLinePoints(series.map((point) => point.generated), chartMax)} className="commerce-stats-chart-line is-generated" /> : null}{chartMode === "all" || chartMode === "validated" ? <polyline points={buildLinePoints(series.map((point) => point.validated), chartMax)} className="commerce-stats-chart-line is-validated" /> : null}</svg><div className="commerce-stats-chart-axis"><span>{formatDateOnly(series[0]?.date ?? statistics.range.from)}</span>{series.length > 2 ? <span>{formatDateOnly(series[Math.floor(series.length / 2)].date)}</span> : null}<span>{formatDateOnly(series[series.length - 1]?.date ?? statistics.range.to)}</span></div></div> : <div className="commerce-stats-empty-chart commerce-stats-empty-chart--compact"><IconTrending size={20} /><strong>Todavía no hay movimiento en este período.</strong><span>La actividad va a aparecer acá cuando se mida o se generen canjes.</span></div>}</section>
          <section className="commerce-stats-insights" aria-label="Lecturas rápidas"><article><span>Promo con más movimiento</span><strong>{bestPromotion?.title ?? "Todavía sin datos"}</strong><small>{bestPromotion ? `${bestPromotion.validated} validados · ${bestPromotion.generated} generados` : "Aparecerá cuando haya actividad."}</small></article><article><span>Promos con movimiento</span><strong>{statistics.promotions.filter((promotion) => promotion.generated > 0 || promotion.validated > 0 || (promotion.opens ?? 0) > 0).length.toLocaleString("es-AR")} de {activePromotions.toLocaleString("es-AR")}</strong><small>Actividad del período seleccionado.</small></article></section>
          <section className="commerce-stats-card"><div className="commerce-stats-card-head"><div><span className="commerce-stats-kicker">Rendimiento</span><h2>Promociones</h2></div><Link to="/commerce/promotions">Gestionar promociones <IconArrowRight size={13} /></Link></div>{statistics.promotions.length ? <div className="commerce-stats-table-wrap"><table className="commerce-stats-table commerce-stats-table--analytics"><thead><tr><th>Promoción</th><th>Vistas</th><th>Aperturas</th><th>Canjes</th><th>Validados</th><th>Conversión</th></tr></thead><tbody>{statistics.promotions.slice(0, 8).map((promotion) => <tr key={promotion.promotionId}><td><Link to={`/commerce/promotions/${promotion.promotionId}`}>{promotion.title}</Link><span>{promotion.status === "APPROVED_VISIBLE" ? "Activa" : ""}</span></td><td>{formatMetric(promotion.impressions)}</td><td>{formatMetric(promotion.opens)}</td><td>{promotion.generated.toLocaleString("es-AR")}</td><td>{promotion.validated.toLocaleString("es-AR")}</td><td><strong>{formatRate(promotion.finalConversion)}</strong></td></tr>)}</tbody></table></div> : <div className="commerce-stats-table-empty"><strong>Todavía no tenés promociones para comparar.</strong><Link to="/commerce/promotions/new">Crear una promoción</Link></div>}</section>
          <aside className="commerce-stats-note commerce-stats-note--tracking"><div><strong>Datos reales.</strong><span>Vistas y aperturas se registran desde la app y los canjes se calculan en horario de {statistics.timezone}.</span></div><span>Promociones activas ahora: <strong>{activePromotions}</strong></span></aside>
        </> : null}
      </div>
    </div>
  );
}
