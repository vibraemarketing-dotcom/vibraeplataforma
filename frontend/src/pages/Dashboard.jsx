import { useEffect, useState } from "react";
import { http, currency } from "@/lib/api";
import { TID } from "@/constants/testIds";
import { Users, TrendingUp, Target, ClipboardCheck, Sparkles, AlertCircle, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const KPI = ({ icon: Icon, label, value, hint, testId, accent }) => (
  <div className="card-elev p-6 fade-in" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[11px] tracking-[0.24em] font-medium" style={{ color: "#6F6F6C" }}>{label}</div>
        <div className="text-3xl font-bold mt-3" style={{ color: "#231F20" }}>{value}</div>
        {hint && <div className="text-xs mt-2" style={{ color: "#959693" }}>{hint}</div>}
      </div>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
           style={{ background: accent === "gold" ? "#F5EBD0" : "#EFECE7" }}>
        <Icon size={18} style={{ color: accent === "gold" ? "#A18133" : "#231F20" }} />
      </div>
    </div>
  </div>
);

const STATUS_LABEL = {
  ideia: "Ideia", em_producao: "Em produção", revisao_interna: "Revisão interna",
  revisao_compliance: "Compliance", aguardando_aprovacao: "Aguardando aprovação",
  ajuste_solicitado: "Ajuste solicitado", aprovado: "Aprovado",
  agendado: "Agendado", publicado: "Publicado", cancelado: "Cancelado"
};

const STAGE_LABEL = {
  novo_lead: "Novo lead", primeiro_contato: "1º Contato", follow_up: "Follow-up",
  qualificado: "Qualificado", reuniao_marcada: "Reunião", diagnostico: "Diagnóstico",
  proposta_producao: "Proposta produção", proposta_enviada: "Proposta enviada",
  negociacao: "Negociação", contrato_enviado: "Contrato", ganho: "Ganho", perdido: "Perdido"
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    http.get("/dashboard/summary").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando dashboard…</div>;
  const k = data.kpis;

  return (
    <div data-testid={TID.dashboard} className="space-y-8">
      <header>
        <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>PAINEL EXECUTIVO</div>
        <h1 className="font-serif-display text-4xl mt-2" style={{ color: "#231F20" }}>Bom dia, Ana.</h1>
        <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
          Visão geral da operação da Agência VIBRAE — atualizada agora.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPI icon={Users} label="CLIENTES ATIVOS" value={k.active_clients} hint={`${k.onboarding_clients} em onboarding · ${k.paused_clients} pausados`} testId={TID.kpiActive} accent="gold"/>
        <KPI icon={TrendingUp} label="MRR ESTIMADO" value={currency(k.mrr)} hint="Receita mensal recorrente" testId={TID.kpiMrr}/>
        <KPI icon={Target} label="LEADS EM ABERTO" value={k.leads_open} hint={`Pipeline · ${currency(k.pipeline_value)}`} testId={TID.kpiLeads}/>
        <KPI icon={ClipboardCheck} label="AGUARDANDO CLIENTE" value={k.contents_awaiting_approval} hint={`${k.contents_adjustments} ajustes solicitados`} testId={TID.kpiAwaiting} accent="gold"/>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elev p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>PRODUÇÃO</div>
              <h3 className="text-lg font-semibold mt-1">Conteúdos por status</h3>
            </div>
            <Sparkles size={16} style={{ color: "#A18133" }} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.content_by_status.map(c => ({ name: STATUS_LABEL[c.status] || c.status, count: c.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6F6F6C" }} interval={0} angle={-25} textAnchor="end" height={70}/>
              <YAxis tick={{ fontSize: 11, fill: "#6F6F6C" }} />
              <Tooltip cursor={{ fill: "#EFECE7" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E0DC" }}/>
              <Bar dataKey="count" fill="#A18133" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-elev p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>COMERCIAL</div>
              <h3 className="text-lg font-semibold mt-1">Leads por etapa</h3>
            </div>
            <Target size={16} style={{ color: "#A18133" }} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.leads_by_stage.map(l => ({ name: STAGE_LABEL[l.stage] || l.stage, count: l.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6F6F6C" }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: "#6F6F6C" }} />
              <Tooltip cursor={{ fill: "#EFECE7" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E0DC" }}/>
              <Bar dataKey="count" fill="#231F20" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Atividades */}
      <div className="card-elev p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>ATIVIDADES RECENTES</div>
            <h3 className="text-lg font-semibold mt-1">O que aconteceu na agência</h3>
          </div>
          <ArrowUpRight size={16} style={{ color: "#A18133" }}/>
        </div>
        <ul className="divide-y" style={{ borderColor: "#EFECE7" }}>
          {data.activities.length === 0 && (
            <li className="py-4 text-sm" style={{ color: "#959693" }}>Nenhuma atividade registrada ainda.</li>
          )}
          {data.activities.map((a) => (
            <li key={a.id} className="py-3 flex items-start gap-3">
              <span className="pulse-dot mt-2"/>
              <div className="flex-1">
                <div className="text-sm" style={{ color: "#231F20" }}>{a.text}</div>
                <div className="text-xs mt-0.5" style={{ color: "#959693" }}>
                  {a.user_name} · {new Date(a.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 rounded-lg border flex items-start gap-3"
           style={{ borderColor: "#E8DEC5", background: "#FBF7EE" }}>
        <AlertCircle size={18} style={{ color: "#A18133" }} className="mt-0.5"/>
        <div className="text-xs" style={{ color: "#6F6F6C" }}>
          <b>Fase 1 · MVP.</b> Módulos em breve: Financeiro, IA VIBRAE, Compliance saúde, Estratégia editorial,
          Stories/Roteiros, Gerador de artes, Integrações Meta/Google.
        </div>
      </div>
    </div>
  );
}
