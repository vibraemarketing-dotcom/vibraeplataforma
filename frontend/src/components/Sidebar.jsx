import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Target, Users, LayoutGrid, LogOut, Home, ChevronsLeft, ChevronsRight, Sparkles, Wallet, CalendarDays, Palette, Zap, BarChart3, ListChecks } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import VibraeLogo from "@/components/VibraeLogo";
import { TID } from "@/constants/testIds";

const AGENCY_NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: TID.navDashboard },
  { to: "/app/crm", label: "CRM Comercial", icon: Target, testId: TID.navCrm },
  { to: "/app/clientes", label: "Clientes", icon: Users, testId: TID.navClients },
  { to: "/app/conteudos", label: "Content Studio", icon: LayoutGrid, testId: TID.navContent },
  { to: "/app/stories", label: "Stories", icon: Zap, testId: "nav-stories" },
  { to: "/app/calendario", label: "Calendário", icon: CalendarDays, testId: "nav-calendario" },
  { to: "/app/tarefas", label: "Tarefas · Gantt", icon: ListChecks, testId: "nav-tarefas" },
  { to: "/app/ia", label: "IA VIBRAE", icon: Sparkles, testId: "nav-ia" },
  { to: "/app/artes", label: "Gerador de Artes", icon: Palette, testId: "nav-artes" },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, testId: "nav-relatorios" },
  { to: "/app/financeiro", label: "Financeiro", icon: Wallet, testId: "nav-financeiro" },
];

const CLIENT_NAV = [
  { to: "/portal", label: "Início", icon: Home, testId: TID.navPortal },
  { to: "/portal/aprovacoes", label: "Aprovações", icon: LayoutGrid, testId: "nav-portal-approvals" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const isClient = user?.role?.startsWith("client");
  const items = isClient ? CLIENT_NAV : AGENCY_NAV;

  const width = collapsed ? "w-[76px]" : "w-[260px]";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside
      data-testid={TID.sidebar}
      className={`${width} shrink-0 h-screen sticky top-0 flex flex-col transition-all duration-200`}
      style={{ background: "#231F20", color: "#F7F5F2" }}
    >
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        {!collapsed ? <VibraeLogo variant="dark" size={30} /> : (
          <div className="mx-auto">
            <VibraeLogo variant="dark" size={26} />
          </div>
        )}
      </div>

      <div className="h-px mx-4" style={{ background: "rgba(255,255,255,0.06)" }} />

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end
              data-testid={it.testId}
              className={({ isActive }) => `side-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} className="side-icon" />
              {!collapsed && <span>{it.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="text-xs" style={{ color: "#959693" }}>{roleLabel(user.role)}</div>
            <div className="text-sm font-medium truncate" style={{ color: "#F7F5F2" }}>{user.name}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          data-testid={TID.logout}
          className="side-item w-full"
        >
          <LogOut size={18} className="side-icon" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="side-item w-full"
        >
          {collapsed ? <ChevronsRight size={18} className="side-icon" /> : <ChevronsLeft size={18} className="side-icon" />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}

function roleLabel(r) {
  const map = {
    superadmin: "Superadmin", diretoria: "Diretoria", comercial: "Comercial",
    estrategista: "Estrategista", social_media: "Social Media", designer: "Designer",
    financeiro: "Financeiro", client_admin: "Cliente • Administrador",
    client_approver: "Cliente • Aprovador", client_viewer: "Cliente • Visualizador"
  };
  return map[r] || r;
}
