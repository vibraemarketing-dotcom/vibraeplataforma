import { useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TrendingUp, Users, Eye, Heart, Save, Plus, Download, Sparkles, MousePointerClick, MessageSquare } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function Relatorios() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [reports, setReports] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [openReport, setOpenReport] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => { http.get("/clients").then(r => { setClients(r.data); if (r.data[0]) setClientId(r.data[0].id); }); }, []);

  const load = useCallback(async () => {
    if (!clientId) return;
    const [r, m] = await Promise.all([
      http.get("/reports", { params: { client_id: clientId }}),
      http.get("/metrics", { params: { client_id: clientId }}),
    ]);
    setReports(r.data); setMetrics(m.data);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  async function openReportDetail(rid) {
    const { data } = await http.get(`/reports/${rid}`);
    setOpenReport(data);
  }

  const client = clients.find(c => c.id === clientId);
  const latestMetric = metrics[0];
  // série de métricas para gráfico
  const chartData = [...metrics].reverse().map(m => ({
    period: `${MONTHS[m.month-1].slice(0,3)}/${String(m.year).slice(2)}`,
    followers: m.followers, reach: m.reach, engagement: m.engagement,
  }));

  return (
    <div className="space-y-6" data-testid="relatorios-page">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>RELATÓRIOS DE INSTAGRAM</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Performance & Estratégia</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            Métricas mensais, destaques, aprendizados e próximos passos — prontos para apresentar ao cliente.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger data-testid="rep-client-select" className="w-56"><SelectValue/></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditorOpen(true)} data-testid="new-report-btn" style={{ background: "#A18133", color: "#fff" }}>
            <Plus size={16} className="mr-1"/> Novo relatório
          </Button>
        </div>
      </header>

      <div className="p-3 rounded-lg flex items-start gap-2 text-xs" style={{ background: "#FBF7EE", color: "#806525" }}>
        <Sparkles size={14} className="mt-0.5"/>
        <div>
          <b>Modo Demonstração</b> — dados de Instagram Insights não conectados. Insira os números manualmente ou conecte
          uma conta Meta na central de Integrações (em breve). Importação por CSV também disponível.
        </div>
      </div>

      {latestMetric ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricKpi icon={Users} label="SEGUIDORES" value={latestMetric.followers.toLocaleString("pt-BR")} delta={`+${latestMetric.followers_delta}`} accent="gold"/>
            <MetricKpi icon={Eye} label="ALCANCE" value={latestMetric.reach.toLocaleString("pt-BR")}/>
            <MetricKpi icon={TrendingUp} label="IMPRESSÕES" value={latestMetric.impressions.toLocaleString("pt-BR")}/>
            <MetricKpi icon={Heart} label="ENGAJAMENTO" value={`${latestMetric.engagement}%`} accent="gold"/>
            <MetricKpi icon={MousePointerClick} label="CLIQUES SITE" value={latestMetric.website_clicks}/>
            <MetricKpi icon={Save} label="SALVAMENTOS" value={latestMetric.saves}/>
          </div>

          {chartData.length > 1 && (
            <div className="card-elev p-6">
              <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>EVOLUÇÃO</div>
              <h3 className="text-lg font-semibold mt-1 mb-4" style={{ color: "#231F20" }}>Seguidores & Alcance</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7"/>
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6F6F6C" }}/>
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#6F6F6C" }}/>
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#6F6F6C" }}/>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E0DC" }}/>
                  <Line yAxisId="l" type="monotone" dataKey="followers" name="Seguidores" stroke="#231F20" strokeWidth={2} dot={{ fill: "#231F20", r: 4 }}/>
                  <Line yAxisId="r" type="monotone" dataKey="reach" name="Alcance" stroke="#A18133" strokeWidth={2} dot={{ fill: "#A18133", r: 4 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="card-elev p-8 text-center text-sm" style={{ color: "#6F6F6C" }}>
          Nenhuma métrica registrada para {client?.trade_name || "este cliente"}. Crie um relatório para adicionar métricas.
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3" style={{ color: "#231F20" }}>Relatórios mensais</h2>
        {reports.length === 0 && (
          <div className="card-elev p-8 text-center text-sm" style={{ color: "#6F6F6C" }}>
            Nenhum relatório publicado ainda.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map(r => (
            <button key={r.id} onClick={() => openReportDetail(r.id)} data-testid={`report-${r.id}`}
              className="card-elev p-5 text-left hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>{MONTHS[r.month-1].toUpperCase()} · {r.year}</div>
                <div className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider"
                  style={{ background: r.status === "publicado" ? "#E7F5EB" : "#EFECE7",
                           color: r.status === "publicado" ? "#1F6B3E" : "#6F6F6C" }}>
                  {(r.status || "rascunho").toUpperCase()}
                </div>
              </div>
              <div className="text-sm mt-3" style={{ color: "#231F20" }}>{r.summary?.slice(0, 140) || "Sem sumário"}…</div>
              <div className="text-[11px] mt-3" style={{ color: "#959693" }}>
                {r.highlights?.length || 0} destaques · {r.next_steps?.length || 0} próximos passos
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalhe do relatório */}
      <Dialog open={!!openReport} onOpenChange={v => !v && setOpenReport(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openReport && <ReportDetail report={openReport} client={client}/>}
        </DialogContent>
      </Dialog>

      {/* Editor */}
      <ReportEditor open={editorOpen} setOpen={setEditorOpen} clientId={clientId} onSaved={load}/>
    </div>
  );
}

function MetricKpi({ icon: Icon, label, value, delta, accent }) {
  return (
    <div className="card-elev p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.24em]" style={{ color: "#6F6F6C" }}>{label}</div>
          <div className="text-xl font-bold mt-2" style={{ color: "#231F20" }}>{value}</div>
          {delta && <div className="text-[11px] mt-1" style={{ color: "#1F6B3E" }}>{delta} vs mês ant.</div>}
        </div>
        <Icon size={16} style={{ color: accent === "gold" ? "#A18133" : "#6F6F6C" }}/>
      </div>
    </div>
  );
}

function ReportDetail({ report, client }) {
  const m = report.metrics;
  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>
          {client?.trade_name} · {MONTHS[report.month-1]} {report.year}
        </div>
        <DialogTitle className="font-serif-display text-3xl">Relatório mensal</DialogTitle>
      </DialogHeader>
      {m && (
        <div className="grid grid-cols-4 gap-3">
          <MetricKpi icon={Users} label="SEGUIDORES" value={m.followers?.toLocaleString("pt-BR")} accent="gold"/>
          <MetricKpi icon={Eye} label="ALCANCE" value={m.reach?.toLocaleString("pt-BR")}/>
          <MetricKpi icon={Heart} label="ENGAJAMENTO" value={`${m.engagement || 0}%`} accent="gold"/>
          <MetricKpi icon={MousePointerClick} label="CLIQUES" value={m.website_clicks}/>
        </div>
      )}

      <Section title="Resumo executivo">
        <p className="text-sm leading-relaxed" style={{ color: "#231F20" }}>{report.summary}</p>
      </Section>

      {report.highlights?.length > 0 && (
        <Section title="Destaques do mês">
          <ul className="space-y-2">
            {report.highlights.map((h, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <Sparkles size={14} className="mt-1 shrink-0" style={{ color: "#A18133" }}/>
                <span style={{ color: "#231F20" }}>{h}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.top_content?.length > 0 && (
        <Section title="Conteúdos de melhor desempenho">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.top_content.map(c => (
              <div key={c.id} className="p-3 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
                <div className="text-[10px] tracking-wider" style={{ color: "#A18133" }}>{c.format?.toUpperCase()}</div>
                <div className="text-sm font-semibold mt-1" style={{ color: "#231F20" }}>{c.title}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.learnings?.length > 0 && (
        <Section title="Aprendizados">
          <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "#231F20" }}>
            {report.learnings.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </Section>
      )}

      {report.next_steps?.length > 0 && (
        <Section title="Próximos passos">
          <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "#231F20" }}>
            {report.next_steps.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Section>
      )}

      {report.agency_notes && (
        <Section title="Notas da agência">
          <p className="text-sm" style={{ color: "#6F6F6C" }}>{report.agency_notes}</p>
        </Section>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Download size={14} className="mr-1"/> Imprimir / Exportar PDF
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs tracking-[0.24em] mb-2" style={{ color: "#A18133" }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function ReportEditor({ open, setOpen, clientId, onSaved }) {
  const today = new Date();
  const [form, setForm] = useState({
    month: today.getMonth() + 1, year: today.getFullYear(),
    summary: "", highlights: "", learnings: "", next_steps: "", risks: "", agency_notes: ""
  });
  const [metrics, setMetrics] = useState({
    followers: 0, followers_delta: 0, reach: 0, impressions: 0,
    engagement: 0, website_clicks: 0, saves: 0, shares: 0, comments: 0,
    stories_reach: 0, reels_views: 0, profile_visits: 0,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!clientId) return;
    setBusy(true);
    try {
      const arr = (s) => s.split("\n").map(l => l.trim()).filter(Boolean);
      await http.put("/metrics", { client_id: clientId, month: form.month, year: form.year, source: "manual", ...metrics });
      await http.put("/reports", {
        client_id: clientId, month: form.month, year: form.year,
        summary: form.summary,
        highlights: arr(form.highlights),
        learnings: arr(form.learnings),
        next_steps: arr(form.next_steps),
        risks: arr(form.risks),
        top_content_ids: [],
        agency_notes: form.agency_notes,
      });
      toast.success("Relatório salvo");
      setOpen(false); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Novo relatório mensal</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mês">
            <Select value={String(form.month)} onValueChange={v => setForm({...form, month: parseInt(v)})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Ano">
            <Input type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})}/>
          </Field>
        </div>

        <div className="text-xs tracking-[0.24em] mt-4 mb-2" style={{ color: "#A18133" }}>MÉTRICAS DO INSTAGRAM</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["followers", "Seguidores"], ["followers_delta", "Δ Seguidores"], ["reach", "Alcance"],
            ["impressions", "Impressões"], ["engagement", "Engajamento %"], ["website_clicks", "Cliques site"],
            ["saves", "Salvamentos"], ["shares", "Compart."], ["comments", "Comentários"],
            ["stories_reach", "Alcance Stories"], ["reels_views", "Views Reels"], ["profile_visits", "Visitas perfil"],
          ].map(([k, l]) => (
            <Field key={k} label={l}>
              <Input type="number" step="0.01" value={metrics[k]} onChange={e => setMetrics({...metrics, [k]: parseFloat(e.target.value) || 0})}/>
            </Field>
          ))}
        </div>

        <div className="space-y-3 mt-4">
          <Field label="Resumo executivo">
            <Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})}/>
          </Field>
          <Field label="Destaques (um por linha)">
            <Textarea rows={3} value={form.highlights} onChange={e => setForm({...form, highlights: e.target.value})}/>
          </Field>
          <Field label="Aprendizados">
            <Textarea rows={2} value={form.learnings} onChange={e => setForm({...form, learnings: e.target.value})}/>
          </Field>
          <Field label="Próximos passos">
            <Textarea rows={3} value={form.next_steps} onChange={e => setForm({...form, next_steps: e.target.value})}/>
          </Field>
          <Field label="Notas internas da agência">
            <Textarea rows={2} value={form.agency_notes} onChange={e => setForm({...form, agency_notes: e.target.value})}/>
          </Field>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy} style={{ background: "#A18133", color: "#fff" }}>
            {busy ? "Salvando…" : "Salvar relatório"}
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
