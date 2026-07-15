# VIBRAE OS — Configuração (variáveis de ambiente)

Para rodar ou publicar o sistema, defina estas variáveis. No backend elas vão no
arquivo `backend/.env`; no frontend, em `frontend/.env`. **Nunca** faça commit desses
arquivos (eles já estão no `.gitignore`).

## Backend (`backend/.env`)

### Obrigatórias (o sistema não sobe sem elas)
| Variável | O que é | Exemplo |
|----------|---------|---------|
| `MONGO_URL` | Conexão do MongoDB | `mongodb://localhost:27017` |
| `DB_NAME` | Nome do banco | `vibrae_os` |
| `JWT_SECRET` | Segredo para assinar os tokens de login (use algo longo e aleatório) | `troque-por-um-valor-aleatorio-longo` |

### Integrações (opcionais — cada uma liga um recurso)
| Variável | Liga o quê | Onde obter |
|----------|-----------|------------|
| `EMERGENT_LLM_KEY` | IA VIBRAE (geração de conteúdo) e transcrição de reuniões (Whisper) | Chave do Emergent |
| `STRIPE_SECRET_KEY` | Cobrança/assinaturas das agências (multi-agência) | Painel do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Confirmação automática de pagamento via webhook do Stripe | Painel do Stripe → Webhooks |
| `META_APP_ID` | OAuth "Conectar via Meta" (Instagram real) | developers.facebook.com |
| `META_APP_SECRET` | OAuth do Meta (troca do código pelo token) | developers.facebook.com |
| `META_REDIRECT_URI` | URL de retorno do OAuth — deve apontar para `…/api/meta/callback` | `https://SEU_BACKEND/api/meta/callback` |
| `FRONTEND_URL` | Para onde o usuário volta depois do OAuth do Meta | `https://SEU_FRONTEND` |

> Sem `META_APP_ID/SECRET/REDIRECT_URI`, o botão "Conectar via Meta" fica desativado e
> o usuário usa o **modo token manual** (que funciona sem essas chaves).

## Frontend (`frontend/.env`)
| Variável | O que é | Exemplo |
|----------|---------|---------|
| `REACT_APP_BACKEND_URL` | Endereço do backend (sem `/api` no final) | `https://SEU_BACKEND` |

## Catálogo de planos no Stripe (multi-agência)
Depois de configurar `STRIPE_SECRET_KEY`, rode uma vez para criar os planos:

```bash
cd backend && python setup_stripe.py
```

Isso cria os produtos/preços `vibrae_starter_monthly`, `vibrae_pro_monthly` e
`vibrae_studio_monthly` usados no cadastro de agências.

## Usuários de demonstração (após o primeiro boot com seed)
- Admin/diretoria: `admin@vibrae.com` — senha `vibrae2026`
- Cliente (portal): `cliente@aurora.com` — senha `vibrae2026`
