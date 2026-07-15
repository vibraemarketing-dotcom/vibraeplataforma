import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, currency, waLink } from "@/lib/api";
import { TID } from "@/constants/testIds";
import { MessageCircle, ChevronRight, Users } from "lucide-react";

const STATUS = {
  ativo: { label: "Ativo", color: "#A18133" },
  onboarding: { label: "Onboarding", color: "#806525" },
  pausado: { label: "Pausado", color: "#959693" },
  encerrado: { label: "Encerrado", color: "#6F6F6C" },
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const navigate = useNavigate();
  useEffect(() => { http.get("/clients").then(r => setClients(r.data)); }, []);

  return (
    <div data-testid={TID.clientsPage} className="space-y-6">
      <header>
        <div className="text-xs tracking-[0.28em]" style={{ color: "#A18133" }}>CENTRAL DE CLIENTES</div>
        <h1 className="font-serif-display text-4xl mt-1" style={{ color: "#231F20" }}>Portfólio ativo</h1>
        <p className="text-sm mt-2" style={{ color: "#6F6F6C" }}>{clients.length} clientes cadastrados na Agência VIBRAE.</p>
      </header>

      {clients.length === 0 && (
        <div className="card-elev p-12 text-center">
          <Users size={40} className="mx-auto" style={{ color: "#A18133" }}/>
          <div className="text-sm mt-4" style={{ color: "#6F6F6C" }}>Nenhum cliente cadastrado. Converta um lead no CRM.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {clients.map((c) => {
          const st = STATUS[c.status] || STATUS.ativo;
          return (
            <div key={c.id} onClick={() => navigate(`/app/clientes/${c.id}`)} data-testid={`${TID.clientCard}-${c.id}`}
              className="card-elev p-6 hover:shadow-md transition group cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                     style={{ background: "#231F20", color: "#A18133" }}>
                  {c.trade_name.slice(0,2).toUpperCase()}
                </div>
                <div className="text-[10px] px-2 py-1 rounded-full tracking-wider font-semibold"
                     style={{ background: st.color+"20", color: st.color }}>
                  {st.label.toUpperCase()}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-base leading-tight" style={{ color: "#231F20" }}>{c.trade_name}</h3>
                <div className="text-xs mt-1" style={{ color: "#6F6F6C" }}>{c.profession} · {c.city}</div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: "#EFECE7" }}>
                <div>
                  <div className="text-[10px] tracking-wider" style={{ color: "#959693" }}>MENSALIDADE</div>
                  <div className="text-sm font-semibold" style={{ color: "#231F20" }}>{currency(c.monthly_fee)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {c.phone && (
                    <a href={waLink(c.phone)} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()}
                       className="p-2 rounded-md hover:bg-[#EFECE7]" title="WhatsApp">
                      <MessageCircle size={14} style={{ color: "#6F6F6C" }} />
                    </a>
                  )}
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition" style={{ color: "#A18133" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}