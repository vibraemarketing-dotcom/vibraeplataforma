import { useEffect, useRef, useState, useCallback } from "react";
import { http } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Layers, Palette, Type, Trash2, Move, Plus, Instagram } from "lucide-react";
import { toPng } from "html-to-image";

const CANVAS_FORMATS = {
  story:      { label: "Story", w: 1080, h: 1920, ratio: "9/16" },
  feed:       { label: "Feed",  w: 1080, h: 1350, ratio: "4/5" },
  square:     { label: "Quadrado", w: 1080, h: 1080, ratio: "1/1" },
  reels:      { label: "Capa Reels", w: 1080, h: 1920, ratio: "9/16" },
};

const FONTS = ["Montserrat", "Cormorant Garamond", "Georgia", "Helvetica", "Playfair Display"];

const uid = () => Math.random().toString(36).slice(2, 9);

export default function ArtEditor() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [brandKit, setBrandKit] = useState(null);
  const [format, setFormat] = useState("story");
  const [bg, setBg] = useState("#231F20");
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => { http.get("/clients").then(r => { setClients(r.data); if (r.data[0]) setClientId(r.data[0].id); }); }, []);

  const loadBrandKit = useCallback(async () => {
    if (!clientId) return;
    const { data } = await http.get(`/clients/${clientId}/brand-kit`);
    setBrandKit(data);
    // Aplica cor de fundo do brand kit
    if (data.color_primary) setBg(data.color_primary);
  }, [clientId]);
  useEffect(() => { loadBrandKit(); }, [loadBrandKit]);

  const fmt = CANVAS_FORMATS[format];
  const selected = layers.find(l => l.id === selectedId);

  function addText() {
    const id = uid();
    setLayers([...layers, {
      id, type: "text", text: "Toque duplo para editar",
      x: 15, y: 40, w: 70, fontSize: 48, color: brandKit?.color_secondary || "#F7F5F2",
      fontFamily: "Montserrat", fontWeight: 700, textAlign: "center",
    }]);
    setSelectedId(id);
  }

  function addLogo() {
    const id = uid();
    setLayers([...layers, {
      id, type: "logo", x: 8, y: 8, w: 25,
      brand: brandKit?.color_primary || "#A18133",
    }]);
    setSelectedId(id);
  }

  function updateLayer(id, patch) {
    setLayers(ls => ls.map(l => l.id === id ? {...l, ...patch} : l));
  }

  function removeLayer(id) {
    setLayers(ls => ls.filter(l => l.id !== id));
    setSelectedId(null);
  }

  async function exportPng() {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
      });
      const link = document.createElement("a");
      link.download = `vibrae-${format}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Arte exportada em alta resolução");
    } catch (e) {
      toast.error("Falha ao exportar: " + e.message);
    }
  }

  function applyBrandColors() {
    if (brandKit?.color_primary) setBg(brandKit.color_primary);
  }

  const client = clients.find(c => c.id === clientId);

  return (
    <div className="space-y-6" data-testid="art-editor-page">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>GERADOR DE ARTES</div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Editor visual VIBRAE</h1>
          <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>
            {client?.trade_name} · Formato {fmt.label} · Brand Kit aplicado automaticamente
          </p>
        </div>
        <Button onClick={exportPng} data-testid="art-export-btn" style={{ background: "#A18133", color: "#fff" }}>
          <Download size={16} className="mr-2"/> Exportar PNG
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6">
        {/* Painel esquerdo: setup */}
        <div className="space-y-4">
          <div className="card-elev p-4 space-y-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger data-testid="art-client-select" className="mt-1.5"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Formato</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger data-testid="art-format-select" className="mt-1.5"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {Object.entries(CANVAS_FORMATS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} · {v.w}×{v.h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>Fundo</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-10 h-10 rounded border" style={{ background: bg, borderColor: "#D8D7D3" }}/>
                <Input value={bg} onChange={e => setBg(e.target.value)} className="h-9"/>
              </div>
            </div>
            <Button onClick={applyBrandColors} variant="outline" className="w-full">
              <Palette size={14} className="mr-1"/> Aplicar cores da marca
            </Button>
          </div>

          <div className="card-elev p-4">
            <div className="text-xs tracking-[0.24em] mb-3" style={{ color: "#6F6F6C" }}>ADICIONAR</div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={addText} variant="outline" data-testid="art-add-text">
                <Type size={14} className="mr-1"/> Texto
              </Button>
              <Button onClick={addLogo} variant="outline" data-testid="art-add-logo">
                <Layers size={14} className="mr-1"/> Logo VIBRAE
              </Button>
            </div>
          </div>

          {brandKit && (
            <div className="card-elev p-4">
              <div className="text-xs tracking-[0.24em] mb-2" style={{ color: "#A18133" }}>BRAND KIT</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded border" style={{ background: brandKit.color_primary || "#EFECE7", borderColor: "#D8D7D3" }}/>
                <div className="w-6 h-6 rounded border" style={{ background: brandKit.color_secondary || "#EFECE7", borderColor: "#D8D7D3" }}/>
                <div style={{ color: "#6F6F6C" }}>Cliques em elementos para editar</div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas central */}
        <div className="flex justify-center">
          <div className="relative shadow-2xl" style={{ aspectRatio: fmt.ratio, width: format === "story" || format === "reels" ? "min(360px, 100%)" : "min(480px, 100%)" }}>
            <div
              ref={canvasRef}
              className="w-full h-full relative overflow-hidden"
              style={{ background: bg }}
              onClick={() => setSelectedId(null)}
            >
              {layers.map(layer => (
                <LayerNode key={layer.id} layer={layer}
                  selected={layer.id === selectedId}
                  onSelect={() => setSelectedId(layer.id)}
                  onChange={(patch) => updateLayer(layer.id, patch)}
                  brandKit={brandKit}
                />
              ))}
              {layers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-center px-8"
                  style={{ color: "rgba(255,255,255,0.5)" }}>
                  <div>
                    <Instagram size={32} className="mx-auto mb-3 opacity-40"/>
                    <div className="text-sm">Adicione texto ou logo pelo painel</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel direito: propriedades da camada */}
        <div className="space-y-4">
          {!selected && (
            <div className="card-elev p-6 text-center">
              <Move size={24} className="mx-auto" style={{ color: "#A18133" }}/>
              <div className="text-sm mt-3" style={{ color: "#6F6F6C" }}>
                Clique em um elemento no canvas para editá-lo.
              </div>
            </div>
          )}
          {selected && (
            <div className="card-elev p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>{selected.type === "text" ? "TEXTO" : "LOGO"}</div>
                <button onClick={() => removeLayer(selected.id)} className="p-1 rounded hover:bg-[#FBE9E7]" title="Remover">
                  <Trash2 size={14} style={{ color: "#9A2A1E" }}/>
                </button>
              </div>
              {selected.type === "text" && (
                <>
                  <Field label="Texto">
                    <Textarea rows={3} value={selected.text} onChange={e => updateLayer(selected.id, { text: e.target.value })}/>
                  </Field>
                  <Field label="Fonte">
                    <Select value={selected.fontFamily} onValueChange={v => updateLayer(selected.id, { fontFamily: v })}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tamanho">
                      <Input type="number" value={selected.fontSize} onChange={e => updateLayer(selected.id, { fontSize: parseInt(e.target.value) || 16 })}/>
                    </Field>
                    <Field label="Peso">
                      <Select value={String(selected.fontWeight)} onValueChange={v => updateLayer(selected.id, { fontWeight: parseInt(v) })}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {[300,400,500,600,700,800].map(w => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Cor do texto">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded border" style={{ background: selected.color, borderColor: "#D8D7D3" }}/>
                      <Input value={selected.color} onChange={e => updateLayer(selected.id, { color: e.target.value })}/>
                    </div>
                  </Field>
                  <Field label="Alinhamento">
                    <Select value={selected.textAlign} onValueChange={v => updateLayer(selected.id, { textAlign: v })}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {["left","center","right"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="X (%)">
                  <Input type="number" value={selected.x} onChange={e => updateLayer(selected.id, { x: parseFloat(e.target.value) || 0 })}/>
                </Field>
                <Field label="Y (%)">
                  <Input type="number" value={selected.y} onChange={e => updateLayer(selected.id, { y: parseFloat(e.target.value) || 0 })}/>
                </Field>
              </div>
              <Field label="Largura (%)">
                <Input type="number" value={selected.w} onChange={e => updateLayer(selected.id, { w: parseFloat(e.target.value) || 20 })}/>
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LayerNode({ layer, selected, onSelect, onChange, brandKit }) {
  const startDrag = (e) => {
    e.stopPropagation();
    onSelect();
    if (e.detail === 2) return; // deixa double-click passar
    const startX = e.clientX; const startY = e.clientY;
    const initX = layer.x; const initY = layer.y;
    const parent = e.currentTarget.parentElement.getBoundingClientRect();
    const move = (ev) => {
      const dx = ((ev.clientX - startX) / parent.width) * 100;
      const dy = ((ev.clientY - startY) / parent.height) * 100;
      onChange({ x: Math.max(0, Math.min(95, initX + dx)), y: Math.max(0, Math.min(95, initY + dy)) });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const style = {
    position: "absolute", left: `${layer.x}%`, top: `${layer.y}%`,
    width: `${layer.w}%`, cursor: "move",
    outline: selected ? "2px solid #A18133" : "none",
    outlineOffset: 2,
  };

  if (layer.type === "text") {
    return (
      <div style={style} onMouseDown={startDrag}>
        <div style={{
          fontFamily: layer.fontFamily, fontSize: layer.fontSize / 3, // scale down for preview
          fontWeight: layer.fontWeight, color: layer.color, textAlign: layer.textAlign,
          lineHeight: 1.15,
          padding: 4,
          userSelect: "none",
        }}>
          {layer.text}
        </div>
      </div>
    );
  }
  if (layer.type === "logo") {
    return (
      <div style={style} onMouseDown={startDrag}>
        <div className="flex items-center gap-2">
          <svg width="100%" height="auto" viewBox="0 0 48 48" style={{ maxWidth: 40 }}>
            <path d="M6 6 L20 42 L34 6 L28 6 L20 30 L12 6 Z" fill={layer.brand}/>
            <path d="M40 6 L46 6 L46 12 L44 12 L44 9.5 L34 20 L32.5 18.5 L42.5 8 L40 8 Z" fill={brandKit?.color_secondary || "#A18133"}/>
          </svg>
          <div className="text-[8px] tracking-[0.2em]" style={{ color: layer.brand }}>VIBRAE</div>
        </div>
      </div>
    );
  }
  return null;
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
