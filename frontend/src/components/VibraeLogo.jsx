import React from "react";

// SVG wordmark inspirado na logo oficial (V estilizado com seta dourada + wordmark VIBRAE)
export default function VibraeLogo({ variant = "dark", size = 32 }) {
  // variant: 'dark' (fundo escuro → texto branco) | 'light' (fundo claro → texto preto)
  const text = variant === "dark" ? "#F7F5F2" : "#231F20";
  const sub = variant === "dark" ? "#959693" : "#6F6F6C";
  const gold = "#A18133";
  return (
    <div className="flex items-center gap-3 select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Block V com detalhe interno */}
        <path d="M6 6 L20 42 L34 6 L28 6 L20 30 L12 6 Z" fill={variant === "dark" ? "#F7F5F2" : "#231F20"} />
        {/* Dots dourados dentro do V */}
        <circle cx="15" cy="14" r="1.4" fill={gold} />
        <circle cx="17" cy="20" r="1.4" fill={gold} />
        {/* Seta dourada no topo direito */}
        <path d="M40 6 L46 6 L46 12 L44 12 L44 9.5 L34 20 L32.5 18.5 L42.5 8 L40 8 Z" fill={gold} />
      </svg>
      <div className="leading-tight">
        <div className="text-[10px] tracking-[0.28em] font-medium" style={{ color: sub }}>AGÊNCIA</div>
        <div className="text-[19px] font-bold tracking-[0.14em]" style={{ color: text }}>VIBRAE</div>
      </div>
    </div>
  );
}
