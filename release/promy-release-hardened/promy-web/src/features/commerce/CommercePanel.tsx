import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../../auth";
import { BrandLockup } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { IconDashboard, IconLogout, IconReceipt, IconStore, IconTag } from "../../components/Icons";
import { fetchMyCommerce } from "../../lib/api";
import { useLiveRefresh } from "../../lib/live";
import { useRealtimeVersion } from "../../lib/realtime";
import type { CommerceManagedProfile } from "../../types/api";
import {
  CommerceDashboardPage,
  CommerceProfilePage,
  CommercePromotionEditorPage,
  CommercePromotionsPage,
  CommerceRedemptionsPage,
  type CommerceTab,
} from "./CommerceSections";

export default function CommercePanel() {
  const { session, logout, loggingOut, withSession } = useAuth();
  const [commerce, setCommerce] = useState<CommerceManagedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const realtimeVersion = useRealtimeVersion({
    session,
    withSession,
    enabled: session?.user.role === "COMMERCE",
  });

  const navLinks: Array<CommerceTab & { icon: ReactNode }> = [
    { to: "/commerce", label: "Dashboard", icon: <IconDashboard size={16} />, end: true },
    { to: "/commerce/profile", label: "Mi comercio", icon: <IconStore size={16} /> },
    { to: "/commerce/promotions", label: "Promociones", icon: <IconTag size={16} /> },
    { to: "/commerce/redemptions", label: "Canjes", icon: <IconReceipt size={16} /> },
  ];

  const loadCommerce = useCallback(async () => {
    const response = await withSession((s) => fetchMyCommerce(s));
    setCommerce(response.commerce);
    setError(null);
  }, [withSession]);

  useEffect(() => {
    void loadCommerce().catch((e) =>
      setError(e instanceof Error ? e.message : "No pudimos cargar el comercio."),
    );
  }, [loadCommerce]);

  useLiveRefresh(
    () =>
      loadCommerce().catch((e) =>
        setError(e instanceof Error ? e.message : "No pudimos refrescar el comercio."),
      ),
    { intervalMs: 45000 },
  );

  const userInitial = session?.user.fullName?.[0]?.toUpperCase() ?? "C";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-head">
          <BrandLockup size="sm" />
          <div className="sidebar-role">
            <span className="sidebar-role-dot" />
            <span>Comercio</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Gestion</div>
          <nav className="sidebar-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  isActive ? "sidebar-link is-active" : "sidebar-link"
                }
              >
                <span className="sidebar-link-icon">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-foot">
          <ThemeToggle />
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{session?.user.fullName || "Comercio"}</div>
              <div className="sidebar-user-email">{session?.user.email}</div>
            </div>
          </div>
          <button
            className="sidebar-logout"
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
          >
            <IconLogout size={14} />
            <span>{loggingOut ? "Cerrando..." : "Cerrar sesión"}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <Routes>
          <Route
            index
            element={
              <CommerceDashboardPage
                commerce={commerce}
                error={error}
                realtimeVersion={realtimeVersion}
              />
            }
          />
          <Route path="profile" element={<CommerceProfilePage realtimeVersion={realtimeVersion} />} />
          <Route
            path="promotions"
            element={<CommercePromotionsPage commerce={commerce} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="promotions/new"
            element={<CommercePromotionEditorPage commerce={commerce} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="promotions/:promotionId"
            element={<CommercePromotionEditorPage commerce={commerce} realtimeVersion={realtimeVersion} />}
          />
          <Route path="redemptions" element={<CommerceRedemptionsPage realtimeVersion={realtimeVersion} />} />
          <Route path="*" element={<Navigate to="/commerce" replace />} />
        </Routes>
      </div>
    </div>
  );
}
