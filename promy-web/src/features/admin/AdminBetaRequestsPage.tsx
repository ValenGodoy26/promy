import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { fetchAdminBetaRequests } from "../../lib/api";
import type { AdminBetaAccessRequest } from "../../types/api";
import {
  Alert,
  DetailRow,
  FilterChips,
  LoadingBlock,
  MiniBadge,
  PageHeader,
  StatCard,
  Toolbar,
  formatDate,
} from "./AdminShared";

type BetaFilter = "all" | "IPHONE" | "ANDROID";

const ADMIN_BETA_PAGE_SIZE = 25;

function getPlatformLabel(platform: "IPHONE" | "ANDROID") {
  return platform === "IPHONE" ? "iPhone" : "Android";
}

export function AdminBetaRequestsPage({
  tabs,
  realtimeVersion,
}: {
  tabs: Array<{ to: string; label: string; end?: boolean }>;
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [requests, setRequests] = useState<AdminBetaAccessRequest[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<BetaFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    void withSession((s) =>
      fetchAdminBetaRequests(s, {
        platform: filter === "all" ? undefined : filter,
        search: deferredSearch || undefined,
        page: 1,
        limit: ADMIN_BETA_PAGE_SIZE,
      }),
    )
      .then((response) => {
        setRequests(response.requests);
        setSelectedId((current) => {
          if (current && response.requests.some((item) => item.id === current)) return current;
          return response.requests[0]?.id ?? null;
        });
        setTotal(response.total);
        setError(null);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "No pudimos cargar la lista de espera.",
        );
      })
      .finally(() => setLoading(false));
  }, [deferredSearch, filter, realtimeVersion, withSession]);

  const loadMore = async () => {
    const nextPage = page + 1;
    try {
      setLoadingMore(true);
      const response = await withSession((s) =>
        fetchAdminBetaRequests(s, {
          platform: filter === "all" ? undefined : filter,
          search: deferredSearch || undefined,
          page: nextPage,
          limit: ADMIN_BETA_PAGE_SIZE,
        }),
      );
      setRequests((current) => [...current, ...response.requests]);
      setPage(nextPage);
      setTotal(response.total);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos traer mas registros de la lista de espera.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const selected = useMemo(
    () => requests.find((item) => item.id === selectedId) || requests[0] || null,
    [requests, selectedId],
  );
  const iphoneCount = useMemo(
    () => requests.filter((item) => item.platform === "IPHONE").length,
    [requests],
  );
  const androidCount = useMemo(
    () => requests.filter((item) => item.platform === "ANDROID").length,
    [requests],
  );
  const citiesCount = useMemo(
    () => new Set(requests.map((item) => item.city?.trim().toLowerCase()).filter(Boolean)).size,
    [requests],
  );
  const hasMore = requests.length < total;

  return (
    <>
      <PageHeader kicker="/ Admin · Growth" title="Solicitudes de acceso" titleAccent="cliente" tabs={tabs} />

      <div className="main-content">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <StatCard label="Registros cargados" value={total} sub="solicitudes guardadas" />
          <StatCard label="iPhone" value={iphoneCount} sub="interesados visibles" />
          <StatCard label="Android" value={androidCount} sub="interesados visibles" />
          <StatCard label="Ciudades" value={citiesCount} sub="cobertura declarada" />
        </div>

        {error ? <Alert tone="danger" message={error} /> : null}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por email, ciudad u origen..."
          countLabel={`${requests.length} de ${total} leads visibles`}
        />

        <FilterChips
          value={filter}
          onChange={(next) => setFilter(next as BetaFilter)}
          options={[
            { id: "all", label: "Todas" },
            { id: "IPHONE", label: "iPhone" },
            { id: "ANDROID", label: "Android" },
          ]}
        />

        {loading ? (
          <LoadingBlock title="Cargando solicitudes" text="Leyendo interesados y plataformas." />
        ) : (
          <div className="detail-layout">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Ciudad</th>
                    <th>Plataforma</th>
                    <th>Origen</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className={selected?.id === request.id ? "is-selected" : ""}
                      onClick={() => setSelectedId(request.id)}
                    >
                      <td>
                        <div className="cell-primary">{request.email}</div>
                        <span className="cell-sub">Solicitud #{request.id}</span>
                      </td>
                      <td>{request.city || "Sin ciudad"}</td>
                      <td>
                        <MiniBadge
                          tone={request.platform === "IPHONE" ? "warning" : "success"}
                          label={getPlatformLabel(request.platform)}
                        />
                      </td>
                      <td>{request.source}</td>
                      <td>{formatDate(request.createdAt)}</td>
                    </tr>
                  ))}
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="data-empty">Todavia no hay personas anotadas para este filtro.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {hasMore ? (
                <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
                  <button className="btn btn-ghost" type="button" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? "Cargando..." : "Ver mas registros"}
                  </button>
                </div>
              ) : null}
            </div>

            {selected ? (
              <aside className="detail-card">
                <div className="page-kicker">Acceso cliente</div>
                <h2 className="detail-title">{selected.email}</h2>
                <p className="detail-desc">
                  Registro guardado desde <strong>{selected.source}</strong> para{" "}
                  <strong>{getPlatformLabel(selected.platform)}</strong>.
                </p>

                <div className="stacked-badges" style={{ marginBottom: 14 }}>
                  <MiniBadge
                    tone={selected.platform === "IPHONE" ? "warning" : "success"}
                    label={getPlatformLabel(selected.platform)}
                  />
                  <MiniBadge
                    tone={selected.city ? "success" : "neutral"}
                    label={selected.city ? "Ciudad declarada" : "Sin ciudad"}
                  />
                </div>

                <div className="detail-list">
                  <DetailRow label="Email" value={selected.email} />
                  <DetailRow label="Ciudad" value={selected.city || "Sin ciudad"} />
                  <DetailRow label="Plataforma" value={getPlatformLabel(selected.platform)} />
                  <DetailRow label="Origen" value={selected.source} />
                  <DetailRow label="Se anotó" value={formatDate(selected.createdAt)} />
                  <DetailRow label="Última actualización" value={formatDate(selected.updatedAt)} />
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
