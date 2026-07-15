import { useEffect, useState, useCallback } from "react";
import { http, currency, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building, Sparkles, ExternalLink, Save, CheckCircle2, Copy } from "lucide-react";
import { Link } from "react-router-dom";

export default function Agencia() {
  const [agency, setAgency] = useState(null);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([http.get("/agencies/current"), http.get("/plans")]);
    setAgency(a.data); setPlans(p.data.plans || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true);
    try {
      await http.put("/agencies/current", {
        trade_name: agency.trade_name,
        contact_email: agency.contact_email,
        contact_name: agency.contact_name,
        phone: agency.phone,
        subdomain: agency.subdomain,
        color_primary: agency.color_primary,
        color_secondary: agency.color_secondary,
        logo_text: agency.logo_text,
      });
      toast.success("Configurações salvas");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  if (!agency) return <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando…</div>;

  const currentPlan = plans.find(p => p.lookup_key === agency.plan);

  return (
    <div className="space-y-6" data-testid="agencia-page">
      <header>
        <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>MINHA AGÊNCIA</div>
        <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Identidade & Assinatura</h1>
        <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
          Personalize a marca da sua agência e gerencie o plano do VIBRAE OS.
        </p>
      </header>

      {/* Assinatura */}
      <div className="card-elev p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>PLANO ATUAL</div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#231F20" }}>{currentPlan?.name || "VIBRAE Studio"}</div>
            <div className="text-sm mt-1" style={{ color: "#6F6F6C" }}>{currentPlan?.description}</div>
          </div>
          <div className="text-right">
            {currentPlan && (
              <div className="text-2xl font-bold" style={{ color: "#A18133" }}>
                {currency(currentPlan.amount)}<span className="text-sm" style={{ color: "#6F6F6C" }}>/mês</span>
              </div>
            )}
            <div className="text-[10px] mt-1 tracking-wider px-2 py-1 rounded-full inline-block font-semibold"
              style={{ background: agency.subscription_status === "active" ? "#E7F5EB" : "#F5EBD0",
                       color: agency.subscription_status === "active" ? "#1F6B3E" : "#806525" }}>
              {(agency.subscription_status || "pending").toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Identidade da agência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-elev p-5 space-y-4">
          <div>
            <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>DADOS</div>
            <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Informações da agência</h3>
          </div>
          <Field label="Nome fantasia">
            <Input value={agency.trade_name || ""} onChange={e => setAgency({...agency, trade_name: e.target.value})}/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsável">
              <Input value={agency.contact_name || ""} onChange={e => setAgency({...agency, contact_name: e.target.value})}/>
            </Field>
            <Field label="Telefone">
              <Input value={agency.phone || ""} onChange={e => setAgency({...agency, phone: e.target.value})}/>
            </Field>
          </div>
          <Field label="E-mail de contato">
            <Input type="email" value={agency.contact_email || ""} onChange={e => setAgency({...agency, contact_email: e.target.value})}/>
          </Field>
          <Field label="Subdomínio">
            <div className="flex items-center gap-2">
              <Input value={agency.subdomain || ""} onChange={e => setAgency({...agency, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")})}/>
              <span className="text-sm" style={{ color: "#6F6F6C" }}>.vibrae.os</span>
            </div>
          </Field>
        </div>

        <div className="card-elev p-5 space-y-4">
          <div>
            <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>WHITE-LABEL</div>
            <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Marca visual</h3>
          </div>
          <Field label="Texto do logo">
            <Input value={agency.logo_text || ""} onChange={e => setAgency({...agency, logo_text: e.target.value.toUpperCase().slice(0, 12)})}
              maxLength={12}/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cor primária">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded border" style={{ background: agency.color_primary, borderColor: "#D8D7D3" }}/>
                <Input value={agency.color_primary || ""} onChange={e => setAgency({...agency, color_primary: e.target.value})}/>
              </div>
            </Field>
            <Field label="Cor secundária">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded border" style={{ background: agency.color_secondary || "#231F20", borderColor: "#D8D7D3" }}/>
                <Input value={agency.color_secondary || ""} onChange={e => setAgency({...agency, color_secondary: e.target.value})}/>
              </div>
            </Field>
          </div>

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#6F6F6C" }}>Preview do sidebar</div>
            <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: agency.color_secondary || "#231F20" }}>
              <div className="w-8 h-8 rounded font-bold flex items-center justify-center text-sm"
                style={{ background: agency.color_primary, color: "#fff" }}>
                {agency.logo_text?.[0] || "V"}
              </div>
              <div>
                <div className="text-[9px] tracking-[0.3em]" style={{ color: "#959693" }}>AGÊNCIA</div>
                <div className="text-sm font-bold tracking-[0.14em]" style={{ color: "#F7F5F2" }}>{agency.logo_text || "VIBRAE"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy} data-testid="agency-save-btn"
          style={{ background: "#A18133", color: "#fff" }}>
          <Save size={14} className="mr-1"/> {busy ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>

      {/* Planos disponíveis para nova agência */}
      <div className="card-elev p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>MULTI-AGÊNCIA</div>
            <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Convide outras agências ao VIBRAE OS</h3>
            <p className="text-sm mt-1" style={{ color: "#6F6F6C" }}>Compartilhe o link de cadastro. Cada nova agência tem seu próprio espaço, cobrança e white-label.</p>
          </div>
          <Link to="/cadastro-agencia" target="_blank"
            className="text-xs px-3 py-2 rounded-md inline-flex items-center gap-1"
            style={{ background: "#231F20", color: "#fff" }}>
            <ExternalLink size={12}/> Ver landing
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {plans.map(p => (
            <div key={p.lookup_key} className="p-4 rounded-lg border" style={{ borderColor: p.lookup_key === agency.plan ? "#A18133" : "#E2E0DC" }}>
              <div className="text-xs tracking-wider" style={{ color: "#A18133" }}>{p.name.toUpperCase()}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: "#231F20" }}>{currency(p.amount)}<span className="text-sm font-normal" style={{ color: "#6F6F6C" }}>/mês</span></div>
              <div className="text-xs mt-2" style={{ color: "#6F6F6C" }}>{p.description}</div>
              {p.lookup_key === agency.plan && (
                <div className="text-[10px] mt-3 flex items-center gap-1" style={{ color: "#1F6B3E" }}>
                  <CheckCircle2 size={11}/> Seu plano atual
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
