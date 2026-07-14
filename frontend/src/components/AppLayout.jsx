import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout({ requiredArea = "agency" }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F5F2" }}>
        <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando…</div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  const isClient = user.role?.startsWith("client");
  if (requiredArea === "agency" && isClient) return <Navigate to="/portal" replace />;
  if (requiredArea === "client" && !isClient) return <Navigate to="/app/dashboard" replace />;

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F5F2" }}>
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
