import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import VibraeLogo from "@/components/VibraeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TID } from "@/constants/testIds";
import { toast } from "sonner";
import { Copy } from "lucide-react";

const DEMO = [
  { role: "Superadmin", email: "admin@vibrae.com" },
  { role: "Comercial", email: "comercial@vibrae.com" },
  { role: "Social Media", email: "social@vibrae.com" },
  { role: "Cliente • Aurora", email: "cliente@aurora.com" },
  { role: "Cliente • Dr. Rafael", email: "cliente@drrafael.com" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("admin@vibrae.com");
  const [password, setPassword] = useState("vibrae2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e?.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await login(email, password);
      const target = u.role?.startsWith("client") ? "/portal" : (loc.state?.from || "/app/dashboard");
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  function applyDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword("vibrae2026");
    toast.success("Credencial preenchida");
  }

  return (
    <div className="min-h-screen login-bg grid lg:grid-cols-[1.1fr_1fr]">
      {/* Painel esquerdo institucional */}
      <div className="hidden lg:flex flex-col justify-between p-12" style={{ background: "#231F20" }}>
        <VibraeLogo variant="dark" size={36} />
        <div className="max-w-lg">
          <div className="text-xs tracking-[0.32em] mb-4" style={{ color: "#A18133" }}>SISTEMA OPERACIONAL</div>
          <h1 className="font-serif-display text-white text-5xl leading-tight mb-6">
            A operação da <em style={{ color: "#A18133" }}>sua agência</em>, em um só lugar.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#c9c6c3" }}>
            Do primeiro contato à publicação. VIBRAE OS centraliza CRM, produção de conteúdo,
            aprovações do cliente e histórico de versões — com o rigor que a saúde e a estética exigem.
          </p>
        </div>
        <div className="text-xs" style={{ color: "#6F6F6C" }}>© VIBRAE — Gestão de Marketing</div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md fade-in">
          <div className="lg:hidden mb-8"><VibraeLogo variant="light" size={30} /></div>
          <div className="mb-8">
            <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>BEM-VINDO(A)</div>
            <h2 className="text-3xl font-bold mt-2" style={{ color: "#231F20" }}>Acesse o VIBRAE OS</h2>
            <div className="gold-underline w-8 mt-4"/>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider" style={{ color: "#6F6F6C" }}>E-mail</Label>
              <Input id="email" type="email" data-testid={TID.loginEmail}
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="mt-2 h-11 bg-white border-[#D8D7D3]"/>
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Senha</Label>
              <Input id="password" type="password" data-testid={TID.loginPassword}
                value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                className="mt-2 h-11 bg-white border-[#D8D7D3]"/>
            </div>
            {error && <div className="text-sm p-3 rounded-lg" style={{ background: "#FBE9E7", color: "#9A2A1E" }}>{error}</div>}
            <Button
              type="submit" disabled={busy} data-testid={TID.loginSubmit}
              className="w-full h-11 font-semibold tracking-wide"
              style={{ background: "#A18133", color: "#fff" }}
            >
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-10">
            <div className="text-[11px] tracking-[0.28em] font-medium mb-3" style={{ color: "#6F6F6C" }}>ACESSO DE DEMONSTRAÇÃO</div>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => applyDemo(d.email)} data-testid={`${TID.loginDemo}-${d.email}`}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition text-left"
                  style={{ background: "#fff", borderColor: "#E2E0DC" }}>
                  <div>
                    <div className="text-xs font-medium" style={{ color: "#231F20" }}>{d.role}</div>
                    <div className="text-xs" style={{ color: "#6F6F6C" }}>{d.email}</div>
                  </div>
                  <Copy size={14} style={{ color: "#A18133" }} />
                </button>
              ))}
            </div>
            <div className="text-[11px] mt-3" style={{ color: "#959693" }}>Senha padrão: <b>vibrae2026</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
