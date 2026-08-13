import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../../auth";
import { BrandLockup } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import {
  IconDashboard,
  IconLogout,
  IconMapPin,
  IconReceipt,
  IconShield,
  IconStore,
  IconTag,
} from "../../components/Icons";
import { useRealtimeVersion } from "../../lib/realtime";
import {
  AdminAuditPage,
  AdminCategoriesPage,
  AdminCommercesPage,
  AdminDashboardPage,
  AdminPromotionsPage,
  AdminBetaRequestsPage,
  type AdminTab,
} from "./AdminSections";

export default function AdminPanel() {
  const { session, logout, loggingOut, withSession } = useAuth();
  const realtimeVersion = useRealtimeVersion({
    session,
    withSession,
    enabled: session?.user.role === "ADMIN",
  });

  const navLinks: Array<AdminTab & { icon: ReactNode }> = [
    { to: "/admin", label: "Dashboard", icon: <IconDashboard size={16} />, end: true },
    { to: "/admin/commerces", label: "Comercios", icon: <IconStore size={16} /> },
    { to: "/admin/categories", label: "Categorías", icon: <IconMapPin size={16} /> },
    { to: "/admin/promotions", label: "Promociones", icon: <IconTag size={16} /> },
    { to: "/admin/beta", label: "Lista beta", icon: <IconReceipt size={16} /> },
    { to: "/admin/audit", label: "Auditoría", icon: <IconShield size={16} /> },
  ];
  const headerTabs: AdminTab[] = navLinks.map(({ to, label, end }) => ({ to, label, end }));

  const userInitial = session?.user.fullName?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-head">
          <BrandLockup size="sm" />
          <div className="sidebar-role sidebar-role-admin">
            <span className="sidebar-role-dot" />
            <span>Administracion</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">General</div>
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
              <div className="sidebar-user-name">{session?.user.fullName || "Admin"}</div>
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
            element={<AdminDashboardPage tabs={headerTabs} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="commerces"
            element={<AdminCommercesPage tabs={headerTabs} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="categories"
            element={<AdminCategoriesPage tabs={headerTabs} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="promotions"
            element={<AdminPromotionsPage tabs={headerTabs} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="beta"
            element={<AdminBetaRequestsPage tabs={headerTabs} realtimeVersion={realtimeVersion} />}
          />
          <Route
            path="audit"
            element={<AdminAuditPage tabs={headerTabs} realtimeVersion={realtimeVersion} />}
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}
