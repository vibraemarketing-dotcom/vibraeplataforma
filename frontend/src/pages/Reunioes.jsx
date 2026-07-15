import { useEffect, useState, useCallback, useRef } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, Mic, FileAudio, ListChecks, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Reunioes({ embedClientId }) {
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const [m, c] = await Promise.all([http.get("/meetings"), http.get("/clients")]);
    setMeetings(m.data); setClients(c.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const clientById = Object.fromEntries(clients.map(c => [c.id, c.trade_name]));
  const shownMeetings = embedClientId ? meetings.filter(m => m.client_id === embedClientId) : meetings;

  return (
    <div className="space-y-6" data-testid="reunioes-page">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          {!embedClientId && <>
            <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>REUNIÕES COM ATA</div>
            <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Da reunião à tarefa em minutos</h1>
            <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
              Suba o áudio da reunião · Whisper transcreve · IA extrai decisões · tudo vira tarefa atribuída ao time.
            </p>
          </>}
        </div>
        <NewMeetingDialog open={newOpen} setOpen={setNewOpen} clients={clients} onCreated={load}/>
      </header>

      {shownMeetings.length === 0 && (
        <div className="card-elev p-12 text-center">
          <Mic size={40} className="mx-auto" style={{ color: "#A18133" }}/>
          <div className="text-sm mt-3" style={{ color: "#6F6F6C" }}>Nenhuma reunião cadastrada. Clique em <b>Nova reunião</b>.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {shownMeetings.map(m => (
          <button key={m.id} onClick={() => setSelected(m)} data-testid={`meeting-${m.id}`}
            className="card-elev p-5 text-left hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>{new Date(m.date).toLocaleDateString("pt-BR")}</div>
              {m.transcribed_at && <div className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider" style={{ background: "#E7F5EB", color: "#1F6B3E" }}>TRANSCRITA</div>}
            </div>
            <div className="text-base font-semibold mt-2" style={{ color: "#231F20" }}>{m.title}</div>
            <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>
              {clientById[m.client_id] || "Sem cliente"} · {(m.participants || []).length} participantes
            </div>
            {m.summary && <div className="text-xs mt-3 line-clamp-2" style={{ color: "#6F6F6C" }}>{m.summary}</div>}
            <div className="text-[11px] mt-3 flex gap-3" style={{ color: "#959693" }}>
              <span>{(m.decisions || []).length} decisões</span>
              <span>{(m.suggested_tasks || []).length} tarefas</span>
              {m.tasks_created?.length > 0 && <span style={{ color: "#1F6B3E" }}>{m.tasks_created.length} criadas</span>}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && <MeetingDetail meeting={selected} clientName={clientById[selected.client_id]} onChange={() => { load(); http.get(`/meetings/${selected.id}`).then(r => setSelected(r.data)); }}/>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeetingDetail({ meeting, clientName, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function upload(file) {
    if (!file) return;
    const form = new FormData();
    form.append("audio", file);
    setUploading(true);
    try {
      await http.post(`/meetings/${meeting.id}/transcribe`, form, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 300000,
      });
      toast.success("Áudio transcrito e decisões extraídas");
      onChange();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setUploading(false); }
  }

  async function createTasks() {
    if (!confirm(`Converter ${meeting.suggested_tasks?.length || 0} tarefas sugeridas em tarefas reais?`)) return;
    setCreating(true);
    try {
      const { data } = await http.post(`/meetings/${meeting.id}/convert-tasks`);
      toast.success(`${data.created} tarefas criadas no cronograma`);
      onChange();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setCreating(false); }
  }

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>
          {new Date(meeting.date).toLocaleDateString("pt-BR")} · {clientName || "Sem cliente"}
        </div>
        <DialogTitle className="font-serif-display text-3xl">{meeting.title}</DialogTitle>
      </DialogHeader>

      {meeting.agenda && (
        <div>
          <div className="text-xs tracking-[0.24em] mb-1" style={{ color: "#6F6F6C" }}>PAUTA</div>
          <div className="text-sm" style={{ color: "#231F20" }}>{meeting.agenda}</div>
        </div>
      )}

      {/* Upload */}
      {!meeting.transcript && (
        <div className="p-6 rounded-lg border-2 border-dashed text-center" style={{ borderColor: "#E2E0DC" }}>
          <FileAudio size={32} className="mx-auto" style={{ color: "#A18133" }}/>
          <div className="text-sm mt-3 font-medium" style={{ color: "#231F20" }}>Suba o áudio da reunião</div>
          <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>MP3, M4A, WAV, MP4 · até 25MB · idioma PT-BR</div>
          <input ref={fileRef} type="file" accept="audio/*,video/mp4"
            onChange={e => upload(e.target.files?.[0])} className="hidden" data-testid="audio-upload-input"/>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="audio-upload-btn"
            className="mt-4" style={{ background: "#A18133", color: "#fff" }}>
            {uploading ? (<><div className="pulse-dot mr-2"/> Transcrevendo com Whisper…</>) : (<><Upload size={14} className="mr-1"/> Escolher arquivo</>)}
          </Button>
          <div className="text-[10px] mt-3" style={{ color: "#959693" }}>Após o upload, a IA extrai decisões e sugere tarefas automaticamente.</div>
        </div>
      )}

      {meeting.summary && (
        <div>
          <div className="text-xs tracking-[0.24em] mb-1 flex items-center gap-1" style={{ color: "#A18133" }}>
            <Sparkles size={12}/> RESUMO EXECUTIVO
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#231F20" }}>{meeting.summary}</p>
        </div>
      )}

      {meeting.decisions?.length > 0 && (
        <div>
          <div className="text-xs tracking-[0.24em] mb-2" style={{ color: "#A18133" }}>DECISÕES TOMADAS</div>
          <div className="space-y-2">
            {meeting.decisions.map((d, i) => (
              <div key={i} className="p-3 rounded-lg border flex items-start gap-2" style={{ borderColor: "#E2E0DC" }}>
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "#A18133" }}/>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: "#231F20" }}>{d.text}</div>
                  {d.owner && <div className="text-[11px] mt-0.5" style={{ color: "#6F6F6C" }}>Responsável: {d.owner}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meeting.suggested_tasks?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>TAREFAS SUGERIDAS</div>
            {!meeting.tasks_created?.length && (
              <Button onClick={createTasks} disabled={creating} size="sm" data-testid="convert-tasks-btn"
                style={{ background: "#231F20", color: "#fff" }}>
                <ListChecks size={12} className="mr-1"/> Criar todas no cronograma
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {meeting.suggested_tasks.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border flex items-center gap-2" style={{ borderColor: "#E2E0DC" }}>
                <ArrowRight size={14} style={{ color: "#A18133" }}/>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "#231F20" }}>{t.title}</div>
                  <div className="text-[11px]" style={{ color: "#6F6F6C" }}>
                    {t.assignee ? `Responsável: ${t.assignee} · ` : ""}Prazo sugerido: {t.due_days}d
                  </div>
                </div>
              </div>
            ))}
          </div>
          {meeting.tasks_created?.length > 0 && (
            <div className="text-xs mt-3 p-3 rounded-lg" style={{ background: "#E7F5EB", color: "#1F6B3E" }}>
              ✓ {meeting.tasks_created.length} tarefas já foram criadas no cronograma (Tarefas · Gantt)
            </div>
          )}
        </div>
      )}

      {meeting.transcript && (
        <details>
          <summary className="text-xs tracking-[0.24em] cursor-pointer" style={{ color: "#A18133" }}>VER TRANSCRIÇÃO COMPLETA</summary>
          <div className="mt-2 p-4 rounded-lg max-h-96 overflow-y-auto text-xs whitespace-pre-wrap" style={{ background: "#F7F5F2", color: "#231F20" }}>
            {meeting.transcript}
          </div>
        </details>
      )}
    </div>
  );
}

function NewMeetingDialog({ open, setOpen, clients, onCreated }) {
  const [form, setForm] = useState({
    title: "", client_id: "", date: new Date().toISOString().slice(0, 10),
    participants: "", agenda: ""
  });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await http.post("/meetings", {
        ...form,
        participants: form.participants.split(",").map(s => s.trim()).filter(Boolean),
      });
      toast.success("Reunião criada");
      setOpen(false); onCreated();
      setForm({ title: "", client_id: "", date: new Date().toISOString().slice(0, 10), participants: "", agenda: "" });
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} data-testid="new-meeting-btn" style={{ background: "#A18133", color: "#fff" }}>
        <Plus size={16} className="mr-1"/> Nova reunião
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Nova reunião</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Título*">
            <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">
              <Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}>
                <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Data">
              <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}/>
            </Field>
          </div>
          <Field label="Participantes (separe por vírgula)">
            <Input value={form.participants} onChange={e => setForm({...form, participants: e.target.value})}/>
          </Field>
          <Field label="Pauta">
            <Textarea rows={3} value={form.agenda} onChange={e => setForm({...form, agenda: e.target.value})}/>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "#A18133", color: "#fff" }}>{busy ? "…" : "Criar"}</Button>
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
