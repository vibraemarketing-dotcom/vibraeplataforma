"""Compliance para profissionais da saúde.
Regras baseadas em publicidade médica de conselhos brasileiros.
Análise automatizada de apoio — não substitui avaliação humana ou jurídica."""
import re
from typing import Optional

# severidade: 3 = alto/bloqueio, 2 = atenção, 1 = baixo
UNIVERSAL_RULES = [
    # Promessas / garantias
    (r"\b(garantid[oa]s?)\b", 3, "Promessa/Garantia", "Evite termos como 'garantido' — todos os conselhos proíbem promessas."),
    (r"\b(resultado\s+garantido|100%\s+eficaz|resultado\s+certo)\b", 3, "Promessa absoluta", "Substitua por linguagem probabilística."),
    (r"\b(cura\s+definitiva|cura\s+garantida)\b", 3, "Promessa de cura", "Termos absolutos são vedados."),
    # Superlativos
    (r"\b(o\s+melhor|a\s+melhor|melhor\s+m[eé]dic[oa]|melhor\s+profissional|o\s+[uú]nico)\b", 2, "Superlativo/Concorrência", "Superlativos comparativos são vedados na maioria dos conselhos."),
    (r"\b(imbat[ií]vel|incompar[aá]vel|milagros[oa]s?)\b", 3, "Sensacionalismo", "Termos milagrosos são proibidos."),
    # Sensacionalismo
    (r"\b(chocante|impressionante|surreal|nunca\s+visto|revolucion[aá]ri[oa])\b", 2, "Sensacionalismo", "Adote linguagem sóbria."),
    # Preço / promoção
    (r"\bR\$\s*\d", 3, "Divulgação de preço", "CFM veda divulgação de preços em publicidade médica; outros conselhos também restringem."),
    (r"\b(desconto|promo[cç][aã]o|leve\s+2|de\s+r\$)\b", 3, "Promoção comercial", "Promoção mercantiliza o ato profissional — vedado."),
    (r"\b(gr[aá]tis|de\s+gra[cç]a|cortesia\s+de\s+consulta)\b", 3, "Gratuidade em consulta", "Vedado ofertar consultas gratuitas como estratégia comercial."),
    # Antes e depois / imagem
    (r"\b(antes\s+e\s+depois|antes/depois)\b", 3, "Antes e depois", "CFM/CRO/COFFITO vedam ou restringem antes-e-depois de pacientes."),
    # Alegações
    (r"\b(comprovad[oa]s?\s+cientific[oa]|estudos?\s+provam)\b", 2, "Alegação científica", "Cuidado com referências científicas sem citação."),
    # Depoimentos
    (r"\b(depoimento|paciente\s+relata|cliente\s+diz)\b", 2, "Depoimento", "Depoimentos de pacientes têm restrições — verifique norma do conselho."),
    # Medo
    (r"\b(voc[eê]\s+pode\s+morrer|risco\s+de\s+morte\s+iminente|\bAids\s+em\s+voc[eê])\b", 2, "Apelo ao medo", "Evite apelo emocional negativo."),
]

# Regras específicas por conselho
COUNCIL_RULES = {
    "cfm": [
        (r"\b(especialista\s+em)\b(?!.*(RQE|registro))", 2, "Título especialista sem RQE", "CFM exige RQE ao usar título de especialista."),
        (r"\b(cirurgi[aã]o?\s+pl[aá]stic[oa])\b(?!.*(RQE|registro))", 2, "Título sem RQE", "Precisa indicar RQE."),
    ],
    "cro": [
        (r"\b(dentista\s+especialista)\b(?!.*(CRO|registro))", 2, "Especialista sem registro", "CRO exige indicação do registro/especialidade."),
    ],
    "crn": [
        (r"\b(dieta\s+da\s+lua|dieta\s+relâmpago|dieta\s+milagrosa)\b", 3, "Dieta restritiva não-embasada", "CRN veda promessas de dietas milagrosas."),
    ],
    "coffito": [
        (r"\b(cura\s+da\s+hérnia)\b", 3, "Promessa de cura", "COFFITO restringe promessas de cura."),
    ],
    "cofen": [
        (r"\b(procedimento\s+m[eé]dic[oa])\b", 2, "Ato médico", "Verifique escopo de atuação."),
    ],
    "cfp": [
        (r"\b(cura\s+de\s+depress[aã]o|cura\s+da\s+ansiedade)\b", 3, "Promessa de cura psíquica", "CFP veda promessas de cura."),
    ],
    "cff": [
        (r"\b(vend[ao]|comercializa[cç][aã]o\s+de\s+medicament)\b", 2, "Comercialização farmacêutica", "Verifique norma do CFF sobre publicidade."),
    ],
    "estetica": [
        (r"\b(procedimento\s+m[eé]dic[oa]|inj[eé]ta[bcç])\b", 2, "Escopo profissional", "Verifique se está dentro do escopo do biomédico esteta."),
    ],
}

DISCLAIMER = "Revisão automatizada de apoio. Não substitui avaliação humana, jurídica ou orientação oficial do conselho profissional."

def analyze(text: str, client: Optional[dict] = None, brand_kit: Optional[dict] = None) -> dict:
    if not text or not text.strip():
        return {"risk": "baixo", "score": 0, "findings": [], "disclaimer": DISCLAIMER, "council": None}
    findings = []
    text_l = " " + text.lower() + " "

    # Universal rules
    for pattern, sev, rule_name, suggestion in UNIVERSAL_RULES:
        for m in re.finditer(pattern, text_l, re.IGNORECASE):
            findings.append({
                "rule": rule_name,
                "severity": sev,
                "snippet": _snippet(text, m.start(), m.end()),
                "suggestion": suggestion,
                "council": "universal",
            })

    # Council-specific
    council = (brand_kit or {}).get("council", "").lower() if brand_kit else ""
    if council and council in COUNCIL_RULES:
        for pattern, sev, rule_name, suggestion in COUNCIL_RULES[council]:
            for m in re.finditer(pattern, text_l, re.IGNORECASE):
                findings.append({
                    "rule": rule_name,
                    "severity": sev,
                    "snippet": _snippet(text, m.start(), m.end()),
                    "suggestion": suggestion,
                    "council": council.upper(),
                })

    # Brand Kit forbidden words
    if brand_kit and brand_kit.get("forbidden_words"):
        fw = brand_kit["forbidden_words"]
        if isinstance(fw, str):
            fw = [w.strip() for w in fw.split(",") if w.strip()]
        for word in fw:
            if word.lower() in text_l:
                findings.append({
                    "rule": f"Palavra proibida no Brand Kit: '{word}'",
                    "severity": 2,
                    "snippet": word,
                    "suggestion": "Substitua conforme padrão do cliente.",
                    "council": "brand_kit",
                })

    score = sum(f["severity"] for f in findings)
    has_high = any(f["severity"] == 3 for f in findings)
    high_count = sum(1 for f in findings if f["severity"] == 3)

    if high_count >= 2:
        risk = "bloqueado"
    elif has_high:
        risk = "alto"
    elif any(f["severity"] == 2 for f in findings):
        risk = "atencao"
    elif findings:
        risk = "baixo"
    else:
        risk = "baixo"

    return {
        "risk": risk,
        "score": score,
        "findings": findings[:25],  # limita para UI
        "disclaimer": DISCLAIMER,
        "council": council or None,
    }

def _snippet(text: str, start: int, end: int, pad: int = 40) -> str:
    # start/end são referentes ao lowered com espaço prefixado; ajustar -1
    start = max(0, start - 1 - pad)
    end = min(len(text), end - 1 + pad)
    s = text[start:end].strip()
    if start > 0: s = "…" + s
    if end < len(text): s = s + "…"
    return s
