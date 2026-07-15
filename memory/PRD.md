# VIBRAE OS — PRD

## Original request
Sistema operacional (SaaS) da Agência VIBRAE — Gestão de Marketing (foco saúde/estética). Escopo original: 52 módulos (CRM → Propostas → Contratos → Onboarding → Estratégia → Produção → Aprovação → Publicação → Relatórios → Financeiro → Portal do Cliente + IA VIBRAE + Compliance de conselhos + Gerador de artes + integrações Meta/Google/Drive).

## Stack aprovada
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + Sonner
- Auth: JWT (bcrypt) via localStorage Bearer token — CORS wildcard, `withCredentials=false`
- Identidade visual: paleta oficial VIBRAE (#231F20 preto, #A18133 dourado, #F7F5F2 off-white). Fontes Montserrat + Cormorant Garamond (título editorial).

## Personas
- Superadmin, Diretoria, Comercial, Estrategista, Social Media, Designer, Financeiro (internos)
- Cliente admin / Cliente aprovador / Cliente visualizador (Portal)

## Fase 1 — MVP (entregue 15/02/2026)
Features do "aha moment":
1. **Autenticação + Dashboard Executivo** — KPIs (clientes ativos, MRR, leads em aberto, aguardando aprovação), gráficos Recharts (conteúdos por status, leads por etapa), atividades recentes.
2. **CRM Comercial (Kanban)** — 8 etapas, cadastro de lead, mover entre etapas, WhatsApp click-to-chat com normalização de telefone, **conversão de lead em cliente** (cria cliente + inicia onboarding).
3. **Central de Clientes + Content Studio** — Lista cards de clientes, ficha com abas (Visão geral, Content Studio), Kanban de conteúdos com 9 status, CRUD conteúdo, "Enviar ao cliente" (aguardando_aprovacao), histórico completo de versões.
4. **Portal do Cliente** — Login isolado, KPIs, cards de aprovação com Aprovar / Solicitar ajuste (comentário obrigatório + versionamento automático).

Backend: 20+ endpoints REST, JWT com roles, isolamento RLS-like (client_admin só vê seu próprio client_id), atividades logadas, seed com 5 clientes + 7 usuários + 7 leads + 9 conteúdos.

## Fase 2 — Backlog priorizado
### P0 (alta prioridade)
- IA VIBRAE (geradores: estratégia, ideias, roteiros, legendas, carrosséis) via Claude Sonnet 4.5
- Financeiro (mensalidades, fluxo de caixa, inadimplência, rentabilidade)
- Estratégia de marketing + Calendário editorial (drag-and-drop)
- Compliance saúde (CFM/CRO/CRN/CFP…) — checagem automatizada

### P1
- Brand Kit por cliente (logos, paleta, tom de voz, palavras proibidas/permitidas)
- Briefing completo (multi-step)
- Stories (sequências), Roteiros, Captações
- Gerador de artes (editor visual simplificado)
- Tarefas & Projetos com Gantt

### P2
- Relatórios com integrações Meta/GA4/GBP/TikTok/YouTube (OAuth)
- Google Drive OAuth por cliente
- Reuniões (pauta, decisões → tarefas)
- Base de conhecimento (SOPs, modelos, políticas)
- Notificações em tempo real
- Propostas comerciais em PDF + assinatura
- Contratos com renovação/reajuste

## Testes executados (iteration_1)
100% pass em backend + frontend smoke tests. Isolamento entre clientes validado.

## Credenciais demo
Veja `/app/memory/test_credentials.md`.

## Fase 2 — Entregue 15/02/2026

### Módulos novos
1. **IA VIBRAE** (`/app/ia`)
   - Modelo: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `EMERGENT_LLM_KEY`
   - Ferramentas: legenda, roteiro de Reels, ideias, carrossel, hashtags
   - Sempre condicionada ao Brand Kit (tom, público, pilares, palavras proibidas, conselho)
   - System prompt bloqueia promessas absolutas, superlativos e sensacionalismo
   - Histórico de gerações persistido em `ai_generations`
2. **Brand Kit** (aba dentro de cada cliente)
   - Tom de voz, público, persona, arquétipo, pilares, palavras permitidas/proibidas, CTAs, cores, conselho + registro
   - Consumido pela IA VIBRAE e pelo Compliance
3. **Compliance Saúde**
   - Motor de regras regex universais + específicas por conselho (CFM, CRO, CRN, CFBM, COFFITO, COFEN, CFP, CFF, estética)
   - Classificação: baixo / atenção / alto / bloqueado
   - Auto-executa antes de "Enviar ao cliente" — bloqueia se `bloqueado`, alerta se `alto`
   - Disclaimer explícito de que não substitui avaliação humana/jurídica
4. **Financeiro** (`/app/financeiro`)
   - KPIs: MRR, receita/despesas do mês, lucro estimado, inadimplência
   - Fluxo de caixa 6 meses (LineChart)
   - Transações com filtros + baixa manual
   - Rentabilidade por cliente com rating (muito_rentavel / rentavel / atenção / prejuizo)
5. **Calendário Editorial** (`/app/calendario`)
   - Grid mensal com eventos de `content.scheduled_at`
   - Cards coloridos por status, cliente e formato
   - **Drag-and-drop** para reagendar (PATCH conteúdo)
   - Detecção de conflito (>3 no mesmo dia) + datas comemorativas de saúde/marketing

### Testes iteração 3
Backend 17/17 pass · Frontend 100% · Sem regressões na Fase 1.

## Fase 3 — Backlog restante
- Stories (sequências), Roteiros exportáveis, Captações
- Gerador de artes (editor visual)
- Tarefas & Projetos com Gantt
- Relatórios com integrações reais (Meta/GA4/GBP/TikTok/YouTube)
- Google Drive/Calendar OAuth por cliente
- Reuniões (transcrição, decisões → tarefas)
- Base de conhecimento
- Propostas em PDF + contratos com renovação
