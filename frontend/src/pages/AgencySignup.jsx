import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { http, currency, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Sparkles, ShieldCheck, Zap } from "lucide-react";
import VibraeLogo from "@/components/VibraeLogo";

export default function AgencySignup() {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState("vibrae_pro_monthly");
  const [form, setForm] = useState({
    trade_name: "", contact_name: "", contact_email: "", phone: "", password: ""
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => { http.get("/plans").then(r => setPlans(r.data.plans || [])); }, []);

  async function signup(e) {
    e.preventDefault();
    if (!form.password || form.password.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    setBusy(true);
    try {
      const { data } = await http.post("/agencies/signup", {
        ...form, plan_lookup_key: selected, origin_url: window.location.origin
      });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setBusy(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F5F2" }}>
      {/* Hero */}
      <div className="py-16 px-6" style={{ background: "#231F20" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center"><VibraeLogo variant="dark" size={42}/></div>
          <div className="text-xs tracking-[0.32em] mt-8" style={{ color: "#A18133" }}>SISTEMA OPERACIONAL</div>
          <h1 className="font-serif-display text-5xl md:text-6xl mt-4 leading-tight" style={{ color: "#F7F5F2" }}>
            Sua agência com a <em style={{ color: "#A18133" }}>operação inteira</em> em um só lugar.
          </h1>
          <p className="text-base mt-6 max-w-2xl mx-auto" style={{ color: "#c9c6c3" }}>
            CRM, produção de conteúdo, IA de marketing, compliance para saúde, calendário editorial,
            aprovações do cliente, Gantt operacional, financeiro e relatórios. Tudo integrado.
          </p>
        </div>
      </div>

      {/* Bullets */}
      <div className="max-w-5xl mx-auto px-6 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {icon: Sparkles, title: "IA VIBRAE", text: "Claude Sonnet 4.5 gera legendas, roteiros de Reels e ideias respeitando o Brand Kit."},
            {icon: ShieldCheck, title: "Compliance saúde", text: "Checagem automática de CFM, CRO, CRN e demais conselhos antes de enviar ao cliente."},
            {icon: Zap, title: "White-label completo", text: "Sua marca, sua cor, seu subdomínio. Portal exclusivo para cada cliente da sua agência."},
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="card-elev p-5">
                <Icon size={24} style={{ color: "#A18133" }}/>
                <div className="text-sm font-semibold mt-2" style={{ color: "#231F20" }}>{f.title}</div>
                <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{f.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Planos */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-xs tracking-[0.32em]" style={{ color: "#A18133" }}>PLANOS</div>
          <h2 className="font-serif-display text-4xl mt-2" style={{ color: "#231F20" }}>Escolha como sua agência quer crescer</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p, i) => {
            const isSelected = selected === p.lookup_key;
            const isMid = i === 1;
            return (
              <button key={p.lookup_key} onClick={() => setSelected(p.lookup_key)}
                data-testid={`plan-${p.lookup_key}`}
                className={`p-6 rounded-2xl text-left transition ${isSelected ? "shadow-xl" : "hover:shadow-md"}`}
                style={{
                  background: isSelected ? "#231F20" : "#fff",
                  color: isSelected ? "#F7F5F2" : "#231F20",
                  border: `1px solid ${isSelected ? "#A18133" : "#E2E0DC"}`,
                  transform: isMid ? "scale(1.03)" : "none",
                }}>
                {isMid && !isSelected && (
                  <div className="text-[9px] font-semibold tracking-widest px-2 py-0.5 rounded-full mb-3 inline-block"
                    style={{ background: "#A18133", color: "#fff" }}>MAIS ESCOLHIDO</div>
                )}
                <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>{p.name.toUpperCase()}</div>
                <div className="text-4xl font-bold mt-3">
                  {currency(p.amount)}
                  <span className="text-sm font-normal" style={{ color: isSelected ? "#959693" : "#6F6F6C" }}>/mês</span>
                </div>
                <div className="text-sm mt-3" style={{ color: isSelected ? "#c9c6c3" : "#6F6F6C" }}>{p.description}</div>
                <div className="mt-5 flex items-center gap-1 text-xs font-semibold" style={{ color: isSelected ? "#A18133" : "#231F20" }}>
                  {isSelected ? <><Check size={14}/> Selecionado</> : "Escolher este plano"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-lg mx-auto px-6 pb-20">
        <div className="card-elev p-6">
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>CADASTRE SUA AGÊNCIA</div>
          <h3 className="font-serif-display text-2xl mt-2" style={{ color: "#231F20" }}>Comece em menos de 2 minutos</h3>
          <form onSubmit={signup} className="mt-5 space-y-3">
            <Field label="Nome da agência*">
              <Input required value={form.trade_name} onChange={e => setForm({...form, trade_name: e.target.value})}
                data-testid="signup-agency-name"/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Seu nome*">
                <Input required value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})}
                  data-testid="signup-contact-name"/>
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
              </Field>
            </div>
            <Field label="E-mail*">
              <Input required type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})}
                data-testid="signup-email"/>
            </Field>
            <Field label="Senha* (mín. 6 caracteres)">
              <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                data-testid="signup-password"/>
            </Field>
            <Button type="submit" disabled={busy} data-testid="signup-submit"
              className="w-full h-12" style={{ background: "#A18133", color: "#fff" }}>
              {busy ? "Redirecionando ao checkout…" : "Cadastrar e ir para o pagamento →"}
            </Button>
            <div className="text-[10px] text-center" style={{ color: "#959693" }}>
              Pagamento processado pela Stripe. Você pode cancelar a qualquer momento.
            </div>
          </form>
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

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("polling");

  useEffect(() => {
    if (!sessionId) { setStatus("no_session"); return; }
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await http.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          clearInterval(iv); setStatus("paid");
          setTimeout(() => navigate("/login"), 3000);
        } else if (attempts > 15) {
          clearInterval(iv); setStatus("timeout");
        }
      } catch {
        if (attempts > 15) { clearInterval(iv); setStatus("timeout"); }
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F5F2" }}>
      <div className="card-elev p-10 max-w-md w-full text-center">
        <VibraeLogo variant="light" size={30}/>
        <div className="mt-8">
          {status === "polling" && (
            <>
              <div className="pulse-dot mx-auto" style={{ width: 16, height: 16 }}/>
              <div className="text-lg font-semibold mt-4" style={{ color: "#231F20" }}>Processando pagamento…</div>
              <div className="text-sm mt-2" style={{ color: "#6F6F6C" }}>Só um instante — estamos ativando sua agência.</div>
            </>
          )}
          {status === "paid" && (
            <>
              <Check size={40} className="mx-auto" style={{ color: "#A18133" }}/>
              <div className="text-lg font-semibold mt-4" style={{ color: "#1F6B3E" }}>Sua agência está ativa!</div>
              <div className="text-sm mt-2" style={{ color: "#6F6F6C" }}>Redirecionando para o login…</div>
            </>
          )}
          {status === "timeout" && (
            <>
              <div className="text-lg font-semibold" style={{ color: "#231F20" }}>Confirmação demorou mais que o esperado</div>
              <div className="text-sm mt-2" style={{ color: "#6F6F6C" }}>Não se preocupe — você receberá o e-mail de ativação. Já pode tentar fazer login.</div>
              <Button className="mt-4" onClick={() => navigate("/login")}
                style={{ background: "#A18133", color: "#fff" }}>Ir para o login</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
