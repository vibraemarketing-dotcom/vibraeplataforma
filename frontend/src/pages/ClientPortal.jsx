import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, formatApiError } from "@/lib/api";
import { Check, RotateCcw, Send, Instagram, Calendar, Sparkles, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TID } from "@/constants/testIds";

export default function ClientPortal() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [awaiting, setAwaiting] = useState([]);

  async function load() {
    const [s, c] = await Promise.all([http.get("/portal/summary"), http.get("/content")]);
    setSummary(s.data);
    setAwaiting(c.data.filter(x => x.status === "aguardando_aprovacao" || x.status === "ajuste_solicitado"));
  }
  useEffect(() => { load(); }, []);

  if (!summary) return <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando portal…</div>;

  return (
    <div data-testid={TID.portalPage} className="space-y-8">
      <header>
        <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>PORTAL DO CLIENTE</div>
        <h1 className="font-serif-display text-4xl mt-2" style={{ color: "#231F20" }}>
          Olá, {user?.name?.split(" ")[0]}.
        </h1>
        <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
          Aqui você aprova o que a VIBRAE produziu para <b>{summary.client?.trade_name}</b> — em poucos cliques.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PortalKpi icon={ClipboardCheck} label="AGUARDANDO SUA APROVAÇÃO" value={summary.awaiting} accent="gold" />
        <PortalKpi icon={Sparkles} label="APROVADOS ESTE MÊS" value={summary.approved} />
        <PortalKpi icon={RotateCcw} label="EM AJUSTE" value={summary.adjustments} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: "#231F20" }}>Conteúdos para revisar</h2>
          <div className="text-xs" style={{ color: "#959693" }}>{awaiting.length} itens</div>
        </div>

        {awaiting.length === 0 && (
          <div className="card-elev p-12 text-center">
            <Check size={40} className="mx-auto" style={{ color: "#A18133" }}/>
            <div className="text-base font-medium mt-4" style={{ color: "#231F20" }}>Tudo em dia!</div>
            <div className="text-sm mt-1" style={{ color: "#6F6F6C" }}>Sem conteúdos aguardando sua aprovação neste momento.</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {awaiting.map(c => <ApprovalCard key={c.id} content={c} onDone={load}/>)}
        </div>
      </section>

      {summary.upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: "#231F20" }}>Próximos conteúdos aprovados</h2>
          <div className="card-elev divide-y" style={{ borderColor: "#EFECE7" }}>
            {summary.upcoming.map(c => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <Calendar size={16} style={{ color: "#A18133" }}/>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "#231F20" }}>{c.title}</div>
                  <div className="text-xs" style={{ color: "#959693" }}>{c.format} · {new Date(c.scheduled_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded-full font-semibold tracking-wider"
                     style={{ background: "#F5EBD0", color: "#806525" }}>
                  {c.status === "agendado" ? "AGENDADO" : "APROVADO"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PortalKpi({ icon: Icon, label, value, accent }) {
  return (
    <div className="card-elev p-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] tracking-[0.24em] font-medium" style={{ color: "#6F6F6C" }}>{label}</div>
          <div className="text-3xl font-bold mt-3" style={{ color: "#231F20" }}>{value}</div>
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
             style={{ background: accent === "gold" ? "#F5EBD0" : "#EFECE7" }}>
          <Icon size={18} style={{ color: accent === "gold" ? "#A18133" : "#231F20" }}/>
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({ content, onDone }) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (!confirm(`Aprovar "${content.title}"?`)) return;
    setBusy(true);
    try {
      await http.post(`/content/${content.id}/approval-action`, { decision: "approved" });
      toast.success("Conteúdo aprovado. A VIBRAE foi notificada.");
      onDone();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  async function requestAdjust() {
    if (!comment.trim()) return toast.error("Descreva o ajuste desejado.");
    setBusy(true);
    try {
      await http.post(`/content/${content.id}/approval-action`, { decision: "adjustment", comment });
      toast.success("Ajuste solicitado. A VIBRAE foi notificada.");
      setAdjustOpen(false); setComment("");
      onDone();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  const isAdjust = content.status === "ajuste_solicitado";

  return (
    <div className="card-elev overflow-hidden">
      <div className="aspect-[4/5] flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #231F20 0%, #332F30 100%)" }}>
        <div className="text-center px-6">
          <Instagram size={28} className="mx-auto mb-3" style={{ color: "#A18133" }}/>
          <div className="text-[10px] tracking-[0.28em]" style={{ color: "#A18133" }}>
            {content.format?.toUpperCase()} · v{content.version}
          </div>
          <div className="text-lg font-semibold mt-2" style={{ color: "#F7F5F2" }}>{content.title}</div>
        </div>
        {isAdjust && (
          <div className="absolute top-3 left-3 text-[10px] px-2 py-1 rounded-full font-semibold tracking-wider"
               style={{ background: "#FBE9E7", color: "#9A2A1E" }}>
            AGUARDANDO NOVA VERSÃO
          </div>
        )}
      </div>
      <div className="p-4">
        {content.caption && (
          <div className="text-sm mb-3" style={{ color: "#231F20" }}>{content.caption}</div>
        )}
        {content.cta && (
          <div className="text-xs mb-3" style={{ color: "#6F6F6C" }}><b>CTA:</b> {content.cta}</div>
        )}
        {content.hashtags && (
          <div className="text-xs mb-3" style={{ color: "#A18133" }}>{content.hashtags}</div>
        )}

        {!isAdjust && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button onClick={approve} disabled={busy} data-testid={`${TID.approveBtn}-${content.id}`}
              className="h-10" style={{ background: "#A18133", color: "#fff" }}>
              <Check size={14} className="mr-1"/> Aprovar
            </Button>
            <Button onClick={() => setAdjustOpen(true)} disabled={busy} variant="outline"
              data-testid={`${TID.adjustBtn}-${content.id}`}
              className="h-10 border-[#231F20] text-[#231F20]">
              <RotateCcw size={14} className="mr-1"/> Solicitar ajuste
            </Button>
          </div>
        )}
        {isAdjust && (
          <div className="text-xs mt-3 p-3 rounded-lg" style={{ background: "#FBF7EE", color: "#6F6F6C" }}>
            A VIBRAE já recebeu sua solicitação e enviará a versão revisada em breve.
          </div>
        )}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif-display text-2xl">Solicitar ajuste</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: "#6F6F6C" }}>
            Descreva com detalhes o que deve mudar em <b>{content.title}</b>. Sua versão atual será preservada no histórico.
          </p>
          <Textarea rows={5} value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="Ex: Trocar a imagem de capa, revisar o CTA final, ajustar o tom da legenda…"/>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button onClick={requestAdjust} disabled={busy} style={{ background: "#231F20", color: "#fff" }}>
              <Send size={14} className="mr-1"/> Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
