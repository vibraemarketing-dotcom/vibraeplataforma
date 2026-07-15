import { useCallback, useEffect, useState } from "react";
import { http, waLink, currency, formatApiError } from "@/lib/api";
import { TID } from "@/constants/testIds";
import { Plus, MessageCircle, ArrowRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STAGES = [
  { key: "novo_lead", label: "Novo lead" },
  { key: "primeiro_contato", label: "1º Contato" },
  { key: "follow_up", label: "Follow-up" },
  { key: "qualificado", label: "Qualificado" },
  { key: "reuniao_marcada", label: "Reunião" },
  { key: "proposta_enviada", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
  { key: "ganho", label: "Ganho" },
];

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await http.get("/leads");
    setLeads(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function moveTo(lead, stage) {
    try {
      await http.patch(`/leads/${lead.id}`, { stage });
      toast.success(`${lead.name} movido para ${STAGES.find(s => s.key === stage)?.label || stage}`);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function convert(lead) {
    if (!confirm(`Converter ${lead.name} em cliente? Isso criará o cliente e iniciará onboarding.`)) return;
    try {
      const { data } = await http.post(`/leads/${lead.id}/convert`);
      toast.success("Cliente criado. Abrindo ficha…");
      navigate(`/app/clientes/${data.client_id}`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div data-testid={TID.crmPage} className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>CRM COMERCIAL</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Pipeline de leads</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            {leads.length} leads · {currency(leads.filter(l => l.stage !== "perdido" && l.stage !== "ganho").reduce((s,l)=>s+(l.potential_value||0),0))} em potencial
          </p>
        </div>
        <NewLeadDialog open={newOpen} setOpen={setNewOpen} onCreated={load} />
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const stageLeads = leads.filter(l => l.stage === s.key);
          const total = stageLeads.reduce((sum, l) => sum + (l.potential_value || 0), 0);
          return (
            <div key={s.key} className="kanban-col p-3 min-w-[280px] w-[280px] shrink-0">
              <div className="flex items-center justify-between px-1 pb-3">
                <div>
                  <div className="text-xs font-semibold tracking-wider" style={{ color: "#231F20" }}>{s.label.toUpperCase()}</div>
                  <div className="text-[11px]" style={{ color: "#959693" }}>{stageLeads.length} · {currency(total)}</div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.key === "ganho" ? "#A18133" : "#D8D7D3" }} />
              </div>
              <div className="space-y-2">
                {stageLeads.length === 0 && (
                  <div className="text-[11px] py-6 text-center" style={{ color: "#959693" }}>Nenhum lead</div>
                )}
                {stageLeads.map((l) => (
                  <LeadCard key={l.id} lead={l} onMove={moveTo} onConvert={convert} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({ lead, onMove, onConvert }) {
  return (
    <div className="p-3 rounded-lg bg-white border" style={{ borderColor: "#E2E0DC" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "#231F20" }}>{lead.name}</div>
          {lead.company && <div className="text-xs truncate" style={{ color: "#6F6F6C" }}>{lead.company}</div>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-[#EFECE7]" data-testid={`lead-menu-${lead.id}`}>
              <MoreHorizontal size={16} style={{ color: "#6F6F6C" }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {STAGES.filter(s => s.key !== lead.stage).map(s => (
              <DropdownMenuItem key={s.key} onClick={() => onMove(lead, s.key)}>
                Mover para {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onConvert(lead)} data-testid={`${TID.crmConvert}-${lead.id}`}>
              <ArrowRight size={14} className="mr-2" style={{ color: "#A18133" }} /> Converter em cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {lead.profession && (
        <div className="text-[11px] mt-2" style={{ color: "#959693" }}>{lead.profession} · {lead.city}</div>
      )}
      {lead.potential_value > 0 && (
        <div className="text-xs mt-2 font-semibold" style={{ color: "#A18133" }}>{currency(lead.potential_value)}</div>
      )}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t" style={{ borderColor: "#EFECE7" }}>
        {lead.phone && (
          <a href={waLink(lead.phone)} target="_blank" rel="noreferrer"
             className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-[#EFECE7]"
             style={{ color: "#231F20" }}>
            <MessageCircle size={12} /> WhatsApp
          </a>
        )}
        <div className="ml-auto text-[10px]" style={{ color: "#959693" }}>{lead.source}</div>
      </div>
    </div>
  );
}

function NewLeadDialog({ open, setOpen, onCreated }) {
  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "", instagram: "", profession: "",
    specialty: "", city: "", source: "Instagram", service: "", potential_value: 0
  });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await http.post("/leads", form);
      toast.success("Lead criado");
      setOpen(false);
      setForm({ name: "", company: "", phone: "", email: "", instagram: "", profession: "",
        specialty: "", city: "", source: "Instagram", service: "", potential_value: 0 });
      onCreated();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid={TID.crmNewLead} style={{ background: "#A18133", color: "#fff" }}>
          <Plus size={16} className="mr-1" /> Novo lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-2xl">Novo lead comercial</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4 mt-2">
          <Field label="Nome*" col="col-span-2"><Input required value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/></Field>
          <Field label="Empresa"><Input value={form.company} onChange={e=>setForm({...form, company:e.target.value})}/></Field>
          <Field label="Cidade"><Input value={form.city} onChange={e=>setForm({...form, city:e.target.value})}/></Field>
          <Field label="Profissão"><Input value={form.profession} onChange={e=>setForm({...form, profession:e.target.value})}/></Field>
          <Field label="Especialidade"><Input value={form.specialty} onChange={e=>setForm({...form, specialty:e.target.value})}/></Field>
          <Field label="WhatsApp"><Input placeholder="5511999998888" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></Field>
          <Field label="Instagram"><Input value={form.instagram} onChange={e=>setForm({...form, instagram:e.target.value})}/></Field>
          <Field label="Origem">
            <Select value={form.source} onValueChange={(v) => setForm({...form, source: v})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {["Instagram","Indicação","Google","Site","Instagram Ads","Outro"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor potencial (R$)"><Input type="number" value={form.potential_value} onChange={e=>setForm({...form, potential_value: parseFloat(e.target.value)||0})}/></Field>
          <Field label="Serviço de interesse" col="col-span-2"><Input value={form.service} onChange={e=>setForm({...form, service:e.target.value})}/></Field>
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "#A18133", color: "#fff" }}>
              {busy ? "Salvando..." : "Criar lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, col="" }) {
  return (
    <div className={col}>
      <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
