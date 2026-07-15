import { useState } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, AlertTriangle, CheckCircle2, XOctagon } from "lucide-react";
import { toast } from "sonner";

const RISK_STYLES = {
  baixo: { label: "Baixo risco", color: "#1F6B3E", bg: "#E7F5EB", icon: CheckCircle2 },
  atencao: { label: "Atenção", color: "#806525", bg: "#F5EBD0", icon: AlertTriangle },
  alto: { label: "Alto risco", color: "#9A2A1E", bg: "#FBE9E7", icon: AlertTriangle },
  bloqueado: { label: "Bloqueado — revisar", color: "#9A2A1E", bg: "#FBE9E7", icon: XOctagon },
};

const SEV_STYLES = {
  1: { color: "#806525", label: "Baixo" },
  2: { color: "#9A6A00", label: "Atenção" },
  3: { color: "#9A2A1E", label: "Alto" },
};

export default function CompliancePanel({ contentId, text, clientId, autoRun = false, onResult }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const body = contentId ? null : { text: text || "", client_id: clientId };
      const url = contentId ? `/content/${contentId}/compliance-check` : `/compliance/check`;
      const { data } = contentId
        ? await http.post(url)
        : await http.post(url, body);
      setResult(data);
      onResult?.(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  }

  const st = result ? RISK_STYLES[result.risk] || RISK_STYLES.baixo : null;
  const Icon = st?.icon || Shield;

  return (
    <div className="space-y-3">
      {!result && (
        <Button onClick={run} disabled={busy} variant="outline"
          data-testid="compliance-run-btn"
          className="w-full border-[#231F20] text-[#231F20]">
          <Shield size={14} className="mr-1"/> {busy ? "Analisando…" : "Rodar checagem de compliance"}
        </Button>
      )}

      {result && (
        <div className="fade-in" data-testid="compliance-result">
          <div className="p-3 rounded-lg flex items-start gap-3" style={{ background: st.bg }}>
            <Icon size={18} style={{ color: st.color }} className="mt-0.5"/>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: st.color }}>{st.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "#6F6F6C" }}>
                {result.findings.length} apontamento(s) · pontuação {result.score}
                {result.council && ` · Conselho ${result.council.toUpperCase()}`}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={run} className="text-xs">Re-analisar</Button>
          </div>

          {result.findings.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.findings.map((f, i) => {
                const sev = SEV_STYLES[f.severity];
                return (
                  <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "#E2E0DC" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] tracking-wider font-semibold" style={{ color: sev.color }}>
                        {sev.label.toUpperCase()} · {f.rule}
                      </div>
                      <div className="text-[10px]" style={{ color: "#959693" }}>{f.council}</div>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#231F20" }}>&ldquo;{f.snippet}&rdquo;</div>
                    <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}><b>Sugestão:</b> {f.suggestion}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-[10px] mt-3 p-2 rounded" style={{ background: "#EFECE7", color: "#6F6F6C" }}>
            {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
