import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { http, currency, waLink, formatApiError } from "@/lib/api";
import { ArrowLeft, MessageCircle, Plus, MoreHorizontal, Send, Check, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { TID } from "@/constants/testIds";
import BrandKitEditor from "@/components/BrandKitEditor";
import CompliancePanel from "@/components/CompliancePanel";

const CONTENT_STATUS = [
  { key: "ideia", label: "Ideia" },
  { key: "em_producao", label: "Em produção" },
  { key: "revisao_interna", label: "Revisão interna" },
  { key: "revisao_compliance", label: "Compliance" },
  { key: "aguardando_aprovacao", label: "Aguardando cliente" },
  { key: "ajuste_solicitado", label: "Ajuste solicitado" },
  { key: "aprovado", label: "Aprovado" },
  { key: "agendado", label: "Agendado" },
  { key: "publicado", label: "Publicado" },
];

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState(null);
  const [contents, setContents] = useState([]);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    const [c, ct] = await Promise.all([
      http.get(`/clients/${id}`),
      http.get(`/content`, { params: { client_id: id }})
    ]);
    setClient(c.data); setContents(ct.data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!client) return <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando cliente…</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/app/clientes")} className="text-sm flex items-center gap-1 hover:opacity-70" style={{ color: "#6F6F6C" }}>
        <ArrowLeft size={14}/> Voltar para clientes
      </button>

      <div className="card-elev p-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl"
               style={{ background: "#231F20", color: "#A18133" }}>
            {client.trade_name.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>{client.package?.toUpperCase()} · {client.status?.toUpperCase()}</div>
            <h1 className="font-serif-display text-3xl mt-1" style={{ color: "#231F20" }}>{client.trade_name}</h1>
            <div className="text-sm mt-1" style={{ color: "#6F6F6C" }}>{client.profession} · {client.specialty} · {client.city}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] tracking-wider" style={{ color: "#959693" }}>MENSALIDADE</div>
            <div className="text-lg font-semibold" style={{ color: "#231F20" }}>{currency(client.monthly_fee)}</div>
          </div>
          {client.phone && (
            <a href={waLink(client.phone)} target="_blank" rel="noreferrer"
               className="p-3 rounded-lg" style={{ background: "#EFECE7", color: "#231F20" }} title="WhatsApp">
              <MessageCircle size={16}/>
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="conteudos">
        <TabsList className="bg-transparent gap-2 p-0">
          <TabsTrigger value="visao" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Visão geral</TabsTrigger>
          <TabsTrigger value="conteudos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Content Studio</TabsTrigger>
          <TabsTrigger value="brandkit" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-brandkit">Brand Kit</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-5">
            <Info label="E-mail" value={client.email || "—"}/>
            <Info label="Instagram" value={client.instagram || "—"}/>
            <Info label="Telefone" value={client.phone || "—"}/>
            <Info label="Documento" value={client.document || "—"}/>
            <Info label="Responsável" value={client.responsible || "—"}/>
            <Info label="Onboarding" value={`${client.onboarding_progress || 0}%`}/>
          </div>
          <div className="card-elev p-6">
            <div className="text-xs tracking-[0.24em] mb-3" style={{ color: "#6F6F6C" }}>PRÓXIMOS MÓDULOS (FASE 2)</div>
            <div className="text-sm" style={{ color: "#6F6F6C" }}>
              Brand Kit · Briefing completo · Estratégia · Calendário editorial · Stories · Roteiros ·
              Captações · Aprovações em lote · Arquivos · Relatórios · Financeiro · Reuniões · Acessos · Compliance.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conteudos" className="mt-6">
          <ContentStudio contents={contents} clientId={id} onChange={load} newOpen={newOpen} setNewOpen={setNewOpen}/>
        </TabsContent>

        <TabsContent value="brandkit" className="mt-6">
          <BrandKitEditor clientId={id}/>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="card-elev p-4">
      <div className="text-[10px] tracking-wider" style={{ color: "#959693" }}>{label.toUpperCase()}</div>
      <div className="text-sm mt-1 font-medium" style={{ color: "#231F20" }}>{value}</div>
    </div>
  );
}

function ContentStudio({ contents, clientId, onChange, newOpen, setNewOpen }) {
  const grouped = useMemo(() => {
    const g = {}; CONTENT_STATUS.forEach(s => g[s.key] = []);
    contents.forEach(c => { if (g[c.status]) g[c.status].push(c); });
    return g;
  }, [contents]);

  return (
    <div data-testid={TID.contentKanban}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm" style={{ color: "#6F6F6C" }}>{contents.length} conteúdos no funil</div>
        <NewContentDialog open={newOpen} setOpen={setNewOpen} clientId={clientId} onCreated={onChange}/>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {CONTENT_STATUS.map(s => (
          <div key={s.key} className="kanban-col p-3 min-w-[280px] w-[280px] shrink-0">
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="text-xs font-semibold tracking-wider" style={{ color: "#231F20" }}>{s.label.toUpperCase()}</div>
              <div className="text-[11px]" style={{ color: "#959693" }}>{grouped[s.key].length}</div>
            </div>
            <div className="space-y-2">
              {grouped[s.key].length === 0 && (
                <div className="text-[11px] py-6 text-center" style={{ color: "#959693" }}>—</div>
              )}
              {grouped[s.key].map(c => (
                <ContentCard key={c.id} content={c} onChange={onChange}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FORMAT_LABEL = { reels: "Reels", story: "Story", carrossel: "Carrossel", post: "Post" };

function ContentCard({ content, onChange }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [complianceResult, setComplianceResult] = useState(null);

  async function sendApproval() {
    // Rodar compliance antes de enviar
    try {
      const { data } = await http.post(`/content/${content.id}/compliance-check`);
      setComplianceResult(data);
      if (data.risk === "bloqueado") {
        setComplianceOpen(true);
        toast.error("Compliance bloqueou o envio. Revise os apontamentos.");
        return;
      }
      if (data.risk === "alto") {
        setComplianceOpen(true);
        toast.warning("Alto risco de compliance — revise antes de enviar.");
        return;
      }
      await http.post(`/content/${content.id}/send-approval`);
      toast.success("Enviado ao cliente");
      onChange();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function forceSendApproval() {
    try {
      await http.post(`/content/${content.id}/send-approval`);
      toast.success("Enviado ao cliente");
      setComplianceOpen(false);
      onChange();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function setStatus(status) {
    try { await http.patch(`/content/${content.id}`, { status }); toast.success("Status atualizado"); onChange(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="p-3 rounded-lg bg-white border" style={{ borderColor: "#E2E0DC" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] tracking-wider" style={{ color: "#A18133" }}>{FORMAT_LABEL[content.format]?.toUpperCase() || content.format} · v{content.version}</div>
          <div className="text-sm font-semibold leading-snug mt-1" style={{ color: "#231F20" }}>{content.title}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-[#EFECE7]"><MoreHorizontal size={16} style={{ color: "#6F6F6C" }}/></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mover para</DropdownMenuLabel>
            {CONTENT_STATUS.filter(s => s.key !== content.status).map(s => (
              <DropdownMenuItem key={s.key} onClick={() => setStatus(s.key)}>{s.label}</DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
              <History size={14} className="mr-2"/> Ver histórico
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {content.caption && (
        <div className="text-xs mt-2 line-clamp-2" style={{ color: "#6F6F6C" }}>{content.caption}</div>
      )}
      {["revisao_interna", "revisao_compliance", "em_producao", "ajuste_solicitado"].includes(content.status) && (
        <button onClick={sendApproval} data-testid={`${TID.contentSendApproval}-${content.id}`}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs py-2 rounded-md font-medium"
          style={{ background: "#231F20", color: "#fff" }}>
          <Send size={12}/> Enviar ao cliente
        </button>
      )}
      <HistoryDialog open={historyOpen} setOpen={setHistoryOpen} content={content}/>
      <Dialog open={complianceOpen} onOpenChange={setComplianceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">Checagem de compliance</DialogTitle>
          </DialogHeader>
          {complianceResult && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg text-sm ${complianceResult.risk === "bloqueado" || complianceResult.risk === "alto" ? "" : ""}`}
                style={{ background: complianceResult.risk === "bloqueado" ? "#FBE9E7" : complianceResult.risk === "alto" ? "#FBE9E7" : "#F5EBD0",
                         color: complianceResult.risk === "baixo" ? "#806525" : "#9A2A1E" }}>
                <b>{complianceResult.risk === "bloqueado" ? "Bloqueado — revise antes de enviar" :
                    complianceResult.risk === "alto" ? "Alto risco — revise cuidadosamente" :
                    complianceResult.risk === "atencao" ? "Atenção — verifique os apontamentos" : "Baixo risco"}</b>
                <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>
                  {complianceResult.findings.length} apontamento(s) · pontuação {complianceResult.score}
                  {complianceResult.council && ` · ${complianceResult.council.toUpperCase()}`}
                </div>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {complianceResult.findings.map((f, i) => (
                  <div key={i} className="p-2.5 rounded-lg border text-xs" style={{ borderColor: "#E2E0DC" }}>
                    <div className="font-semibold" style={{ color: f.severity === 3 ? "#9A2A1E" : "#806525" }}>
                      {f.severity === 3 ? "ALTO" : f.severity === 2 ? "ATENÇÃO" : "BAIXO"} · {f.rule}
                    </div>
                    <div className="mt-1" style={{ color: "#231F20" }}>&ldquo;{f.snippet}&rdquo;</div>
                    <div className="mt-1" style={{ color: "#6F6F6C" }}>{f.suggestion}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px]" style={{ color: "#959693" }}>{complianceResult.disclaimer}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplianceOpen(false)}>Voltar e revisar</Button>
            {complianceResult?.risk !== "bloqueado" && (
              <Button onClick={forceSendApproval} data-testid="compliance-force-send"
                style={{ background: "#231F20", color: "#fff" }}>Enviar mesmo assim</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryDialog({ open, setOpen, content }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-2xl">Histórico · {content.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {(content.history || []).slice().reverse().map((h) => (
            <div key={`${h.version}-${h.timestamp}-${h.action}`} className="p-3 rounded-lg border" style={{ borderColor: "#EFECE7" }}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold" style={{ color: "#A18133" }}>v{h.version} · {h.action}</div>
                <div className="text-[10px]" style={{ color: "#959693" }}>{new Date(h.timestamp).toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-sm mt-1" style={{ color: "#231F20" }}>{h.user}</div>
              {h.comment && <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{h.comment}</div>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewContentDialog({ open, setOpen, clientId, onCreated }) {
  const [form, setForm] = useState({ title: "", format: "reels", caption: "", cta: "", hashtags: "", objective: "", pillar: "", priority: "media" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await http.post("/content", { ...form, client_id: clientId });
      toast.success("Conteúdo criado");
      setOpen(false);
      setForm({ title: "", format: "reels", caption: "", cta: "", hashtags: "", objective: "", pillar: "", priority: "media" });
      onCreated();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} data-testid="content-new-btn" style={{ background: "#A18133", color: "#fff" }}>
        <Plus size={16} className="mr-1"/> Novo conteúdo
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Novo conteúdo</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Título*</Label>
            <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1.5"/>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Formato</Label>
            <Select value={form.format} onValueChange={v => setForm({...form, format: v})}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["reels","story","carrossel","post"].map(f => <SelectItem key={f} value={f}>{FORMAT_LABEL[f]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Prioridade</Label>
            <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["baixa","media","alta"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Legenda</Label>
            <Textarea rows={3} value={form.caption} onChange={e => setForm({...form, caption: e.target.value})} className="mt-1.5"/>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>CTA</Label>
            <Input value={form.cta} onChange={e => setForm({...form, cta: e.target.value})} className="mt-1.5"/>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Pilar</Label>
            <Input value={form.pillar} onChange={e => setForm({...form, pillar: e.target.value})} className="mt-1.5"/>
          </div>
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "#A18133", color: "#fff" }}>
              {busy ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
