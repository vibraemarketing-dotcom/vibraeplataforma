import { useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Copy, Wand2, MessageSquare, Film, LayoutList, Lightbulb, Hash, Check } from "lucide-react";
import { toast } from "sonner";

const TOOLS = [
  { key: "caption", label: "Legenda", icon: MessageSquare, hint: "Legenda pronta para Instagram" },
  { key: "reels_script", label: "Roteiro de Reels", icon: Film, hint: "Roteiro com cenas e CTA" },
  { key: "ideas", label: "Ideias de conteúdo", icon: Lightbulb, hint: "6 ideias diversas nos pilares" },
  { key: "carousel", label: "Carrossel", icon: LayoutList, hint: "5-7 slides educativos" },
  { key: "hashtags", label: "Hashtags", icon: Hash, hint: "15 hashtags estratégicas" },
];

export default function AIStudio() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [brandKit, setBrandKit] = useState(null);
  const [tool, setTool] = useState("caption");
  const [objective, setObjective] = useState("");
  const [orientation, setOrientation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    http.get("/clients").then(r => {
      setClients(r.data);
      if (r.data.length > 0) setClientId(r.data[0].id);
    });
  }, []);

  const loadBrandKit = useCallback(async () => {
    if (!clientId) return;
    const { data } = await http.get(`/clients/${clientId}/brand-kit`);
    setBrandKit(data);
  }, [clientId]);
  useEffect(() => { loadBrandKit(); }, [loadBrandKit]);

  async function generate() {
    if (!clientId || !tool) return;
    setBusy(true); setResult(null);
    try {
      const { data } = await http.post("/ai/generate", {
        client_id: clientId, tool, objective, orientation, content_format: ""
      });
      setResult(data);
      toast.success("Conteúdo gerado pela IA VIBRAE");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  }

  const client = clients.find(c => c.id === clientId);

  return (
    <div className="space-y-6" data-testid="ai-studio-page">
      <header>
        <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>IA VIBRAE · MÉTODO VIBRAE</div>
        <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>
          A inteligência artificial da <em style={{ color: "#A18133" }}>sua agência</em>.
        </h1>
        <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
          Cada geração respeita o Brand Kit do cliente — tom de voz, pilares, público, palavras proibidas.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Painel de configuração */}
        <div className="space-y-5">
          <Card className="card-elev border-none">
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger data-testid="ai-client-select" className="mt-1.5"><SelectValue placeholder="Selecione…"/></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider mb-2 block" style={{ color: "#6F6F6C" }}>Ferramenta</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TOOLS.map(t => {
                    const Icon = t.icon;
                    const active = tool === t.key;
                    return (
                      <button key={t.key} onClick={() => setTool(t.key)}
                        data-testid={`ai-tool-${t.key}`}
                        className={`p-3 rounded-lg border text-left transition ${active ? "" : "hover:bg-[#EFECE7]"}`}
                        style={{
                          borderColor: active ? "#A18133" : "#E2E0DC",
                          background: active ? "#FBF7EE" : "#fff",
                        }}>
                        <Icon size={16} style={{ color: active ? "#A18133" : "#6F6F6C" }}/>
                        <div className="text-xs font-semibold mt-1.5" style={{ color: "#231F20" }}>{t.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Objetivo</Label>
                <Input value={objective} onChange={e=>setObjective(e.target.value)} data-testid="ai-objective"
                  placeholder="Ex: Autoridade em cuidado facial" className="mt-1.5"/>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Orientação extra</Label>
                <Textarea rows={4} value={orientation} onChange={e=>setOrientation(e.target.value)} data-testid="ai-orientation"
                  placeholder="Detalhes específicos, ângulo, referências…" className="mt-1.5"/>
              </div>
              <Button onClick={generate} disabled={busy || !clientId} data-testid="ai-generate-btn"
                className="w-full h-11" style={{ background: "#A18133", color: "#fff" }}>
                {busy ? "Gerando…" : (<><Wand2 size={16} className="mr-2"/> Gerar com IA VIBRAE</>)}
              </Button>
            </CardContent>
          </Card>

          {/* Brand Kit preview */}
          {brandKit && brandKit.tone_of_voice && (
            <Card className="card-elev border-none">
              <CardContent className="p-5">
                <div className="text-[11px] tracking-[0.24em] mb-3" style={{ color: "#A18133" }}>BRAND KIT ATIVO</div>
                <div className="space-y-2 text-xs">
                  <BKItem label="Tom">{brandKit.tone_of_voice}</BKItem>
                  <BKItem label="Público">{brandKit.audience}</BKItem>
                  <BKItem label="Conselho">{(brandKit.council || "—").toUpperCase()} {brandKit.council_number}</BKItem>
                  {Array.isArray(brandKit.pillars) && brandKit.pillars.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#959693" }}>Pilares</div>
                      <div className="flex flex-wrap gap-1">
                        {brandKit.pillars.map((p, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: "#F5EBD0", color: "#806525" }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resultado */}
        <div className="min-h-[400px]">
          {!result && !busy && (
            <div className="card-elev p-12 h-full flex flex-col items-center justify-center text-center">
              <Sparkles size={40} style={{ color: "#A18133" }}/>
              <div className="text-base font-medium mt-4" style={{ color: "#231F20" }}>Pronto quando você estiver</div>
              <div className="text-sm mt-1 max-w-md" style={{ color: "#6F6F6C" }}>
                Selecione a ferramenta, descreva seu objetivo e clique em <b>Gerar com IA VIBRAE</b>. O resultado respeitará o Brand Kit e as normas do conselho profissional.
              </div>
            </div>
          )}
          {busy && (
            <div className="card-elev p-12 h-full flex flex-col items-center justify-center text-center">
              <div className="pulse-dot" style={{ width: 16, height: 16 }}/>
              <div className="text-base font-medium mt-4" style={{ color: "#231F20" }}>A IA VIBRAE está criando…</div>
              <div className="text-sm mt-1" style={{ color: "#6F6F6C" }}>Consultando Brand Kit e normas do conselho.</div>
            </div>
          )}
          {result && <ResultView result={result} client={client}/>}
        </div>
      </div>
    </div>
  );
}

function BKItem({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "#959693" }}>{label}</div>
      <div style={{ color: "#231F20" }}>{children || "—"}</div>
    </div>
  );
}

function ResultView({ result, client }) {
  const d = result.data || {};
  function copy(text) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  return (
    <div className="space-y-4 fade-in" data-testid="ai-result">
      <div className="card-elev p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] tracking-[0.24em]" style={{ color: "#A18133" }}>RESULTADO</div>
            <h2 className="text-lg font-semibold mt-1" style={{ color: "#231F20" }}>{result.label}</h2>
          </div>
          <Check size={20} style={{ color: "#A18133" }}/>
        </div>

        {/* Caption */}
        {result.tool === "caption" && d.caption && (
          <div className="space-y-3">
            <Section label="Gancho" text={d.hook} onCopy={copy}/>
            <Section label="Legenda" text={d.caption} multiline onCopy={copy}/>
            <Section label="CTA" text={d.cta} onCopy={copy}/>
            <Section label="Hashtags" text={d.hashtags} onCopy={copy} accent/>
          </div>
        )}

        {/* Reels script */}
        {result.tool === "reels_script" && d.hook && (
          <div className="space-y-3">
            <Section label="Gancho (0-3s)" text={d.hook} onCopy={copy}/>
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#959693" }}>Cenas ({d.duration_seconds}s)</div>
              <div className="space-y-2">
                {(d.scenes || []).map((s, i) => (
                  <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
                    <div className="text-[10px] font-semibold" style={{ color: "#A18133" }}>CENA {i+1} · {s.time}</div>
                    <div className="text-sm mt-1" style={{ color: "#231F20" }}><b>Fala:</b> {s.voiceover}</div>
                    <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}><b>Ação:</b> {s.action}</div>
                    {s.on_screen && <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}><b>Texto na tela:</b> {s.on_screen}</div>}
                  </div>
                ))}
              </div>
            </div>
            <Section label="CTA" text={d.cta} onCopy={copy}/>
            {d.caption_suggestion && <Section label="Legenda sugerida" text={d.caption_suggestion} multiline onCopy={copy}/>}
          </div>
        )}

        {/* Ideas */}
        {result.tool === "ideas" && Array.isArray(d.ideas) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {d.ideas.map((it, i) => (
              <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#A18133" }}>{it.format} · {it.pillar}</div>
                <div className="text-sm font-semibold mt-1" style={{ color: "#231F20" }}>{it.title}</div>
                <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}><b>Gancho:</b> {it.hook}</div>
                <div className="text-xs mt-0.5" style={{ color: "#6F6F6C" }}><b>Objetivo:</b> {it.objective}</div>
              </div>
            ))}
          </div>
        )}

        {/* Carousel */}
        {result.tool === "carousel" && Array.isArray(d.slides) && (
          <div className="space-y-2">
            {d.slides.map((s, i) => (
              <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
                <div className="text-[10px] font-semibold" style={{ color: "#A18133" }}>SLIDE {s.index || i+1}</div>
                <div className="text-sm font-semibold mt-1" style={{ color: "#231F20" }}>{s.title}</div>
                <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{s.body}</div>
              </div>
            ))}
            {d.caption_suggestion && <Section label="Legenda sugerida" text={d.caption_suggestion} multiline onCopy={copy}/>}
          </div>
        )}

        {/* Hashtags */}
        {result.tool === "hashtags" && (
          <div className="space-y-3">
            {["broad", "niche", "local"].map(k => (
              d[k] && (
                <div key={k}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#959693" }}>{k === "broad" ? "Amplas" : k === "niche" ? "Nicho" : "Locais"}</div>
                  <div className="text-xs" style={{ color: "#A18133" }}>{(d[k] || []).join(" ")}</div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Raw fallback */}
        {!result.data && (
          <pre className="text-xs p-3 rounded-lg overflow-auto max-h-96" style={{ background: "#EFECE7", color: "#231F20" }}>{result.raw}</pre>
        )}
      </div>

      <div className="text-[11px] p-3 rounded-lg" style={{ background: "#FBF7EE", color: "#6F6F6C" }}>
        ✨ Gerado com base no Brand Kit de <b>{client?.trade_name}</b>. Sempre revise antes de publicar — a IA VIBRAE não substitui aprovação humana ou de compliance.
      </div>
    </div>
  );
}

function Section({ label, text, multiline, onCopy, accent }) {
  if (!text) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "#959693" }}>{label}</div>
        <button onClick={() => onCopy(text)} className="text-[10px] flex items-center gap-1 hover:opacity-70" style={{ color: "#A18133" }}>
          <Copy size={11}/> copiar
        </button>
      </div>
      <div className={multiline ? "p-3 rounded-lg text-sm whitespace-pre-wrap" : "text-sm"}
        style={multiline ? { background: "#FBF7EE", color: "#231F20" } : { color: accent ? "#A18133" : "#231F20" }}>
        {text}
      </div>
    </div>
  );
}
