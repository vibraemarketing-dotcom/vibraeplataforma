import { useEffect, useState, useCallback, useMemo } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, AlertTriangle, Camera, Megaphone, ClipboardList, Users } from "lucide-react";

const KIND_META = {
  captacao: { label: "Captação", icon: Camera, color: "#A18133" },
  campanha: { label: "Campanha", icon: Megaphone, color: "#806525" },
  producao: { label: "Produção", icon: ClipboardList, color: "#231F20" },
  geral: { label: "Geral", icon: Users, color: "#6F6F6C" },
};

const STATUS_META = {
  pendente: { label: "Pendente", color: "#806525", bg: "#F5EBD0" },
  em_andamento: { label: "Em andamento", color: "#1F6B3E", bg: "#E7F5EB" },
  concluida: { label: "Concluída", color: "#6F6F6C", bg: "#EFECE7" },
  atrasada: { label: "Atrasada", color: "#9A2A1E", bg: "#FBE9E7" },
};

const CAPACITY_META = {
  disponivel: { label: "Disponível", color: "#1F6B3E", bg: "#E7F5EB" },
  bem_distribuido: { label: "Bem distribuído", color: "#806525", bg: "#F5EBD0" },
  proximo_limite: { label: "Próximo do limite", color: "#9A6A00", bg: "#FBF3DE" },
  sobrecarregado: { label: "Sobrecarregado", color: "#9A2A1E", bg: "#FBE9E7" },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_H = 48;

export default function Tarefas() {
  const [tasks, setTasks] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [clients, setClients] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 3); return d;
  });
  const [rangeDays] = useState(30);

  const load = useCallback(async () => {
    const [t, c, cl] = await Promise.all([
      http.get("/tasks"),
      http.get("/tasks/capacity"),
      http.get("/clients"),
    ]);
    setTasks(t.data); setCapacity(c.data); setClients(cl.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const rangeEnd = useMemo(() => new Date(rangeStart.getTime() + rangeDays * DAY_MS), [rangeStart, rangeDays]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(rangeStart.getTime() + i * DAY_MS);
      arr.push(d);
    }
    return arr;
  }, [rangeStart, rangeDays]);

  const groups = useMemo(() => {
    // agrupa por assignee
    const map = {};
    tasks.forEach(t => {
      const key = t.assignee || "Não atribuído";
      map[key] = map[key] || [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  function shift(days) {
    const d = new Date(rangeStart); d.setDate(d.getDate() + days); setRangeStart(d);
  }

  function taskBar(t) {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    const startOffset = Math.max(0, (start - rangeStart) / DAY_MS);
    const dur = Math.max(0.5, (end - start) / DAY_MS + 0.6);
    const left = (startOffset / rangeDays) * 100;
    const width = (dur / rangeDays) * 100;
    if (startOffset >= rangeDays) return null;
    if (startOffset + dur < 0) return null;
    return { left, width };
  }

  async function updateStatus(t, status) {
    try { await http.patch(`/tasks/${t.id}`, { status }); toast.success("Status atualizado"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="space-y-6" data-testid="tarefas-page">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>TAREFAS · GANTT</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Cronograma operacional</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            Captações, campanhas e produções em um só timeline · veja sobrecarga antes que aconteça.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => shift(-7)}>-7 dias</Button>
          <Button variant="outline" onClick={() => setRangeStart(new Date(Date.now() - 3 * DAY_MS))}>Hoje</Button>
          <Button variant="outline" onClick={() => shift(7)}>+7 dias</Button>
          <NewTaskDialog open={newOpen} setOpen={setNewOpen} clients={clients} onCreated={load}/>
        </div>
      </header>

      {/* Capacidade da equipe */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {capacity.map(c => {
          const meta = CAPACITY_META[c.level];
          return (
            <div key={c.assignee} className="card-elev p-4">
              <div className="text-[11px] tracking-wider" style={{ color: "#959693" }}>{c.assignee.toUpperCase()}</div>
              <div className="text-xl font-bold mt-1" style={{ color: "#231F20" }}>{c.count} <span className="text-sm font-normal">tarefas ativas</span></div>
              <div className="text-[10px] px-2 py-1 rounded-full mt-2 inline-block font-semibold tracking-wider"
                style={{ background: meta.bg, color: meta.color }}>{meta.label.toUpperCase()}</div>
            </div>
          );
        })}
        {capacity.some(c => c.level === "sobrecarregado") && (
          <div className="card-elev p-4 flex items-start gap-2" style={{ background: "#FBE9E7", borderColor: "#F5C6C0" }}>
            <AlertTriangle size={18} style={{ color: "#9A2A1E" }} className="mt-0.5"/>
            <div className="text-xs" style={{ color: "#9A2A1E" }}>
              Um ou mais membros da equipe estão sobrecarregados. Considere redistribuir tarefas.
            </div>
          </div>
        )}
      </div>

      {/* Gantt */}
      <div className="card-elev overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header dias */}
          <div className="flex sticky top-0 z-10" style={{ background: "#FBF7EE" }}>
            <div className="w-52 shrink-0 p-3 text-[10px] tracking-wider font-semibold border-r" style={{ color: "#959693", borderColor: "#E2E0DC" }}>RESPONSÁVEL / TAREFA</div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${rangeDays}, 1fr)` }}>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="text-[9px] text-center py-2 border-r"
                    style={{
                      background: isToday ? "#F5EBD0" : (isWeekend ? "#EFECE7" : "transparent"),
                      borderColor: "#EFECE7", color: isToday ? "#A18133" : "#6F6F6C",
                      fontWeight: isToday ? 700 : 400,
                    }}>
                    <div>{d.getDate()}</div>
                    <div>{["D","S","T","Q","Q","S","S"][d.getDay()]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows por assignee */}
          {Object.entries(groups).map(([assignee, ts]) => (
            <div key={assignee}>
              <div className="flex" style={{ borderTop: "1px solid #EFECE7", background: "#FDFCFA" }}>
                <div className="w-52 shrink-0 p-3 text-xs font-semibold border-r" style={{ color: "#231F20", borderColor: "#E2E0DC" }}>
                  {assignee}
                </div>
                <div className="flex-1"/>
              </div>
              {ts.map(t => {
                const bar = taskBar(t);
                const meta = KIND_META[t.kind] || KIND_META.geral;
                const st = STATUS_META[t.status] || STATUS_META.pendente;
                const client = clientById[t.client_id];
                const Icon = meta.icon;
                return (
                  <div key={t.id} className="flex items-center" style={{ borderTop: "1px solid #F5F3EF", minHeight: ROW_H }}>
                    <div className="w-52 shrink-0 p-2 border-r" style={{ borderColor: "#E2E0DC" }}>
                      <div className="flex items-center gap-1">
                        <Icon size={12} style={{ color: meta.color }}/>
                        <div className="text-xs font-medium truncate" style={{ color: "#231F20" }}>{t.title}</div>
                      </div>
                      {client && <div className="text-[10px] truncate" style={{ color: "#959693" }}>{client.trade_name}</div>}
                    </div>
                    <div className="flex-1 relative" style={{ height: ROW_H }}>
                      {bar && (
                        <div className="absolute top-1/2 -translate-y-1/2 h-8 rounded-md flex items-center px-2 group cursor-pointer"
                          style={{
                            left: `${bar.left}%`, width: `${bar.width}%`,
                            background: st.bg, borderLeft: `4px solid ${meta.color}`,
                          }}
                          onClick={() => {
                            const next = t.status === "pendente" ? "em_andamento" : (t.status === "em_andamento" ? "concluida" : "pendente");
                            updateStatus(t, next);
                          }}
                          data-testid={`gantt-task-${t.id}`}
                          title={`${t.title} · ${st.label}`}>
                          <span className="text-[10px] font-semibold truncate" style={{ color: st.color }}>{st.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "#6F6F6C" }}>
        <div>Clique em uma barra para mudar o status.</div>
        {Object.entries(KIND_META).map(([k, m]) => {
          const Icon = m.icon;
          return (
            <div key={k} className="flex items-center gap-1">
              <Icon size={12} style={{ color: m.color }}/> {m.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewTaskDialog({ open, setOpen, clients, onCreated }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "", kind: "captacao", client_id: "", start_date: today, end_date: today,
    assignee: "", status: "pendente", priority: "media", description: ""
  });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await http.post("/tasks", form);
      toast.success("Tarefa criada");
      setOpen(false); onCreated();
      setForm({ ...form, title: "" });
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} data-testid="new-task-btn" style={{ background: "#A18133", color: "#fff" }}>
        <Plus size={16} className="mr-1"/> Nova tarefa
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Nova tarefa</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Título*</Label>
            <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1"/>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Tipo</Label>
            <Select value={form.kind} onValueChange={v => setForm({...form, kind: v})}>
              <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Cliente</Label>
            <Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="—"/></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Início</Label>
            <Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="mt-1"/>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Fim</Label>
            <Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="mt-1"/>
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Responsável</Label>
            <Input value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} className="mt-1" placeholder="Nome do colaborador"/>
          </div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "#A18133", color: "#fff" }}>{busy ? "…" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
