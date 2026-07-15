import { useEffect, useState, useCallback } from "react";
import { http, currency, formatApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, AlertTriangle, Wallet, Plus, Check, DollarSign, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const STATUS_STYLE = {
  pago: { label: "Pago", bg: "#E7F5EB", color: "#1F6B3E" },
  pendente: { label: "Pendente", bg: "#FBF7EE", color: "#806525" },
  previsto: { label: "Previsto", bg: "#EFECE7", color: "#6F6F6C" },
  vencido: { label: "Vencido", bg: "#FBE9E7", color: "#9A2A1E" },
  cancelado: { label: "Cancelado", bg: "#EFECE7", color: "#959693" },
};

export default function Financeiro() {
  const [summary, setSummary] = useState(null);
  const [tx, setTx] = useState([]);
  const [profit, setProfit] = useState([]);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    const [s, t, p] = await Promise.all([
      http.get("/financial/summary"),
      http.get("/financial/transactions"),
      http.get("/financial/profitability"),
    ]);
    setSummary(s.data); setTx(t.data); setProfit(p.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function markPaid(t) {
    if (!confirm(`Marcar "${t.description}" como pago?`)) return;
    try {
      await http.patch(`/financial/transactions/${t.id}`, { status: "pago" });
      toast.success("Baixa registrada");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  if (!summary) return <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando financeiro…</div>;

  return (
    <div className="space-y-6" data-testid="financeiro-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>FINANCEIRO</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Saúde financeira da agência</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>MRR, fluxo de caixa, inadimplência e rentabilidade por cliente — em tempo real.</p>
        </div>
        <NewTransactionDialog open={newOpen} setOpen={setNewOpen} onCreated={load}/>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <FinKpi icon={Wallet} label="MRR" value={currency(summary.mrr)} hint="Receita recorrente ativa" accent="gold"/>
        <FinKpi icon={TrendingUp} label="RECEITA DO MÊS" value={currency(summary.revenue_month)} hint={`Lucro estimado ${currency(summary.profit_month)}`}/>
        <FinKpi icon={TrendingDown} label="DESPESAS DO MÊS" value={currency(summary.expenses_month)} hint="Pagas neste ciclo"/>
        <FinKpi icon={AlertTriangle} label="INADIMPLÊNCIA" value={currency(summary.overdue_total)} hint={`${summary.overdue_count} cobrança(s) vencida(s)`} danger/>
      </div>

      <Tabs defaultValue="fluxo">
        <TabsList className="bg-transparent gap-2 p-0">
          <TabsTrigger value="fluxo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="transacoes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Transações</TabsTrigger>
          <TabsTrigger value="rentabilidade" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Rentabilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="mt-6">
          <Card className="card-elev border-none">
            <CardContent className="p-6">
              <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>RECEITA CONSOLIDADA</div>
              <h3 className="text-lg font-semibold mt-1 mb-6" style={{ color: "#231F20" }}>Últimos 6 meses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={summary.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7"/>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6F6F6C" }}/>
                  <YAxis tick={{ fontSize: 11, fill: "#6F6F6C" }} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v) => currency(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E2E0DC" }}/>
                  <Line type="monotone" dataKey="revenue" stroke="#A18133" strokeWidth={3} dot={{ fill: "#A18133", r: 5 }}/>
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transacoes" className="mt-6">
          <Card className="card-elev border-none">
            <CardContent className="p-0">
              <div className="divide-y" style={{ borderColor: "#EFECE7" }}>
                {tx.length === 0 && <div className="p-8 text-sm text-center" style={{ color: "#959693" }}>Nenhuma transação registrada.</div>}
                {tx.map(t => {
                  const st = STATUS_STYLE[t.status] || STATUS_STYLE.pendente;
                  return (
                    <div key={t.id} className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: t.type === "receita" ? "#F5EBD0" : "#EFECE7" }}>
                        {t.type === "receita" ? <TrendingUp size={16} style={{ color: "#A18133" }}/> : <TrendingDown size={16} style={{ color: "#231F20" }}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "#231F20" }}>{t.description}</div>
                        <div className="text-xs" style={{ color: "#959693" }}>
                          {t.category} · Vence {new Date(t.due_date).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold" style={{ color: t.type === "receita" ? "#231F20" : "#9A2A1E" }}>
                          {t.type === "despesa" ? "- " : ""}{currency(t.amount)}
                        </div>
                        <div className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block font-semibold tracking-wider"
                          style={{ background: st.bg, color: st.color }}>{st.label.toUpperCase()}</div>
                      </div>
                      {["pendente", "vencido"].includes(t.status) && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(t)}
                          data-testid={`mark-paid-${t.id}`}
                          className="ml-2 border-[#A18133] text-[#A18133] hover:bg-[#FBF7EE]">
                          <Check size={12} className="mr-1"/> Baixar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentabilidade" className="mt-6 space-y-4">
          <Card className="card-elev border-none">
            <CardContent className="p-6">
              <div className="text-xs tracking-[0.24em]" style={{ color: "#6F6F6C" }}>RENTABILIDADE POR CLIENTE</div>
              <h3 className="text-lg font-semibold mt-1 mb-6" style={{ color: "#231F20" }}>Receita acumulada e margem</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profit.map(p => {
                  const badge = {
                    muito_rentavel: { label: "Muito rentável", color: "#1F6B3E", bg: "#E7F5EB" },
                    rentavel: { label: "Rentável", color: "#806525", bg: "#F5EBD0" },
                    atencao: { label: "Atenção", color: "#9A6A00", bg: "#FBF3DE" },
                    prejuizo: { label: "Prejuízo", color: "#9A2A1E", bg: "#FBE9E7" },
                  }[p.rating];
                  return (
                    <div key={p.client_id} className="p-4 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: "#231F20" }}>{p.trade_name}</div>
                          <div className="text-[11px]" style={{ color: "#959693" }}>Mensalidade {currency(p.monthly_fee)}</div>
                        </div>
                        <div className="text-[10px] px-2 py-1 rounded-full font-semibold tracking-wider"
                          style={{ background: badge.bg, color: badge.color }}>{badge.label.toUpperCase()}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-[10px]" style={{ color: "#959693" }}>Receita</div>
                          <div className="font-semibold" style={{ color: "#231F20" }}>{currency(p.revenue)}</div>
                        </div>
                        <div>
                          <div className="text-[10px]" style={{ color: "#959693" }}>Lucro</div>
                          <div className="font-semibold" style={{ color: p.profit >= 0 ? "#1F6B3E" : "#9A2A1E" }}>{currency(p.profit)}</div>
                        </div>
                        <div>
                          <div className="text-[10px]" style={{ color: "#959693" }}>Margem</div>
                          <div className="font-semibold" style={{ color: "#A18133" }}>{p.margin}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FinKpi({ icon: Icon, label, value, hint, accent, danger }) {
  const bg = danger ? "#FBE9E7" : (accent === "gold" ? "#F5EBD0" : "#EFECE7");
  const color = danger ? "#9A2A1E" : (accent === "gold" ? "#A18133" : "#231F20");
  return (
    <div className="card-elev p-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] tracking-[0.24em] font-medium" style={{ color: "#6F6F6C" }}>{label}</div>
          <div className="text-2xl font-bold mt-3" style={{ color: "#231F20" }}>{value}</div>
          {hint && <div className="text-xs mt-2" style={{ color: "#959693" }}>{hint}</div>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon size={18} style={{ color }}/>
        </div>
      </div>
    </div>
  );
}

function NewTransactionDialog({ open, setOpen, onCreated }) {
  const [form, setForm] = useState({
    type: "receita", category: "Serviço avulso", description: "", amount: 0,
    due_date: new Date().toISOString().slice(0,10), status: "pendente", payment_method: "PIX", notes: ""
  });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await http.post("/financial/transactions", form);
      toast.success("Transação criada");
      setOpen(false); onCreated();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} data-testid="new-tx-btn" style={{ background: "#A18133", color: "#fff" }}>
        <Plus size={16} className="mr-1"/> Nova transação
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Nova transação</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Tipo</Label>
            <Select value={form.type} onValueChange={v=>setForm({...form, type: v})}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Categoria</Label>
            <Input value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="mt-1.5"/>
          </div>
          <div className="col-span-2">
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Descrição</Label>
            <Input required value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="mt-1.5"/>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Valor (R$)</Label>
            <Input required type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount: parseFloat(e.target.value)||0})} className="mt-1.5"/>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Vencimento</Label>
            <Input required type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} className="mt-1.5"/>
          </div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "#A18133", color: "#fff" }}>{busy ? "Salvando…" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
