import { useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Send, Check, RotateCcw, Trash2, MoveLeft, MoveRight, ArrowLeft, ArrowRight, Copy, Zap, MessageCircle, Link as LinkIcon } from "lucide-react";

const STATUS_STYLES = {
  rascunho: { label: "Rascunho", bg: "#EFECE7", color: "#6F6F6C" },
  aguardando_aprovacao: { label: "Aguardando cliente", bg: "#F5EBD0", color: "#806525" },
  ajuste_solicitado: { label: "Ajuste solicitado", bg: "#FBE9E7", color: "#9A2A1E" },
  aprovado: { label: "Aprovado", bg: "#E7F5EB", color: "#1F6B3E" },
  publicado: { label: "Publicado", bg: "#EFECE7", color: "#231F20" },
};

const INTERACTION_ICON = { none: null, poll: Zap, question: MessageCircle, link: LinkIcon };

export default function StoriesStudio() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [sequences, setSequences] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustComment, setAdjustComment] = useState("");

  useEffect(() => { http.get("/clients").then(r => { setClients(r.data); if (r.data[0]) setClientId(r.data[0].id); }); }, []);

  const load = useCallback(async () => {
    if (!clientId) return;
    const { data } = await http.get("/story-sequences", { params: { client_id: clientId }});
    setSequences(data);
    if (data.length && !activeId) setActiveId(data[0].id);
  }, [clientId, activeId]);
  useEffect(() => { load(); }, [load]);

  const active = sequences.find(s => s.id === activeId);
  const [frameIdx, setFrameIdx] = useState(0);
  useEffect(() => { setFrameIdx(0); }, [activeId]);

  async function createSequence(payload) {
    try {
      const { data } = await http.post("/story-sequences", { ...payload, client_id: clientId });
      toast.success("Sequência criada");
      setNewOpen(false);
      setActiveId(data.id);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function updateFrames(frames) {
    if (!active) return;
    try {
      await http.patch(`/story-sequences/${active.id}`, { frames });
      // atualiza local
      setSequences(s => s.map(x => x.id === active.id ? {...x, frames} : x));
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function sendApproval() {
    if (!active) return;
    try {
      await http.post(`/story-sequences/${active.id}/send-approval`);
      toast.success("Sequência enviada ao cliente");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function batchApprove() {
    if (!active) return;
    if (!confirm(`Aprovar TODA a sequência "${active.title}"?`)) return;
    try {
      await http.post(`/story-sequences/${active.id}/batch-approval`, { decision: "approved" });
      toast.success("Sequência aprovada em lote");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function batchAdjust() {
    if (!active || !adjustComment.trim()) return toast.error("Descreva o ajuste");
    try {
      await http.post(`/story-sequences/${active.id}/batch-approval`, { decision: "adjustment", comment: adjustComment });
      toast.success("Ajustes solicitados em lote");
      setAdjustOpen(false); setAdjustComment("");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  function updateFrame(idx, patch) {
    if (!active) return;
    const nf = active.frames.map((f, i) => i === idx ? {...f, ...patch} : f);
    updateFrames(nf);
  }

  function addFrame() {
    if (!active) return;
    const nf = [...(active.frames || []), {
      index: active.frames.length, text: "Novo Story", cta: "", link: "",
      background: "#231F20", text_color: "#F7F5F2", media_url: "",
      interaction: "none", poll_question: "", poll_options: [],
    }];
    updateFrames(nf);
    setFrameIdx(nf.length - 1);
  }

  function removeFrame(idx) {
    if (!active) return;
    if (!confirm(`Remover Story ${idx + 1}?`)) return;
    const nf = active.frames.filter((_, i) => i !== idx).map((f, i) => ({...f, index: i}));
    updateFrames(nf);
    setFrameIdx(Math.max(0, Math.min(idx - 1, nf.length - 1)));
  }

  return (
    <div className="space-y-6" data-testid="stories-page">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>STORIES EM SEQUÊNCIA</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Simule antes de publicar</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            Construa a sequência, previsualize no celular e envie tudo para aprovação em lote.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger data-testid="stories-client-select" className="w-56"><SelectValue/></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <NewSequenceDialog open={newOpen} setOpen={setNewOpen} onCreate={createSequence}/>
        </div>
      </header>

      {sequences.length === 0 && (
        <div className="card-elev p-12 text-center">
          <div className="text-sm" style={{ color: "#6F6F6C" }}>Nenhuma sequência para este cliente ainda. Clique em <b>Nova sequência</b>.</div>
        </div>
      )}

      {sequences.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-6">
          {/* Lista de sequências */}
          <div className="space-y-2">
            {sequences.map(s => {
              const st = STATUS_STYLES[s.status] || STATUS_STYLES.rascunho;
              return (
                <button key={s.id} onClick={() => setActiveId(s.id)} data-testid={`seq-${s.id}`}
                  className="w-full text-left card-elev p-4 transition"
                  style={{ borderColor: activeId === s.id ? "#A18133" : "#E2E0DC", borderWidth: 1, borderStyle: "solid" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "#231F20" }}>{s.title}</div>
                      <div className="text-[11px]" style={{ color: "#959693" }}>{(s.frames || []).length} stories · v{s.version}</div>
                    </div>
                    <div className="text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider shrink-0"
                      style={{ background: st.bg, color: st.color }}>{st.label.toUpperCase()}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Celular preview */}
          {active && (
            <div className="flex justify-center">
              <PhonePreview
                frames={active.frames || []}
                idx={frameIdx}
                onNext={() => setFrameIdx(i => Math.min(i + 1, active.frames.length - 1))}
                onPrev={() => setFrameIdx(i => Math.max(0, i - 1))}
              />
            </div>
          )}

          {/* Editor do frame + ações em lote */}
          {active && (
            <div className="space-y-4">
              <div className="card-elev p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>STORY {frameIdx + 1} de {active.frames.length}</div>
                  <div className="flex gap-1">
                    <button onClick={() => setFrameIdx(Math.max(0, frameIdx - 1))} className="p-1 rounded hover:bg-[#EFECE7]"><ArrowLeft size={14}/></button>
                    <button onClick={() => setFrameIdx(Math.min(active.frames.length - 1, frameIdx + 1))} className="p-1 rounded hover:bg-[#EFECE7]"><ArrowRight size={14}/></button>
                  </div>
                </div>
                {active.frames[frameIdx] && (
                  <FrameEditor frame={active.frames[frameIdx]}
                    onChange={(p) => updateFrame(frameIdx, p)}
                    onRemove={() => removeFrame(frameIdx)}/>
                )}
                <Button onClick={addFrame} variant="outline" className="w-full" data-testid="add-frame-btn">
                  <Plus size={14} className="mr-1"/> Adicionar Story
                </Button>
              </div>

              <div className="card-elev p-4 space-y-2">
                <div className="text-xs tracking-[0.24em] mb-1" style={{ color: "#6F6F6C" }}>AÇÕES DA SEQUÊNCIA</div>
                {active.status === "rascunho" && (
                  <Button onClick={sendApproval} data-testid="seq-send-approval" className="w-full" style={{ background: "#231F20", color: "#fff" }}>
                    <Send size={14} className="mr-1"/> Enviar para aprovação
                  </Button>
                )}
                {active.status === "aguardando_aprovacao" && (
                  <>
                    <Button onClick={batchApprove} data-testid="seq-approve-batch" className="w-full" style={{ background: "#A18133", color: "#fff" }}>
                      <Check size={14} className="mr-1"/> Aprovar toda a sequência
                    </Button>
                    <Button onClick={() => setAdjustOpen(true)} variant="outline" className="w-full border-[#231F20]">
                      <RotateCcw size={14} className="mr-1"/> Solicitar ajustes
                    </Button>
                  </>
                )}
                {active.status === "aprovado" && (
                  <div className="text-xs p-3 rounded-lg text-center" style={{ background: "#E7F5EB", color: "#1F6B3E" }}>
                    ✓ Sequência aprovada · pronta para agendar
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif-display text-2xl">Solicitar ajustes em lote</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: "#6F6F6C" }}>Descreva os ajustes necessários para toda a sequência. Uma nova versão será criada preservando o histórico.</p>
          <Textarea rows={5} value={adjustComment} onChange={e => setAdjustComment(e.target.value)}
            placeholder="Ex: Ajustar cores do Story 2, revisar CTA final, trocar mídia do Story 3…"/>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button onClick={batchAdjust} style={{ background: "#231F20", color: "#fff" }}>
              <Send size={14} className="mr-1"/> Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhonePreview({ frames, idx, onNext, onPrev }) {
  const f = frames[idx];
  if (!f) return null;
  return (
    <div className="relative" style={{ width: 300 }}>
      <div className="relative rounded-[46px] p-3 shadow-2xl" style={{ background: "#231F20" }}>
        <div className="relative rounded-[36px] overflow-hidden" style={{ aspectRatio: "9/16", background: f.background }}>
          {/* Progress bar */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {frames.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded" style={{ background: "rgba(255,255,255,0.3)" }}>
                <div className="h-full rounded" style={{ background: "#fff", width: i < idx ? "100%" : i === idx ? "40%" : "0%" }}/>
              </div>
            ))}
          </div>
          {/* Nav overlays */}
          <button onClick={onPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-0"/>
          <button onClick={onNext} className="absolute right-0 top-0 bottom-0 w-1/3 z-0"/>
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
            <div className="text-lg font-semibold leading-tight" style={{ color: f.text_color, fontFamily: "Montserrat" }}>
              {f.text}
            </div>
            {f.interaction === "poll" && f.poll_question && (
              <div className="mt-4 w-full">
                <div className="text-sm mb-2" style={{ color: f.text_color }}>{f.poll_question}</div>
                <div className="grid grid-cols-2 gap-2">
                  {(f.poll_options || []).map((o, i) => (
                    <div key={i} className="py-2 rounded text-xs font-semibold" style={{ background: "rgba(255,255,255,0.85)", color: "#231F20" }}>
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {f.cta && (
              <div className="mt-6 px-4 py-2 rounded-full text-xs font-semibold pointer-events-auto"
                style={{ background: f.text_color, color: f.background }}>
                {f.cta}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FrameEditor({ frame, onChange, onRemove }) {
  return (
    <div className="space-y-3">
      <Field label="Texto principal">
        <Textarea rows={2} value={frame.text || ""} onChange={e => onChange({ text: e.target.value })}/>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fundo">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded border shrink-0" style={{ background: frame.background, borderColor: "#D8D7D3" }}/>
            <Input value={frame.background} onChange={e => onChange({ background: e.target.value })} className="h-8 text-xs"/>
          </div>
        </Field>
        <Field label="Cor texto">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded border shrink-0" style={{ background: frame.text_color, borderColor: "#D8D7D3" }}/>
            <Input value={frame.text_color} onChange={e => onChange({ text_color: e.target.value })} className="h-8 text-xs"/>
          </div>
        </Field>
      </div>
      <Field label="CTA">
        <Input value={frame.cta || ""} onChange={e => onChange({ cta: e.target.value })} placeholder="Toque para saber mais"/>
      </Field>
      <Field label="Interação">
        <Select value={frame.interaction || "none"} onValueChange={v => onChange({ interaction: v })}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="poll">Enquete</SelectItem>
            <SelectItem value="question">Caixa de perguntas</SelectItem>
            <SelectItem value="link">Link</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {frame.interaction === "poll" && (
        <>
          <Field label="Pergunta da enquete">
            <Input value={frame.poll_question || ""} onChange={e => onChange({ poll_question: e.target.value })}/>
          </Field>
          <Field label="Opções (2 · separadas por ;)">
            <Input value={(frame.poll_options || []).join(";")} onChange={e => onChange({ poll_options: e.target.value.split(";").map(s=>s.trim()).slice(0,4) })}/>
          </Field>
        </>
      )}
      {frame.interaction === "link" && (
        <Field label="Link">
          <Input value={frame.link || ""} onChange={e => onChange({ link: e.target.value })} placeholder="https://…"/>
        </Field>
      )}
      <button onClick={onRemove} className="w-full text-xs py-2 rounded-md flex items-center justify-center gap-1"
        style={{ background: "#FBE9E7", color: "#9A2A1E" }}>
        <Trash2 size={12}/> Remover este Story
      </button>
    </div>
  );
}

function NewSequenceDialog({ open, setOpen, onCreate }) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} data-testid="new-seq-btn" style={{ background: "#A18133", color: "#fff" }}>
        <Plus size={16} className="mr-1"/> Nova sequência
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Nova sequência de Stories</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Título*">
            <Input value={title} onChange={e => setTitle(e.target.value)} required/>
          </Field>
          <Field label="Objetivo">
            <Textarea rows={2} value={objective} onChange={e => setObjective(e.target.value)}/>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => onCreate({ title, objective, frames: [
              { index: 0, text: "Story 1", cta: "", link: "", background: "#231F20", text_color: "#F7F5F2", media_url: "", interaction: "none", poll_question: "", poll_options: [] }
            ] })} disabled={!title} style={{ background: "#A18133", color: "#fff" }}>Criar</Button>
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
