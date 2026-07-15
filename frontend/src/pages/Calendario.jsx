import { useEffect, useState, useCallback, useMemo } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle, Sparkles, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_COLOR = {
  ideia: "#959693",
  em_producao: "#6F6F6C",
  revisao_interna: "#6F6F6C",
  revisao_compliance: "#806525",
  aguardando_aprovacao: "#A18133",
  ajuste_solicitado: "#9A2A1E",
  aprovado: "#1F6B3E",
  agendado: "#A18133",
  publicado: "#231F20",
  cancelado: "#D8D7D3",
};

const FORMAT_ICON = { reels: "🎬", story: "⚡", carrossel: "📄", post: "🖼️" };

export default function Calendario() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [clients, setClients] = useState([]);
  const [dragged, setDragged] = useState(null);

  const load = useCallback(async () => {
    const { data } = await http.get(`/calendar/events`, { params: { year, month }});
    setEvents(data.events);
    setHolidays(data.holidays);
    setConflicts(data.conflicts);
  }, [year, month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { http.get("/clients").then(r => setClients(r.data)); }, []);

  function prev() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function next() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  // Build calendar grid
  const grid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const day = parseInt(e.date.split("-")[2], 10);
      map[day] = map[day] || [];
      map[day].push(e);
    });
    return map;
  }, [events]);

  const holidaysByDay = useMemo(() => {
    const map = {};
    holidays.forEach(h => { map[h.day] = map[h.day] || []; map[h.day].push(h); });
    return map;
  }, [holidays]);

  const conflictSet = useMemo(() => new Set(conflicts.map(c => parseInt(c.split("-")[2], 10))), [conflicts]);

  async function drop(day) {
    if (!dragged || !day) return;
    const target = new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
    try {
      await http.patch(`/content/${dragged.id}`, { scheduled_at: target.toISOString() });
      toast.success(`"${dragged.title}" reagendado para ${day}/${month}`);
      setDragged(null);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  return (
    <div className="space-y-6" data-testid="calendario-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>CALENDÁRIO EDITORIAL</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>{MONTHS[month-1]} <span style={{ color: "#A18133" }}>{year}</span></h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            {events.length} publicação(ões) · {conflicts.length} conflito(s) · {holidays.length} data(s) comemorativa(s). Arraste os cards para reagendar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prev} data-testid="cal-prev"><ChevronLeft size={16}/></Button>
          <Button variant="outline" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}>Hoje</Button>
          <Button variant="outline" onClick={next} data-testid="cal-next"><ChevronRight size={16}/></Button>
        </div>
      </header>

      {conflicts.length > 0 && (
        <div className="p-4 rounded-lg border flex items-start gap-3"
             style={{ background: "#FBE9E7", borderColor: "#F5C6C0" }}>
          <AlertTriangle size={18} style={{ color: "#9A2A1E" }} className="mt-0.5"/>
          <div className="text-xs" style={{ color: "#9A2A1E" }}>
            <b>Excesso de publicações no mesmo dia:</b> {conflicts.map(c => `dia ${parseInt(c.split("-")[2],10)}`).join(", ")}.
            Considere redistribuir para evitar saturação do algoritmo.
          </div>
        </div>
      )}

      <div className="card-elev p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-[10px] tracking-widest font-semibold text-center py-2" style={{ color: "#959693" }}>
              {w.toUpperCase()}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, i) => {
            const evs = day ? (eventsByDay[day] || []) : [];
            const hols = day ? (holidaysByDay[day] || []) : [];
            const isConflict = day && conflictSet.has(day);
            const isToday = day && year === today.getFullYear() && month === today.getMonth()+1 && day === today.getDate();
            return (
              <div key={i}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => drop(day)}
                className="min-h-[110px] p-1.5 rounded-lg border transition"
                style={{
                  background: !day ? "transparent" : (isToday ? "#FBF7EE" : "#fff"),
                  borderColor: isConflict ? "#F5C6C0" : (isToday ? "#A18133" : "#EFECE7"),
                }}>
                {day && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-semibold ${isToday ? "" : ""}`} style={{ color: isToday ? "#A18133" : "#231F20" }}>{day}</div>
                      {hols.length > 0 && <Sparkles size={10} style={{ color: "#A18133" }}/>}
                    </div>
                    {hols.map((h, hi) => (
                      <div key={hi} className="text-[9px] mt-1 truncate" style={{ color: "#A18133" }}>{h.title}</div>
                    ))}
                    <div className="mt-1 space-y-1">
                      {evs.slice(0, 3).map((e) => {
                        const client = clientById[e.client_id];
                        return (
                          <div key={e.id}
                            draggable
                            onDragStart={() => setDragged(e)}
                            onDragEnd={() => setDragged(null)}
                            data-testid={`cal-event-${e.id}`}
                            className="p-1.5 rounded text-[10px] cursor-move truncate leading-tight"
                            style={{
                              background: "#F7F5F2",
                              borderLeft: `3px solid ${STATUS_COLOR[e.status] || "#959693"}`,
                              color: "#231F20"
                            }}
                            title={`${e.title} · ${e.status}`}>
                            <div className="font-semibold truncate">{FORMAT_ICON[e.format] || "•"} {e.title}</div>
                            {client && <div className="text-[9px]" style={{ color: "#6F6F6C" }}>{client.trade_name}</div>}
                          </div>
                        );
                      })}
                      {evs.length > 3 && (
                        <div className="text-[9px] text-center" style={{ color: "#959693" }}>+{evs.length - 3} mais</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Legend/>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: "#6F6F6C" }}>
      <div className="flex items-center gap-1.5"><span className="pulse-dot"/> Hoje</div>
      <div className="flex items-center gap-1.5"><Sparkles size={12} style={{ color: "#A18133" }}/> Data comemorativa</div>
      <div className="flex items-center gap-1.5"><AlertTriangle size={12} style={{ color: "#9A2A1E" }}/> Conflito (&gt; 3 publicações)</div>
      <div className="flex items-center gap-1.5"><CalIcon size={12}/> Arraste um card para reagendar</div>
    </div>
  );
}
