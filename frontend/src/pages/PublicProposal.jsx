import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { http, currency, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, ShieldCheck, Award, Users, MessageCircle, ArrowRight } from "lucide-react";
import VibraeLogo from "@/components/VibraeLogo";

export default function PublicProposal() {
  const { token } = useParams();
  const [p, setP] = useState(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await http.get(`/public/proposals/${token}`);
      setP(data);
    } catch (e) {
      setP({ error: true });
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (!p) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F5F2" }}>
    <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando proposta…</div>
  </div>;

  if (p.error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F5F2" }}>
      <div className="text-center p-8 card-elev">
        <div className="text-lg font-semibold" style={{ color: "#9A2A1E" }}>Proposta não encontrada</div>
        <div className="text-sm mt-2" style={{ color: "#6F6F6C" }}>O link pode ter expirado ou está incorreto.</div>
      </div>
    </div>
  );

  const isAccepted = p.status === "aceita" || accepted;
  const isDeclined = p.status === "recusada";

  return (
    <div className="min-h-screen" style={{ background: "#F7F5F2" }}>
      {/* Cabeçalho institucional */}
      <div className="py-10 px-6" style={{ background: "#231F20" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <VibraeLogo variant="dark" size={36}/>
          <div className="text-[10px] tracking-[0.3em] hidden md:block" style={{ color: "#959693" }}>PROPOSTA COMERCIAL</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Apresentação */}
        <div>
          <div className="text-xs tracking-[0.32em]" style={{ color: "#A18133" }}>PARA</div>
          <div className="font-serif-display text-2xl mt-1" style={{ color: "#231F20" }}>{p.client_name}</div>
          <h1 className="font-serif-display text-4xl md:text-5xl mt-4 leading-tight" style={{ color: "#231F20" }}>
            {p.title}
          </h1>
          <div className="mt-3 gold-underline w-10"/>
        </div>

        {isAccepted && (
          <div className="p-4 rounded-lg flex items-start gap-2" style={{ background: "#E7F5EB" }}>
            <CheckCircle2 size={20} style={{ color: "#1F6B3E" }} className="mt-0.5"/>
            <div>
              <div className="font-semibold" style={{ color: "#1F6B3E" }}>Proposta aceita</div>
              <div className="text-sm mt-1" style={{ color: "#1F6B3E" }}>
                Estamos prontos para começar. Em breve entraremos em contato para os próximos passos.
              </div>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="p-4 rounded-lg" style={{ background: "#FBE9E7" }}>
            <div className="font-semibold" style={{ color: "#9A2A1E" }}>Proposta declinada</div>
          </div>
        )}

        {p.summary && (
          <Section title="Sobre esta proposta">
            <p className="text-base leading-relaxed" style={{ color: "#231F20" }}>{p.summary}</p>
          </Section>
        )}

        {/* Pilares VIBRAE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Pillar icon={Award} title="Autoridade" text="Estratégia editorial ancorada em compliance para saúde e estética."/>
          <Pillar icon={ShieldCheck} title="Compliance" text="Todo conteúdo checado contra normas do CFM, CRO, CRN, CFP e demais conselhos."/>
          <Pillar icon={Users} title="Time dedicado" text="Estrategista, social media, designer e videomaker atuando na sua conta."/>
        </div>

        {/* Serviços */}
        <Section title="Escopo & Entregas">
          <div className="space-y-3">
            {(p.services || []).map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-lg border" style={{ borderColor: "#E2E0DC", background: "#fff" }}>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "#231F20" }}>{s.name}</div>
                  {s.description && <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{s.description}</div>}
                  {s.quantity > 1 && <div className="text-[11px] mt-1" style={{ color: "#959693" }}>Quantidade: {s.quantity}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold" style={{ color: "#231F20" }}>{currency(s.price * s.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Total */}
        <div className="p-6 rounded-xl text-center" style={{ background: "#231F20" }}>
          <div className="text-[10px] tracking-[0.3em]" style={{ color: "#A18133" }}>INVESTIMENTO MENSAL</div>
          <div className="font-serif-display text-5xl mt-2" style={{ color: "#F7F5F2" }}>{currency(p.total)}</div>
          <div className="text-[11px] mt-3" style={{ color: "#959693" }}>
            Proposta válida até {new Date(p.expires_at).toLocaleDateString("pt-BR")}
          </div>
        </div>

        {p.conditions && (
          <Section title="Condições">
            <p className="text-sm" style={{ color: "#6F6F6C" }}>{p.conditions}</p>
          </Section>
        )}

        {/* Ações */}
        {!isAccepted && !isDeclined && (
          <div className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={() => setAcceptOpen(true)} data-testid="proposal-accept-btn"
                className="h-14 text-base" style={{ background: "#A18133", color: "#fff" }}>
                <CheckCircle2 size={18} className="mr-2"/> Aceitar proposta
              </Button>
              <Button onClick={() => setDeclineOpen(true)} variant="outline" data-testid="proposal-decline-btn"
                className="h-14 text-base border-[#231F20]" style={{ color: "#231F20" }}>
                Não estou pronto agora
              </Button>
            </div>
            <div className="text-[10px] text-center mt-3" style={{ color: "#959693" }}>
              Ao aceitar, você concorda com o escopo, valor e condições descritos acima.
            </div>
          </div>
        )}

        <div className="text-center pt-8" style={{ color: "#959693" }}>
          <div className="text-[10px] tracking-[0.32em]">AGÊNCIA VIBRAE</div>
          <div className="text-[10px] mt-1">Gestão de Marketing para saúde, estética e bem-estar</div>
        </div>
      </div>

      <AcceptDialog open={acceptOpen} setOpen={setAcceptOpen} token={token}
        onAccepted={() => { setAccepted(true); toast.success("Proposta aceita com sucesso"); }}/>
      <DeclineDialog open={declineOpen} setOpen={setDeclineOpen} token={token}
        onDeclined={() => { load(); }}/>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs tracking-[0.28em] mb-3" style={{ color: "#A18133" }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Pillar({ icon: Icon, title, text }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: "#fff", border: "1px solid #E2E0DC" }}>
      <Icon size={20} style={{ color: "#A18133" }}/>
      <div className="text-sm font-semibold mt-2" style={{ color: "#231F20" }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{text}</div>
    </div>
  );
}

function AcceptDialog({ open, setOpen, token, onAccepted }) {
  const [form, setForm] = useState({ signer_name: "", signer_document: "", signer_email: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await http.post(`/public/proposals/${token}/accept`, form);
      setOpen(false);
      onAccepted();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Aceite digital da proposta</DialogTitle></DialogHeader>
        <p className="text-sm" style={{ color: "#6F6F6C" }}>Ao assinar digitalmente, você aceita o escopo, valor e condições apresentados.</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome completo do responsável*">
            <Input required value={form.signer_name} onChange={e => setForm({...form, signer_name: e.target.value})}
              data-testid="signer-name-input"/>
          </Field>
          <Field label="CPF ou CNPJ">
            <Input value={form.signer_document} onChange={e => setForm({...form, signer_document: e.target.value})}/>
          </Field>
          <Field label="E-mail">
            <Input type="email" value={form.signer_email} onChange={e => setForm({...form, signer_email: e.target.value})}/>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy || !form.signer_name} data-testid="proposal-confirm-accept"
              style={{ background: "#A18133", color: "#fff" }}>
              {busy ? "Assinando…" : "Assinar e aceitar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeclineDialog({ open, setOpen, token, onDeclined }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await http.post(`/public/proposals/${token}/decline`, { reason });
      setOpen(false); onDeclined();
      toast.info("Sua resposta foi registrada.");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Não é agora?</DialogTitle></DialogHeader>
        <p className="text-sm" style={{ color: "#6F6F6C" }}>Sem problemas. Se quiser, deixe uma observação para que possamos entender o contexto.</p>
        <Textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Ex: Precisamos revisitar o orçamento no próximo trimestre."/>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Voltar</Button>
          <Button onClick={submit} disabled={busy} style={{ background: "#231F20", color: "#fff" }}>
            {busy ? "Enviando…" : "Enviar resposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
