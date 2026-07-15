"""VIBRAE OS — Endpoints Fase 4: Meta/Instagram, Reuniões com Ata, Propostas em PDF, Multi-Agência (Stripe)."""
import os
import uuid
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import httpx
import stripe

def now_iso():
    return datetime.now(timezone.utc).isoformat()

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

def build_phase4_router(db, get_current_user):
    router = APIRouter(prefix="/api")

    # =============== Meta / Instagram Real ===============
    class MetaConnectIn(BaseModel):
        client_id: str
        access_token: str
        instagram_business_id: str = ""
        page_id: str = ""

    @router.post("/meta/connect")
    async def meta_connect(data: MetaConnectIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        doc = data.model_dump()
        doc["connected_at"] = now_iso()
        doc["updated_at"] = now_iso()
        doc["source"] = "manual_token"
        # tenta descobrir o instagram_business_id se não fornecido
        if not doc["instagram_business_id"] and doc["access_token"]:
            try:
                async with httpx.AsyncClient(timeout=15) as cli:
                    r = await cli.get(f"https://graph.facebook.com/v19.0/me/accounts",
                                      params={"access_token": doc["access_token"], "fields": "instagram_business_account,name,id"})
                    if r.status_code == 200:
                        for page in r.json().get("data", []):
                            ig = page.get("instagram_business_account")
                            if ig:
                                doc["instagram_business_id"] = ig["id"]
                                doc["page_id"] = page["id"]
                                doc["page_name"] = page.get("name", "")
                                break
            except Exception as e:
                doc["autodiscover_error"] = str(e)[:200]
        await db.meta_connections.update_one({"client_id": data.client_id}, {"$set": doc}, upsert=True)
        return {"ok": True, "instagram_business_id": doc.get("instagram_business_id", "")}

    @router.get("/meta/status/{client_id}")
    async def meta_status(client_id: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client") and user.get("client_id") != client_id:
            raise HTTPException(403)
        conn = await db.meta_connections.find_one({"client_id": client_id}, {"_id": 0, "access_token": 0})
        return conn or {"client_id": client_id, "connected": False}

    @router.delete("/meta/connect/{client_id}")
    async def meta_disconnect(client_id: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        await db.meta_connections.delete_one({"client_id": client_id})
        return {"ok": True}

    @router.post("/meta/sync/{client_id}")
    async def meta_sync(client_id: str, user: dict = Depends(get_current_user)):
        """Puxa métricas atuais do Instagram Graph API para o cliente."""
        if user["role"].startswith("client"):
            raise HTTPException(403)
        conn = await db.meta_connections.find_one({"client_id": client_id})
        if not conn or not conn.get("access_token") or not conn.get("instagram_business_id"):
            raise HTTPException(400, "Meta não conectado — conecte primeiro em Integrações.")
        ig_id = conn["instagram_business_id"]
        token = conn["access_token"]
        try:
            async with httpx.AsyncClient(timeout=20) as cli:
                # Insights básicos do perfil
                acc = await cli.get(
                    f"https://graph.facebook.com/v19.0/{ig_id}",
                    params={"access_token": token, "fields": "followers_count,media_count,username,name,profile_picture_url"})
                if acc.status_code != 200:
                    raise HTTPException(400, f"Meta API: {acc.text[:200]}")
                acc_data = acc.json()
                # Insights: reach, impressions, profile_views (dia atual)
                insights = await cli.get(
                    f"https://graph.facebook.com/v19.0/{ig_id}/insights",
                    params={"access_token": token, "metric": "reach,impressions,profile_views,follower_count", "period": "day"})
                metric_map = {}
                if insights.status_code == 200:
                    for item in insights.json().get("data", []):
                        vals = item.get("values", [])
                        if vals:
                            metric_map[item["name"]] = vals[-1].get("value", 0)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Falha na Graph API: {str(e)[:200]}")

        # persiste no metrics do mês atual
        today = datetime.now(timezone.utc)
        doc = {
            "client_id": client_id,
            "month": today.month, "year": today.year,
            "followers": acc_data.get("followers_count", 0),
            "followers_delta": 0,
            "reach": metric_map.get("reach", 0),
            "impressions": metric_map.get("impressions", 0),
            "profile_visits": metric_map.get("profile_views", 0),
            "source": "meta_api",
            "updated_at": now_iso(),
            "meta_username": acc_data.get("username", ""),
        }
        await db.metrics.update_one(
            {"client_id": client_id, "month": doc["month"], "year": doc["year"]},
            {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_iso(),
                                            "engagement": 0, "website_clicks": 0, "saves": 0,
                                            "shares": 0, "comments": 0, "stories_reach": 0, "reels_views": 0}},
            upsert=True
        )
        return {"ok": True, "synced": doc}

    @router.get("/meta/oauth-url")
    async def meta_oauth_url(client_id: str, user: dict = Depends(get_current_user)):
        """Gera URL de OAuth do Meta (requer META_APP_ID configurado)."""
        app_id = os.environ.get("META_APP_ID", "")
        redirect = os.environ.get("META_REDIRECT_URI", "")
        if not app_id or not redirect:
            return {"configured": False, "url": "",
                    "message": "META_APP_ID e META_REDIRECT_URI ainda não configurados. Use o modo Token Manual."}
        scopes = ",".join([
            "instagram_basic", "instagram_manage_insights",
            "pages_show_list", "pages_read_engagement", "business_management"
        ])
        state = f"{client_id}:{secrets.token_urlsafe(16)}"
        url = (f"https://www.facebook.com/v19.0/dialog/oauth?client_id={app_id}"
               f"&redirect_uri={redirect}&state={state}&scope={scopes}&response_type=code")
        return {"configured": True, "url": url}

    # =============== Reuniões com Ata ===============
    class MeetingIn(BaseModel):
        client_id: Optional[str] = None
        title: str
        date: str
        participants: List[str] = []
        agenda: str = ""
        notes: str = ""

    class MeetingUpdate(BaseModel):
        notes: Optional[str] = None
        decisions: Optional[List[dict]] = None

    @router.get("/meetings")
    async def list_meetings(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        q = {}
        if client_id: q["client_id"] = client_id
        return await db.meetings.find(q, {"_id": 0}).sort("date", -1).to_list(200)

    @router.post("/meetings")
    async def create_meeting(data: MeetingIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        doc = data.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["transcript"] = ""
        doc["decisions"] = []
        doc["created_by"] = user["name"]
        doc["created_at"] = now_iso()
        doc["updated_at"] = now_iso()
        await db.meetings.insert_one(doc)
        return {k: v for k, v in doc.items() if k != "_id"}

    @router.patch("/meetings/{mid}")
    async def update_meeting(mid: str, data: MeetingUpdate, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        upd = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        upd["updated_at"] = now_iso()
        await db.meetings.update_one({"id": mid}, {"$set": upd})
        return await db.meetings.find_one({"id": mid}, {"_id": 0})

    @router.get("/meetings/{mid}")
    async def get_meeting(mid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        m = await db.meetings.find_one({"id": mid}, {"_id": 0})
        if not m: raise HTTPException(404)
        return m

    @router.post("/meetings/{mid}/transcribe")
    async def transcribe_meeting(mid: str, audio: UploadFile = File(...), user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        m = await db.meetings.find_one({"id": mid})
        if not m: raise HTTPException(404)
        # salva arquivo temporário
        import tempfile
        content = await audio.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(400, "Arquivo maior que 25MB — divida antes.")
        suffix = os.path.splitext(audio.filename or "audio.mp3")[1] or ".mp3"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(content); tmp_path = f.name
        try:
            from emergentintegrations.llm.openai import OpenAISpeechToText
            stt = OpenAISpeechToText(api_key=os.environ["EMERGENT_LLM_KEY"])
            with open(tmp_path, "rb") as af:
                response = await stt.transcribe(file=af, model="whisper-1", response_format="json", language="pt")
            transcript = response.text
        except Exception as e:
            raise HTTPException(500, f"Falha na transcrição: {str(e)[:200]}")
        finally:
            try: os.unlink(tmp_path)
            except Exception: pass
        # extrai decisões e tarefas via Claude
        decisions = []
        try:
            from ai_service import _try_parse_json
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=f"vibrae-meeting-{mid}",
                system_message=(
                    "Você é um assistente de ata da Agência VIBRAE. Ao receber um transcrito de reunião,"
                    " extraia: (1) resumo executivo em 2-3 frases; (2) decisões tomadas; (3) tarefas com responsável e prazo sugerido."
                    " Responda apenas em JSON válido."
                ),
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            prompt = f"""Transcrito da reunião:
---
{transcript[:8000]}
---
Responda EXATAMENTE neste schema JSON (sem markdown):
{{
  "summary": "string curto",
  "decisions": [{{"text": "decisão tomada", "owner": "nome ou vazio"}}],
  "tasks": [{{"title": "ação", "assignee": "nome", "due_days": 7}}]
}}"""
            raw = await chat.send_message(UserMessage(text=prompt))
            parsed = _try_parse_json(raw) or {}
        except Exception as e:
            parsed = {"error": str(e)[:200], "summary": "", "decisions": [], "tasks": []}
        # persiste
        await db.meetings.update_one({"id": mid}, {"$set": {
            "transcript": transcript,
            "summary": parsed.get("summary", ""),
            "decisions": parsed.get("decisions", []),
            "suggested_tasks": parsed.get("tasks", []),
            "transcribed_at": now_iso(),
        }})
        return {"transcript": transcript, "summary": parsed.get("summary", ""),
                "decisions": parsed.get("decisions", []), "suggested_tasks": parsed.get("tasks", [])}

    @router.post("/meetings/{mid}/convert-tasks")
    async def convert_tasks(mid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        m = await db.meetings.find_one({"id": mid})
        if not m: raise HTTPException(404)
        created = []
        today = datetime.now(timezone.utc).date()
        for t in m.get("suggested_tasks", []):
            due = today + timedelta(days=int(t.get("due_days", 7) or 7))
            task = {
                "id": str(uuid.uuid4()),
                "client_id": m.get("client_id"),
                "title": t.get("title", "Tarefa da reunião"),
                "kind": "geral",
                "start_date": today.isoformat(),
                "end_date": due.isoformat(),
                "assignee": t.get("assignee", ""),
                "status": "pendente",
                "priority": "media",
                "description": f"Origem: reunião '{m['title']}'",
                "created_at": now_iso(), "updated_at": now_iso(),
            }
            await db.tasks.insert_one(task)
            created.append(task["id"])
        await db.meetings.update_one({"id": mid}, {"$set": {"tasks_created": created, "tasks_created_at": now_iso()}})
        return {"created": len(created), "task_ids": created}

    # =============== Propostas em PDF ===============
    class ProposalIn(BaseModel):
        lead_id: Optional[str] = None
        client_id: Optional[str] = None
        title: str
        client_name: str
        client_email: str = ""
        services: List[dict] = []  # [{name, description, quantity, price}]
        total: float = 0
        validity_days: int = 15
        conditions: str = ""
        summary: str = ""

    @router.get("/proposals")
    async def list_proposals(user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        return await db.proposals.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

    @router.post("/proposals")
    async def create_proposal(data: ProposalIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        doc = data.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["token"] = secrets.token_urlsafe(24)
        doc["status"] = "rascunho"
        doc["view_count"] = 0
        doc["created_by"] = user["name"]
        doc["created_at"] = now_iso()
        doc["updated_at"] = now_iso()
        doc["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=data.validity_days)).isoformat()
        # calcula total se não fornecido
        if not doc["total"] and doc["services"]:
            doc["total"] = sum(float(s.get("price", 0)) * int(s.get("quantity", 1)) for s in doc["services"])
        await db.proposals.insert_one(doc)
        return {k: v for k, v in doc.items() if k != "_id"}

    @router.patch("/proposals/{pid}")
    async def update_proposal(pid: str, data: dict, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        data["updated_at"] = now_iso()
        await db.proposals.update_one({"id": pid}, {"$set": data})
        return await db.proposals.find_one({"id": pid}, {"_id": 0})

    @router.post("/proposals/{pid}/send")
    async def send_proposal(pid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        p = await db.proposals.find_one({"id": pid})
        if not p: raise HTTPException(404)
        await db.proposals.update_one({"id": pid}, {"$set": {"status": "enviada", "sent_at": now_iso()}})
        # o link real seria: FRONTEND_URL/aceite/{token}
        return {"link_relative": f"/aceite/{p['token']}"}

    # -------- Endpoints públicos de proposta (sem auth) --------
    @router.get("/public/proposals/{token}")
    async def public_get_proposal(token: str):
        p = await db.proposals.find_one({"token": token}, {"_id": 0})
        if not p:
            raise HTTPException(404, "Proposta não encontrada")
        # incrementa visualizações
        await db.proposals.update_one({"token": token}, {
            "$inc": {"view_count": 1},
            "$set": {"last_viewed_at": now_iso(),
                     "status": "visualizada" if p["status"] == "enviada" else p["status"]}
        })
        # remove info sensível
        p.pop("created_by", None)
        return p

    class AcceptIn(BaseModel):
        signer_name: str
        signer_document: str = ""
        signer_email: str = ""

    @router.post("/public/proposals/{token}/accept")
    async def public_accept(token: str, data: AcceptIn):
        p = await db.proposals.find_one({"token": token})
        if not p:
            raise HTTPException(404)
        if p["status"] in ("aceita", "recusada"):
            raise HTTPException(400, f"Proposta já foi {p['status']}")
        now = now_iso()
        await db.proposals.update_one({"id": p["id"]}, {"$set": {
            "status": "aceita", "accepted_at": now,
            "signer_name": data.signer_name, "signer_document": data.signer_document,
            "signer_email": data.signer_email,
        }})
        # cria contrato + cliente + onboarding
        client_id = p.get("client_id")
        if not client_id:
            client_id = str(uuid.uuid4())
            await db.clients.insert_one({
                "id": client_id,
                "trade_name": p["client_name"],
                "legal_name": p["client_name"],
                "document": data.signer_document,
                "phone": "", "email": data.signer_email or p.get("client_email", ""),
                "instagram": "", "city": "",
                "profession": "", "specialty": "",
                "package": "Contrato #" + p["id"][:6],
                "monthly_fee": p["total"],
                "status": "onboarding", "responsible": p.get("created_by", ""),
                "onboarding_progress": 10,
                "created_at": now, "updated_at": now,
                "converted_from_proposal": p["id"],
            })
        contract_id = str(uuid.uuid4())
        await db.contracts.insert_one({
            "id": contract_id,
            "client_id": client_id,
            "proposal_id": p["id"],
            "title": p["title"],
            "services": p.get("services", []),
            "monthly_fee": p["total"],
            "status": "ativo",
            "signed_at": now,
            "signer_name": data.signer_name,
            "signer_document": data.signer_document,
            "start_date": now[:10],
            "created_at": now,
        })
        # log atividade
        await db.activities.insert_one({
            "id": str(uuid.uuid4()),
            "text": f"Proposta aceita: {p['title']} · {data.signer_name}",
            "kind": "proposal_accepted", "user_name": "Sistema",
            "created_at": now,
        })
        return {"ok": True, "client_id": client_id, "contract_id": contract_id}

    class DeclineIn(BaseModel):
        reason: str = ""

    @router.post("/public/proposals/{token}/decline")
    async def public_decline(token: str, data: DeclineIn):
        p = await db.proposals.find_one({"token": token})
        if not p:
            raise HTTPException(404)
        await db.proposals.update_one({"id": p["id"]}, {"$set": {
            "status": "recusada", "declined_at": now_iso(), "decline_reason": data.reason
        }})
        return {"ok": True}

    @router.get("/contracts")
    async def list_contracts(user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        return await db.contracts.find({}, {"_id": 0}).sort("signed_at", -1).to_list(200)

    # =============== Multi-Agência (Stripe) ===============
    class AgencyIn(BaseModel):
        trade_name: str
        contact_email: str
        contact_name: str
        phone: str = ""
        subdomain: str = ""
        color_primary: str = "#A18133"
        logo_text: str = "VIBRAE"

    @router.get("/agencies/current")
    async def current_agency(user: dict = Depends(get_current_user)):
        """Retorna a agência do usuário (por padrão, a agência mãe VIBRAE)."""
        agency_id = user.get("agency_id") or "vibrae-primary"
        a = await db.agencies.find_one({"id": agency_id}, {"_id": 0})
        if not a:
            # cria a agência padrão VIBRAE se não existir
            a = {
                "id": "vibrae-primary",
                "trade_name": "Agência VIBRAE",
                "contact_email": "admin@vibrae.com",
                "contact_name": "Ana Ribeiro",
                "phone": "",
                "subdomain": "vibrae",
                "color_primary": "#A18133",
                "color_secondary": "#231F20",
                "logo_text": "VIBRAE",
                "plan": "vibrae_studio_monthly",
                "subscription_status": "active",
                "created_at": now_iso(),
            }
            await db.agencies.insert_one(a)
            a = await db.agencies.find_one({"id": "vibrae-primary"}, {"_id": 0})
        return a

    @router.put("/agencies/current")
    async def update_current_agency(data: dict, user: dict = Depends(get_current_user)):
        if user["role"] not in ("superadmin", "diretoria"):
            raise HTTPException(403)
        agency_id = user.get("agency_id") or "vibrae-primary"
        data["updated_at"] = now_iso()
        await db.agencies.update_one({"id": agency_id}, {"$set": data}, upsert=True)
        return await db.agencies.find_one({"id": agency_id}, {"_id": 0})

    class SignupIn(BaseModel):
        trade_name: str
        contact_name: str
        contact_email: str
        phone: str = ""
        password: str
        plan_lookup_key: str  # vibrae_starter_monthly | vibrae_pro_monthly | vibrae_studio_monthly
        origin_url: str

    @router.post("/agencies/signup")
    async def agency_signup(data: SignupIn):
        """Cria agência + admin + inicia checkout do Stripe."""
        import bcrypt
        # verifica se email já existe
        if await db.users.find_one({"email": data.contact_email.lower()}):
            raise HTTPException(400, "E-mail já cadastrado. Faça login.")
        agency_id = str(uuid.uuid4())
        subdomain = "".join(c for c in data.trade_name.lower() if c.isalnum())[:20] or agency_id[:8]
        # cria agência
        await db.agencies.insert_one({
            "id": agency_id,
            "trade_name": data.trade_name,
            "contact_email": data.contact_email,
            "contact_name": data.contact_name,
            "phone": data.phone,
            "subdomain": subdomain,
            "color_primary": "#A18133",
            "color_secondary": "#231F20",
            "logo_text": data.trade_name.split()[0][:12].upper(),
            "plan": data.plan_lookup_key,
            "subscription_status": "pending",
            "created_at": now_iso(),
        })
        # cria admin
        pw_hash = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id, "email": data.contact_email.lower(),
            "password_hash": pw_hash, "name": data.contact_name,
            "role": "superadmin", "agency_id": agency_id,
            "created_at": now_iso(),
        })
        # cria checkout Stripe
        prices = stripe.Price.list(lookup_keys=[data.plan_lookup_key], active=True, limit=1).data
        if not prices:
            raise HTTPException(400, "Plano inválido")
        price = prices[0]
        session = stripe.checkout.Session.create(
            line_items=[{"price": price.id, "quantity": 1}],
            mode="subscription",
            success_url=f"{data.origin_url}/agencia/pagamento/sucesso?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{data.origin_url}/agencia/pagamento/cancelar",
            metadata={"agency_id": agency_id, "user_id": user_id, "plan": data.plan_lookup_key},
            customer_email=data.contact_email,
        )
        # registra payment_transaction
        await db.payment_transactions.insert_one({
            "session_id": session.id, "agency_id": agency_id, "user_id": user_id,
            "lookup_key": data.plan_lookup_key,
            "amount": (price.unit_amount or 0) / 100.0, "currency": price.currency,
            "status": "initiated", "payment_status": "pending",
            "created_at": now_iso(), "updated_at": now_iso(),
        })
        return {"checkout_url": session.url, "session_id": session.id, "agency_id": agency_id}

    @router.get("/payments/status/{session_id}")
    async def payment_status(session_id: str):
        record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if not record: raise HTTPException(404)
        if record.get("payment_status") != "paid":
            try:
                s = stripe.checkout.Session.retrieve(session_id)
                if s.payment_status == "paid" or s.status == "complete":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                        {"$set": {"status": "completed", "payment_status": "paid",
                                  "stripe_subscription_id": s.subscription,
                                  "updated_at": now_iso()}},
                    )
                    # ativa agência
                    if record.get("agency_id"):
                        await db.agencies.update_one({"id": record["agency_id"]},
                            {"$set": {"subscription_status": "active",
                                      "stripe_subscription_id": s.subscription,
                                      "activated_at": now_iso()}})
                    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            except stripe.error.StripeError:
                pass
        return {"session_id": record["session_id"], "status": record["status"], "payment_status": record["payment_status"]}

    @router.get("/plans")
    async def list_plans():
        """Retorna lista de planos ativos (público)."""
        plans = []
        try:
            for lookup_key in ["vibrae_starter_monthly", "vibrae_pro_monthly", "vibrae_studio_monthly"]:
                prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, expand=["data.product"], limit=1).data
                if prices:
                    pr = prices[0]
                    prod = pr.product
                    plans.append({
                        "lookup_key": lookup_key,
                        "name": prod.name if hasattr(prod, "name") else "",
                        "description": prod.description if hasattr(prod, "description") else "",
                        "amount": (pr.unit_amount or 0) / 100.0,
                        "currency": pr.currency,
                        "interval": pr.recurring.interval if pr.recurring else "month",
                    })
        except Exception as e:
            return {"error": str(e), "plans": []}
        return {"plans": plans}

    @router.post("/stripe/webhook")
    async def stripe_webhook(request: Request):
        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        try:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            raise HTTPException(400, f"Webhook error: {e}")
        obj = event["data"]["object"]; t = event["type"]
        if t == "checkout.session.completed":
            await db.payment_transactions.update_one(
                {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
                {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                          "stripe_subscription_id": obj.get("subscription"),
                          "updated_at": now_iso()}})
            # ativa agência via metadata
            agency_id = (obj.get("metadata") or {}).get("agency_id")
            if agency_id:
                await db.agencies.update_one({"id": agency_id},
                    {"$set": {"subscription_status": "active",
                              "stripe_subscription_id": obj.get("subscription"),
                              "activated_at": now_iso()}})
        elif t in ("customer.subscription.deleted", "customer.subscription.paused"):
            sub_id = obj.get("id")
            await db.agencies.update_one({"stripe_subscription_id": sub_id},
                {"$set": {"subscription_status": "canceled", "updated_at": now_iso()}})
        return {"status": "ok"}

    return router
