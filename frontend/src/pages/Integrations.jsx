import { useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Instagram, Zap, CheckCircle2, XCircle, RefreshCw, ExternalLink, Copy } from "lucide-react";

export default function Integrations() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [connection, setConnection] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { http.get("/clients").then(r => { setClients(r.data); if (r.data[0]) setClientId(r.data[0].id); }); }, []);

  const load = useCallback(async () => {
    if (!clientId) return;
    const { data } = await http.get(`/meta/status/${clientId}`);
    setConnection(data);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  async function sync() {
    setSyncing(true);
    try {
      const { data } = await http.post(`/meta/sync/${clientId}`);
      toast.success(`Sincronizado — ${data.synced.followers.toLocaleString("pt-BR")} seguidores`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSyncing(false); }
  }

  async function disconnect() {
    if (!confirm("Desconectar a conta Meta deste cliente?")) return;
    await http.delete(`/meta/connect/${clientId}`);
    toast.success("Desconectado");
    load();
  }

  const connected = connection?.instagram_business_id;
  const client = clients.find(c => c.id === clientId);

  return (
    <div className="space-y-6" data-testid="integrations-page">
      <header>
        <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>INTEGRAÇÕES</div>
        <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Conexões dos clientes</h1>
        <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
          Conecte o Instagram Business de cada cliente para trazer métricas reais diretamente para os relatórios.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <Label className="text-[11px] uppercase tracking-wider shrink-0" style={{ color: "#6F6F6C" }}>Cliente</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger data-testid="int-client-select" className="w-72"><SelectValue/></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-elev p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: connected ? "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" : "#EFECE7" }}>
              <Instagram size={26} style={{ color: "#fff" }}/>
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Instagram Business</h3>
              <div className="text-sm mt-1" style={{ color: "#6F6F6C" }}>
                {connected ? (
                  <>Conectado como <b>{connection.meta_username || connection.page_name || connection.instagram_business_id}</b></>
                ) : "Nenhuma conta conectada para este cliente."}
              </div>
              {connection?.connected_at && (
                <div className="text-[11px] mt-1" style={{ color: "#959693" }}>
                  Conectado em {new Date(connection.connected_at).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <Button onClick={sync} disabled={syncing} data-testid="meta-sync-btn"
                  style={{ background: "#A18133", color: "#fff" }}>
                  <RefreshCw size={14} className={`mr-1 ${syncing ? "animate-spin" : ""}`}/>
                  {syncing ? "Sincronizando…" : "Sincronizar métricas"}
                </Button>
                <Button variant="outline" onClick={disconnect}>
                  <XCircle size={14} className="mr-1"/> Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={() => setConnectOpen(true)} data-testid="meta-connect-btn"
                style={{ background: "#231F20", color: "#fff" }}>
                <Zap size={14} className="mr-1"/> Conectar Meta
              </Button>
            )}
          </div>
        </div>

        {connected && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusChip label="Instagram Business" value={connection.instagram_business_id}/>
            {connection.page_id && <StatusChip label="Page ID" value={connection.page_id}/>}
            <StatusChip label="Fonte" value={connection.source === "meta_api" ? "OAuth Meta" : "Token manual"}/>
            <StatusChip label="Status" value="Ativo" ok/>
          </div>
        )}
      </div>

      <div className="card-elev p-6">
        <div className="text-xs tracking-[0.24em] mb-3" style={{ color: "#6F6F6C" }}>OUTRAS INTEGRAÇÕES</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {name: "Meta Ads", desc: "Anúncios do Facebook/Instagram"},
            {name: "Google Analytics 4", desc: "Comportamento do site"},
            {name: "Google Business Profile", desc: "Insights do perfil da empresa"},
            {name: "TikTok Business", desc: "Métricas da conta TikTok"},
            {name: "YouTube Analytics", desc: "Performance do canal"},
            {name: "Google Drive", desc: "Pasta compartilhada por cliente"},
          ].map(i => (
            <div key={i.name} className="p-4 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
              <div className="text-sm font-semibold" style={{ color: "#231F20" }}>{i.name}</div>
              <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{i.desc}</div>
              <div className="text-[10px] mt-2 tracking-wider inline-block px-2 py-0.5 rounded-full"
                style={{ background: "#EFECE7", color: "#6F6F6C" }}>EM BREVE</div>
            </div>
          ))}
        </div>
      </div>

      <ConnectMetaDialog open={connectOpen} setOpen={setConnectOpen} clientId={clientId} onConnected={load}/>
    </div>
  );
}

function StatusChip({ label, value, ok }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: "#F7F5F2" }}>
      <div className="text-[10px] tracking-wider" style={{ color: "#959693" }}>{label.toUpperCase()}</div>
      <div className="text-xs font-semibold mt-1 truncate flex items-center gap-1" style={{ color: "#231F20" }}>
        {ok && <CheckCircle2 size={12} style={{ color: "#1F6B3E" }}/>}
        {value}
      </div>
    </div>
  );
}

function ConnectMetaDialog({ open, setOpen, clientId, onConnected }) {
  const [token, setToken] = useState("");
  const [oauth, setOauth] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      http.get(`/meta/oauth-url`, { params: { client_id: clientId }}).then(r => setOauth(r.data));
    }
  }, [open, clientId]);

  async function connectManual() {
    if (!token.trim()) return toast.error("Cole o access token de longa duração");
    setBusy(true);
    try {
      await http.post("/meta/connect", { client_id: clientId, access_token: token.trim() });
      toast.success("Conta Meta conectada");
      setOpen(false); setToken("");
      onConnected();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-serif-display text-2xl">Conectar conta Meta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {oauth?.configured ? (
            <div className="p-4 rounded-lg" style={{ background: "#FBF7EE" }}>
              <div className="text-sm font-semibold" style={{ color: "#231F20" }}>OAuth configurado</div>
              <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>
                Clique no botão para autorizar a conta Meta do cliente.
              </div>
              <a href={oauth.url} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-semibold"
                style={{ background: "#231F20", color: "#fff" }}>
                <ExternalLink size={14}/> Autorizar no Meta
              </a>
            </div>
          ) : (
            <div className="p-3 rounded-lg text-xs" style={{ background: "#FBF7EE", color: "#806525" }}>
              <b>Modo Token Manual</b><br/>
              OAuth do Meta ainda não configurado no ambiente. Enquanto isso, cole abaixo um <b>access token de longa duração</b> gerado no <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline">Graph API Explorer</a> com as permissões: <code>instagram_basic</code>, <code>instagram_manage_insights</code>, <code>pages_show_list</code>, <code>pages_read_engagement</code>.
            </div>
          )}
          <div>
            <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Access Token</Label>
            <Textarea rows={4} value={token} onChange={e => setToken(e.target.value)} data-testid="meta-token-input"
              placeholder="EAAxxxxxxxxxxxx…" className="mt-1.5 font-mono text-xs"/>
            <div className="text-[10px] mt-1" style={{ color: "#959693" }}>O sistema descobre automaticamente sua conta Instagram Business após conectar.</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={connectManual} disabled={busy || !token.trim()} data-testid="meta-connect-submit"
            style={{ background: "#A18133", color: "#fff" }}>
            {busy ? "Conectando…" : "Conectar com token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
