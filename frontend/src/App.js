import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CRM from "@/pages/CRM";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import ClientPortal from "@/pages/ClientPortal";
import AIStudio from "@/pages/AIStudio";
import Financeiro from "@/pages/Financeiro";
import Calendario from "@/pages/Calendario";
import ArtEditor from "@/pages/ArtEditor";
import StoriesStudio from "@/pages/StoriesStudio";
import Relatorios from "@/pages/Relatorios";
import Tarefas from "@/pages/Tarefas";

function RootRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  if (user === false) return <Navigate to="/login" replace />;
  return <Navigate to={user.role?.startsWith("client") ? "/portal" : "/app/dashboard"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route path="/app" element={<AppLayout requiredArea="agency" />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="crm" element={<CRM />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="clientes/:id" element={<ClientDetail />} />
            <Route path="conteudos" element={<Clients />} />
            <Route path="ia" element={<AIStudio />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="artes" element={<ArtEditor />} />
            <Route path="stories" element={<StoriesStudio />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="tarefas" element={<Tarefas />} />
          </Route>

          <Route path="/portal" element={<AppLayout requiredArea="client" />}>
            <Route index element={<ClientPortal />} />
            <Route path="aprovacoes" element={<ClientPortal />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
