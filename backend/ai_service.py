"""IA VIBRAE — geração de conteúdo condicionada ao Brand Kit do cliente.
Usa a API oficial da Claude (Anthropic) via SDK `anthropic`.

Configuração (variáveis de ambiente):
  ANTHROPIC_API_KEY  — chave da conta Anthropic (obrigatória para a IA funcionar)
  ANTHROPIC_MODEL    — opcional; padrão claude-opus-4-8. Para reduzir custo, pode
                       usar claude-haiku-4-5 (mais barato) ou claude-sonnet-5.
"""
import os
import json
from anthropic import AsyncAnthropic

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8")

TOOL_INSTRUCTIONS = {
    "caption": {
        "label": "Legenda para Instagram",
        "spec": """Gere UMA legenda pronta para Instagram, com:
- Gancho forte na 1ª linha
- 3 a 6 linhas de corpo
- CTA claro no final
- Sem emojis excessivos (máx. 2)
- Sem promessas indevidas
- Considere a persona/tom do Brand Kit""",
        "schema": {"caption": "string", "hook": "string", "cta": "string", "hashtags": "string"}
    },
    "reels_script": {
        "label": "Roteiro de Reels",
        "spec": """Gere um roteiro de Reels curto (15-30s) com:
- Gancho (0-3s)
- 3 a 5 cenas com fala + ação/enquadramento
- CTA final
- Texto na tela sugerido
Foque em autoridade, sem sensacionalismo.""",
        "schema": {
            "hook": "string", "scenes": [{"time": "string", "voiceover": "string", "action": "string", "on_screen": "string"}],
            "cta": "string", "duration_seconds": "int", "caption_suggestion": "string"
        }
    },
    "ideas": {
        "label": "Ideias de conteúdo",
        "spec": """Gere 6 ideias de conteúdo diversas para o cliente considerando pilares do Brand Kit.
Cada ideia deve ter: título, formato (reels/carrossel/story/post), objetivo, gancho.""",
        "schema": {"ideas": [{"title": "string", "format": "string", "objective": "string", "hook": "string", "pillar": "string"}]}
    },
    "carousel": {
        "label": "Carrossel educativo",
        "spec": """Gere um carrossel de 5 a 7 slides com:
- Slide 1 (capa): título forte + subtítulo
- Slides intermediários: 1 conceito por slide, texto curto
- Último slide: CTA
Sem promessas indevidas.""",
        "schema": {"slides": [{"index": "int", "title": "string", "body": "string"}], "caption_suggestion": "string"}
    },
    "hashtags": {
        "label": "Hashtags estratégicas",
        "spec": """Gere 15 hashtags estratégicas separadas em: 5 amplas, 5 de nicho, 5 locais/personalizadas.""",
        "schema": {"broad": ["string"], "niche": ["string"], "local": ["string"]}
    },
}

def build_system_prompt(client: dict, brand_kit: dict) -> str:
    bk = brand_kit or {}
    lines = [
        "Você é a IA VIBRAE, assistente de marketing da Agência VIBRAE, especializada em profissionais da saúde, estética e bem-estar.",
        "Seu trabalho é gerar conteúdo em português brasileiro seguindo rigorosamente o Brand Kit do cliente.",
        "REGRAS ABSOLUTAS:",
        "- Nunca prometa resultados milagrosos ou garantidos.",
        "- Nunca use superlativos como 'melhor', 'único', 'exclusivo' sem justificativa.",
        "- Nunca sensacionalize (evite 'chocante', 'incrível', 'nunca visto').",
        "- Respeite palavras proibidas do Brand Kit.",
        "- Ajuste o tom de voz ao definido no Brand Kit.",
        "- Considere a legislação do conselho profissional (CFM/CRO/CRN/etc.).",
        "- Nunca cite preços, valores ou promoções.",
        "- Retorne SEMPRE em JSON válido, seguindo o schema pedido, sem texto adicional.",
        "",
        f"CLIENTE: {client.get('trade_name')}",
        f"PROFISSÃO: {client.get('profession', '')} — {client.get('specialty', '')}",
        f"CIDADE: {client.get('city', '')}",
    ]
    if bk.get("tone_of_voice"):
        lines.append(f"TOM DE VOZ: {bk['tone_of_voice']}")
    if bk.get("audience"):
        lines.append(f"PÚBLICO-ALVO: {bk['audience']}")
    if bk.get("persona"):
        lines.append(f"PERSONA: {bk['persona']}")
    if bk.get("pillars"):
        lines.append(f"PILARES: {', '.join(bk['pillars']) if isinstance(bk['pillars'], list) else bk['pillars']}")
    if bk.get("allowed_words"):
        aw = bk['allowed_words'] if isinstance(bk['allowed_words'], list) else [bk['allowed_words']]
        lines.append(f"PALAVRAS PREFERIDAS: {', '.join(aw)}")
    if bk.get("forbidden_words"):
        fw = bk['forbidden_words'] if isinstance(bk['forbidden_words'], list) else [bk['forbidden_words']]
        lines.append(f"PALAVRAS PROIBIDAS: {', '.join(fw)}")
    if bk.get("council"):
        lines.append(f"CONSELHO PROFISSIONAL: {bk['council'].upper()} (siga normas de publicidade médica/saúde correspondentes)")
    return "\n".join(lines)

async def generate(tool: str, client: dict, brand_kit: dict, objective: str, orientation: str, content_format: str = "") -> dict:
    if tool not in TOOL_INSTRUCTIONS:
        raise ValueError(f"Ferramenta inválida: {tool}")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "IA VIBRAE não configurada: defina ANTHROPIC_API_KEY no ambiente "
            "(chave da conta Anthropic) para gerar conteúdo."
        )
    system_prompt = build_system_prompt(client, brand_kit)
    tool_cfg = TOOL_INSTRUCTIONS[tool]

    user_prompt = f"""FERRAMENTA: {tool_cfg['label']}

INSTRUÇÕES DA FERRAMENTA:
{tool_cfg['spec']}

OBJETIVO ESPECÍFICO: {objective or 'Não especificado — use os pilares do Brand Kit.'}
FORMATO ALVO: {content_format or 'não especificado'}
ORIENTAÇÃO EXTRA DO USUÁRIO: {orientation or 'Nenhuma.'}

RESPONDA APENAS COM JSON válido seguindo este schema (sem markdown, sem ```):
{json.dumps(tool_cfg['schema'], indent=2, ensure_ascii=False)}
"""

    ai = AsyncAnthropic(api_key=api_key)
    message = await ai.messages.create(
        model=MODEL,
        max_tokens=3000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(b.text for b in message.content if b.type == "text")
    # tenta parsear como JSON
    parsed = _try_parse_json(text)
    return {"tool": tool, "label": tool_cfg["label"], "raw": text, "data": parsed}

def _try_parse_json(text: str):
    text = text.strip()
    # remove code fences se houver
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    # tenta achar primeira/última chave
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        text = text[start:end+1]
    try:
        return json.loads(text)
    except Exception:
        return None
