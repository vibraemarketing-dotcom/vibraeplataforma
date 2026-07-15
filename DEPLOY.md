# Guia de Deploy — VIBRAE OS

Este guia coloca o sistema no ar usando **3 serviços com plano grátis**:

1. **MongoDB Atlas** → banco de dados
2. **Render** → backend (Python/FastAPI)
3. **Vercel** → frontend (React)

Faça na ordem. Guarde os valores que cada passo gera — o próximo passo usa.

---

## Passo 1 — Banco de dados (MongoDB Atlas)

1. Crie conta em https://www.mongodb.com/cloud/atlas/register
2. Crie um cluster **gratuito (M0)**.
3. Em **Database Access** → crie um usuário (anote **usuário e senha**).
4. Em **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
5. Em **Database → Connect → Drivers**, copie a **connection string**. Ela é assim:
   ```
   mongodb+srv://USUARIO:SENHA@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Troque `USUARIO` e `SENHA` pelos que você criou. **Guarde essa string** — é o `MONGO_URL`.

---

## Passo 2 — Backend (Render)

1. Crie conta em https://render.com (entre com o GitHub).
2. **New → Blueprint** → selecione o repositório `vibraeplataforma`.
   - O Render lê o arquivo `render.yaml` e já configura o serviço `vibrae-backend`.
3. Ele vai pedir o valor de **`MONGO_URL`** → cole a string do Passo 1.
   (O `JWT_SECRET` é gerado automaticamente; o `DB_NAME` já vem preenchido.)
4. Clique em **Apply / Deploy** e aguarde o build (alguns minutos).
5. Ao terminar, o Render te dá uma URL, algo como:
   ```
   https://vibrae-backend.onrender.com
   ```
   **Guarde essa URL** — é o endereço do backend.
6. Teste: abra `https://vibrae-backend.onrender.com/api/` no navegador. Deve mostrar
   `{"service":"VIBRAE OS","status":"ok"}`.

> Observação: no plano grátis, o backend "hiberna" após ~15 min sem uso e leva ~1 min
> para acordar no primeiro acesso. Normal.

---

## Passo 3 — Frontend (Vercel)

1. Crie conta em https://vercel.com (entre com o GitHub).
2. **Add New → Project** → importe o repositório `vibraeplataforma`.
3. Em **Root Directory**, selecione **`frontend`**.
4. Em **Environment Variables**, adicione:
   - **Name:** `REACT_APP_BACKEND_URL`
   - **Value:** a URL do backend do Passo 2 (ex.: `https://vibrae-backend.onrender.com`)
     — **sem** barra `/` no final.
5. Clique em **Deploy**. Ao terminar, a Vercel te dá o link público do sistema, ex.:
   ```
   https://vibraeplataforma.vercel.app
   ```
   **Esse é o link do seu sistema no ar.** 🎉

---

## Passo 4 — Primeiro acesso

Abra o link da Vercel e entre com os usuários de demonstração:

- **Agência (vê tudo):** `admin@vibrae.com` / `vibrae2026`
- **Cliente (portal):** `cliente@aurora.com` / `vibrae2026`

Os dados de exemplo são criados automaticamente no primeiro acesso.

---

## Integrações (Fase C — quando você tiver as credenciais)

O núcleo funciona sem nenhuma chave. Para ligar cada integração, adicione as variáveis
no Render (aba **Environment**) — veja a lista completa em `CONFIG.md`:

- **IA VIBRAE + transcrição:** exigem religar os SDKs oficiais (anthropic/openai) — tarefa da Fase C.
- **Stripe (multi-agência):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` + rodar `python setup_stripe.py`.
- **Meta/Instagram:** `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `FRONTEND_URL`
  (o `META_REDIRECT_URI` aponta para `https://SEU_BACKEND/api/meta/callback`).

Depois de mudar variáveis no Render, clique em **Manual Deploy → Deploy latest** para aplicar.
