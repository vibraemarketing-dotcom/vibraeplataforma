import { useEffect, useState, useCallback } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Palette } from "lucide-react";

const COUNCILS = [
  { value: "none", label: "Sem conselho" },
  { value: "cfm", label: "CFM · Médico" },
  { value: "cro", label: "CRO · Odontologia" },
  { value: "crn", label: "CRN · Nutrição" },
  { value: "cfbm", label: "CFBM · Biomedicina" },
  { value: "coffito", label: "COFFITO · Fisioterapia" },
  { value: "cofen", label: "COFEN · Enfermagem" },
  { value: "cfp", label: "CFP · Psicologia" },
  { value: "cff", label: "CFF · Farmácia" },
  { value: "estetica", label: "Biomédica esteta" },
];

export default function BrandKitEditor({ clientId }) {
  const [bk, setBk] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get(`/clients/${clientId}/brand-kit`);
    // normaliza arrays
    const norm = { ...data };
    for (const k of ["pillars", "allowed_words", "forbidden_words", "ctas"]) {
      if (!Array.isArray(norm[k])) norm[k] = [];
    }
    setBk(norm);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true);
    try {
      await http.put(`/clients/${clientId}/brand-kit`, {
        tone_of_voice: bk.tone_of_voice || "",
        audience: bk.audience || "",
        persona: bk.persona || "",
        pillars: strToArr(bk.pillars),
        allowed_words: strToArr(bk.allowed_words),
        forbidden_words: strToArr(bk.forbidden_words),
        ctas: strToArr(bk.ctas),
        hashtags: bk.hashtags || "",
        color_primary: bk.color_primary || "",
        color_secondary: bk.color_secondary || "",
        references: bk.references || "",
        council: bk.council || "none",
        council_number: bk.council_number || "",
        responsible_technician: bk.responsible_technician || "",
        archetype: bk.archetype || "",
      });
      toast.success("Brand Kit salvo");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  function strToArr(v) {
    if (Array.isArray(v)) return v;
    if (!v) return [];
    return String(v).split(",").map(s => s.trim()).filter(Boolean);
  }

  if (!bk) return <div className="text-sm" style={{ color: "#6F6F6C" }}>Carregando Brand Kit…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-testid="brand-kit-editor">
      <div className="card-elev p-5 space-y-4">
        <div>
          <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>IDENTIDADE</div>
          <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Voz e persona</h3>
        </div>
        <Field label="Tom de voz">
          <Input value={bk.tone_of_voice || ""} onChange={e => setBk({...bk, tone_of_voice: e.target.value})}/>
        </Field>
        <Field label="Público-alvo">
          <Input value={bk.audience || ""} onChange={e => setBk({...bk, audience: e.target.value})}/>
        </Field>
        <Field label="Persona">
          <Textarea rows={3} value={bk.persona || ""} onChange={e => setBk({...bk, persona: e.target.value})}/>
        </Field>
        <Field label="Arquétipo">
          <Input value={bk.archetype || ""} onChange={e => setBk({...bk, archetype: e.target.value})}
            placeholder="Ex: Cuidadora, Sábio, Guia"/>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cor primária">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg border" style={{ background: bk.color_primary || "#EFECE7", borderColor: "#D8D7D3" }}/>
              <Input value={bk.color_primary || ""} onChange={e => setBk({...bk, color_primary: e.target.value})} placeholder="#A18133"/>
            </div>
          </Field>
          <Field label="Cor secundária">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg border" style={{ background: bk.color_secondary || "#EFECE7", borderColor: "#D8D7D3" }}/>
              <Input value={bk.color_secondary || ""} onChange={e => setBk({...bk, color_secondary: e.target.value})} placeholder="#231F20"/>
            </div>
          </Field>
        </div>
      </div>

      <div className="card-elev p-5 space-y-4">
        <div>
          <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>CONTEÚDO</div>
          <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Pilares e regras</h3>
        </div>
        <Field label="Pilares (separe por vírgula)">
          <Input value={Array.isArray(bk.pillars) ? bk.pillars.join(", ") : bk.pillars || ""}
            onChange={e => setBk({...bk, pillars: e.target.value})}/>
        </Field>
        <Field label="Palavras preferidas">
          <Input value={Array.isArray(bk.allowed_words) ? bk.allowed_words.join(", ") : bk.allowed_words || ""}
            onChange={e => setBk({...bk, allowed_words: e.target.value})}/>
        </Field>
        <Field label="Palavras proibidas">
          <Input value={Array.isArray(bk.forbidden_words) ? bk.forbidden_words.join(", ") : bk.forbidden_words || ""}
            onChange={e => setBk({...bk, forbidden_words: e.target.value})}/>
        </Field>
        <Field label="CTAs padrão">
          <Input value={Array.isArray(bk.ctas) ? bk.ctas.join(", ") : bk.ctas || ""}
            onChange={e => setBk({...bk, ctas: e.target.value})}/>
        </Field>
        <Field label="Hashtags padrão">
          <Input value={bk.hashtags || ""} onChange={e => setBk({...bk, hashtags: e.target.value})}/>
        </Field>
      </div>

      <div className="card-elev p-5 space-y-4 lg:col-span-2">
        <div>
          <div className="text-xs tracking-[0.24em]" style={{ color: "#A18133" }}>COMPLIANCE</div>
          <h3 className="text-lg font-semibold" style={{ color: "#231F20" }}>Conselho profissional</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Conselho">
            <Select value={bk.council || "none"} onValueChange={v => setBk({...bk, council: v})}>
              <SelectTrigger data-testid="brandkit-council-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {COUNCILS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Registro (nº)">
            <Input value={bk.council_number || ""} onChange={e => setBk({...bk, council_number: e.target.value})} placeholder="CRM-SP 12345 · RQE 1234"/>
          </Field>
          <Field label="Responsável técnico">
            <Input value={bk.responsible_technician || ""} onChange={e => setBk({...bk, responsible_technician: e.target.value})}/>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy} data-testid="brandkit-save-btn"
            style={{ background: "#A18133", color: "#fff" }}>
            <Save size={14} className="mr-1"/> {busy ? "Salvando…" : "Salvar Brand Kit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wider" style={{ color: "#6F6F6C" }}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
