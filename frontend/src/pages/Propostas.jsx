import { useEffect, useState, useCallback } from "react";
import { http, currency, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Copy, Send, FileText, CheckCircle2, XCircle, Trash2, Link as LinkIcon } from "lucide-react";

const STATUS = {
  rascunho: { label: "Rascunho", bg: "#EFECE7", color: "#6F6F6C" },
  enviada: { label: "Enviada", bg: "#F5EBD0", color: "#806525" },
  visualizada: { label: "Visualizada", bg: "#FBF7EE", color: "#A18133" },
  aceita: { label: "Aceita", bg: "#E7F5EB", color: "#1F6B3E" },
  recusada: { label: "Recusada", bg: "#FBE9E7", color: "#9A2A1E" },
  expirada: { label: "Expirada", bg: "#EFECE7", color: "#959693" },
};

export default function Propostas() {
  const [proposals, setProposals] = useState([]);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get("/proposals");
    setProposals(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function sendProposal(p) {
    try {
      const { data } = await http.post(`/proposals/${p.id}/send`);
      const url = window.location.origin + data.link_relative;
      navigator.clipboard.writeText(url);
      toast.success("Link copiado — envie ao cliente por WhatsApp ou e-mail");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  function copyLink(p) {
    const url = window.location.origin + "/aceite/" + p.token;
    navigator.clipboard.writeText(url);
    toast.success("Link de aceite copiado");
  }

  return (
    <div className="space-y-6" data-testid="propostas-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>PROPOSTAS COMERCIAIS</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Do envio ao contrato ativo</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            Monte a proposta · envie o link · quando o cliente aceita, o contrato + cliente + onboarding são criados automaticamente.
          </p>
        </div>
        <NewProposalDialog open={newOpen} setOpen={setNewOpen} onCreated={load}/>
      </header>

      {proposals.length === 0 && (
        <div className="card-elev p-12 text-center">
          <FileText size={40} className="mx-auto" style={{ color: "#A18133" }}/>
          <div className="text-sm mt-3" style={{ color: "#6F6F6C" }}>Nenhuma proposta ainda. Clique em <b>Nova proposta</b>.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {proposals.map(p => {
          const st = STATUS[p.status] || STATUS.rascunho;
          return (
            <div key={p.id} className="card-elev p-5" data-testid={`proposal-${p.id}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>PARA {p.client_name?.toUpperCase()}</div>
                  <div className="text-lg font-semibold mt-1" style={{ color: "#231F20" }}>{p.title}</div>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider shrink-0"
                  style={{ background: st.bg, color: st.color }}>{st.label.toUpperCase()}</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] tracking-wider" style={{ color: "#959693" }}>INVESTIMENTO</div>
                  <div className="text-lg font-bold" style={{ color: "#A18133" }}>{currency(p.total)}</div>
                </div>
                <div className="text-[11px] text-right" style={{ color: "#959693" }}>
                  <div>{(p.services || []).length} serviços</div>
                  <div>{p.view_count || 0} visualizações</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: "#EFECE7" }}>
                {p.status === "rascunho" && (
                  <Button size="sm" onClick={() => sendProposal(p)} data-testid={`send-proposal-${p.id}`}
                    style={{ background: "#A18133", color: "#fff" }}>
                    <Send size={12} className="mr-1"/> Enviar
                  </Button>
                )}
                {["enviada", "visualizada"].includes(p.status) && (
                  <Button size="sm" variant="outline" onClick={() => copyLink(p)}>
                    <Copy size={12} className="mr-1"/> Copiar link
                  </Button>
                )}
                <a href={`/aceite/${p.token}`} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-md border inline-flex items-center gap-1"
                  style={{ borderColor: "#231F20", color: "#231F20" }}>
                  <LinkIcon size={12}/> Ver proposta
                </a>
                {p.status === "aceita" && (
                  <div className="text-[11px] flex items-center gap-1 ml-auto" style={{ color: "#1F6B3E" }}>
                    <CheckCircle2 size={12}/> {p.signer_name} · {p.accepted_at && new Date(p.accepted_at).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewProposalDialog({ open, setOpen, onCreated }) {
  const [form, setForm] = useState({
    title: "", client_name: "", client_email: "",
    summary: "", conditions: "Investimento mensal via PIX ou boleto. Reajuste anual pelo IPCA.",
    validity_days: 15,
  });
  const [services, setServices] = useState([
    { name: "Gestão de redes sociais", description: "Plano completo mensal", quantity: 1, price: 4800 }
  ]);
  const [busy, setBusy] = useState(false);

  const total = services.reduce((s, x) => s + (parseFloat(x.price) || 0) * (parseInt(x.quantity) || 1), 0);

  function updateService(i, patch) {
    setServices(sv => sv.map((s, idx) => idx === i ? {...s, ...patch} : s));
  }
  function addService() {
    setServices([...services, { name: "", description: "", quantity: 1, price: 0 }]);
  }
  function removeService(i) {
    setServices(sv => sv.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await http.post("/proposals", {
        ...form,
        services: services.filter(s => s.name.trim()),
        total,
      });
      toast.success("Proposta criada");
      setOpen(false); onCreated();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} data-testid="new-proposal-btn" style={{ background: "#A18133", color: "#fff" }}>
        <Plus size={16} className="mr-1"/> Nova proposta
      </Button>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Nova proposta comercial</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Título*">
              <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="Proposta de Gestão de Marketing"/>
            </Field>
            <Field label="Validade (dias)">
              <Input type="number" value={form.validity_days} onChange={e => setForm({...form, validity_days: parseInt(e.target.value) || 15})}/>
            </Field>
            <Field label="Cliente*">
              <Input required value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})}/>
            </Field>
            <Field label="E-mail do cliente">
              <Input type="email" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})}/>
            </Field>
          </div>
          <Field label="Resumo executivo">
            <Textarea rows={2} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})}
              placeholder="A VIBRAE fará a gestão estratégica das redes sociais…"/>
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Serviços</Label>
              <Button type="button" size="sm" variant="outline" onClick={addService}>
                <Plus size={12} className="mr-1"/> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {services.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_120px_32px] gap-2 items-center">
                  <Input placeholder="Nome do serviço" value={s.name} onChange={e => updateService(i, { name: e.target.value })}/>
                  <Input placeholder="Descrição" value={s.description} onChange={e => updateService(i, { description: e.target.value })}/>
                  <Input type="number" placeholder="Qtd" value={s.quantity} onChange={e => updateService(i, { quantity: parseInt(e.target.value) || 1 })}/>
                  <Input type="number" step="0.01" placeholder="Preço (R$)" value={s.price} onChange={e => updateService(i, { price: parseFloat(e.target.value) || 0 })}/>
                  <button type="button" onClick={() => removeService(i)} className="p-1 rounded hover:bg-[#FBE9E7]" title="Remover">
                    <Trash2 size={14} style={{ color: "#9A2A1E" }}/>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <span className="text-xs" style={{ color: "#959693" }}>TOTAL: </span>
              <span className="text-lg font-bold" style={{ color: "#A18133" }}>{currency(total)}</span>
            </div>
          </div>

          <Field label="Condições e termos">
            <Textarea rows={2} value={form.conditions} onChange={e => setForm({...form, conditions: e.target.value})}/>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "#A18133", color: "#fff" }}>{busy ? "Salvando…" : "Criar como rascunho"}</Button>
          </DialogFooter>
        </form>
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
