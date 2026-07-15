from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGO = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']

app = FastAPI(title="VIBRAE OS API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibrae")

# ---------------- Utils ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(uid: str, email: str, role: str) -> str:
    return jwt.encode({
        "sub": uid, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access"
    }, JWT_SECRET, algorithm=JWT_ALGO)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "Usuário inexistente")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")

def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles and user["role"] != "superadmin":
            raise HTTPException(403, "Acesso negado")
        return user
    return dep

# ---------------- Models ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    client_id: Optional[str] = None

class LeadIn(BaseModel):
    name: str
    company: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    instagram: Optional[str] = ""
    profession: Optional[str] = ""
    specialty: Optional[str] = ""
    city: Optional[str] = ""
    source: Optional[str] = "Instagram"
    service: Optional[str] = ""
    budget: Optional[float] = 0
    potential_value: Optional[float] = 0
    notes: Optional[str] = ""
    stage: Optional[str] = "novo_lead"
    responsible: Optional[str] = ""
    probability: Optional[int] = 10

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    probability: Optional[int] = None
    responsible: Optional[str] = None

class ClientIn(BaseModel):
    trade_name: str
    legal_name: Optional[str] = ""
    document: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    instagram: Optional[str] = ""
    city: Optional[str] = ""
    profession: Optional[str] = ""
    specialty: Optional[str] = ""
    package: Optional[str] = "Essencial"
    monthly_fee: Optional[float] = 0
    status: Optional[str] = "ativo"
    responsible: Optional[str] = ""

class ContentIn(BaseModel):
    client_id: str
    title: str
    format: str  # reels, story, carrossel, post
    platform: Optional[str] = "Instagram"
    scheduled_at: Optional[str] = None
    caption: Optional[str] = ""
    cta: Optional[str] = ""
    hashtags: Optional[str] = ""
    thumbnail_url: Optional[str] = ""
    hook: Optional[str] = ""
    objective: Optional[str] = ""
    pillar: Optional[str] = ""
    priority: Optional[str] = "media"
    responsible: Optional[str] = ""

class ContentUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    caption: Optional[str] = None
    cta: Optional[str] = None
    thumbnail_url: Optional[str] = None
    scheduled_at: Optional[str] = None
    hashtags: Optional[str] = None

class ApprovalAction(BaseModel):
    decision: Literal["approved", "adjustment", "rejected"]
    comment: Optional[str] = ""

# ---------------- Auth Endpoints ----------------
@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(data.password, u["password_hash"]):
        raise HTTPException(401, "E-mail ou senha inválidos")
    # Portão de assinatura: usuários vinculados a uma agência só entram se ela
    # estiver com assinatura ativa. A equipe interna VIBRAE (sem agency_id) não é afetada.
    if u.get("agency_id"):
        agency = await db.agencies.find_one({"id": u["agency_id"]}, {"_id": 0, "subscription_status": 1})
        if agency and agency.get("subscription_status") not in ("active", "trialing"):
            raise HTTPException(402, "Assinatura pendente ou inativa. Conclua o pagamento para acessar o sistema.")
    token = create_access_token(u["id"], u["email"], u["role"])
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax", max_age=43200, path="/")
    return {
        "token": token,
        "user": {k: u[k] for k in ("id", "email", "name", "role") if k in u} | {"client_id": u.get("client_id")}
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return {**user, "client_id": user.get("client_id")}

# ---------------- Dashboard ----------------
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    if user["role"].startswith("client"):
        raise HTTPException(403, "Rota interna")
    active = await db.clients.count_documents({"status": "ativo"})
    onboarding = await db.clients.count_documents({"status": "onboarding"})
    paused = await db.clients.count_documents({"status": "pausado"})
    leads_open = await db.leads.count_documents({"stage": {"$nin": ["ganho", "perdido"]}})
    contents = await db.content.count_documents({})
    awaiting = await db.content.count_documents({"status": "aguardando_aprovacao"})
    adjustments = await db.content.count_documents({"status": "ajuste_solicitado"})
    approved = await db.content.count_documents({"status": {"$in": ["aprovado", "agendado", "publicado"]}})

    # MRR = soma das mensalidades ativos
    pipeline = [{"$match": {"status": "ativo"}}, {"$group": {"_id": None, "total": {"$sum": "$monthly_fee"}}}]
    mrr_res = await db.clients.aggregate(pipeline).to_list(1)
    mrr = mrr_res[0]["total"] if mrr_res else 0

    pipeline_val = [{"$match": {"stage": {"$nin": ["ganho", "perdido"]}}}, {"$group": {"_id": None, "total": {"$sum": "$potential_value"}}}]
    pv_res = await db.leads.aggregate(pipeline_val).to_list(1)
    pipeline_value = pv_res[0]["total"] if pv_res else 0

    # atividades recentes
    activities = await db.activities.find({}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)

    # conteúdos por status para gráfico
    content_by_status_agg = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    cbs = await db.content.aggregate(content_by_status_agg).to_list(50)
    content_by_status = [{"status": c["_id"], "count": c["count"]} for c in cbs]

    # leads por etapa
    lbs_agg = [{"$group": {"_id": "$stage", "count": {"$sum": 1}}}]
    lbs = await db.leads.aggregate(lbs_agg).to_list(50)
    leads_by_stage = [{"stage": l["_id"], "count": l["count"]} for l in lbs]

    return {
        "kpis": {
            "active_clients": active,
            "onboarding_clients": onboarding,
            "paused_clients": paused,
            "mrr": mrr,
            "leads_open": leads_open,
            "pipeline_value": pipeline_value,
            "contents_total": contents,
            "contents_awaiting_approval": awaiting,
            "contents_adjustments": adjustments,
            "contents_approved": approved,
        },
        "activities": activities,
        "content_by_status": content_by_status,
        "leads_by_stage": leads_by_stage,
    }

# ---------------- CRM / Leads ----------------
@api.get("/leads")
async def list_leads(user: dict = Depends(get_current_user)):
    if user["role"].startswith("client"):
        raise HTTPException(403, "Rota interna")
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return leads

@api.post("/leads")
async def create_lead(data: LeadIn, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.leads.insert_one(doc)
    await log_activity(f"Novo lead: {data.name}", "lead", user)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadUpdate, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    upd["updated_at"] = now_iso()
    r = await db.leads.update_one({"id": lead_id}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Lead não encontrado")
    if "stage" in upd:
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        await log_activity(f"Lead {lead['name']} → {upd['stage']}", "lead", user)
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})

@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    r = await db.leads.delete_one({"id": lead_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Lead não encontrado")
    return {"ok": True}

@api.post("/leads/{lead_id}/convert")
async def convert_lead(lead_id: str, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead não encontrado")
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "trade_name": lead.get("company") or lead["name"],
        "legal_name": lead.get("company", ""),
        "document": "",
        "phone": lead.get("phone", ""),
        "email": lead.get("email", ""),
        "instagram": lead.get("instagram", ""),
        "city": lead.get("city", ""),
        "profession": lead.get("profession", ""),
        "specialty": lead.get("specialty", ""),
        "package": "Essencial",
        "monthly_fee": lead.get("potential_value", 0),
        "status": "onboarding",
        "responsible": lead.get("responsible", ""),
        "onboarding_progress": 20,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "converted_from_lead": lead_id,
    }
    await db.clients.insert_one(client_doc)
    await db.leads.update_one({"id": lead_id}, {"$set": {"stage": "ganho", "converted_client_id": client_id, "updated_at": now_iso()}})
    await log_activity(f"Lead convertido em cliente: {client_doc['trade_name']}", "conversion", user)
    return {"client_id": client_id}

# ---------------- Clients ----------------
@api.get("/clients")
async def list_clients(user: dict = Depends(get_current_user)):
    if user["role"].startswith("client"):
        raise HTTPException(403, "Rota interna")
    return await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/clients")
async def create_client(data: ClientIn, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["onboarding_progress"] = 0
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.clients.insert_one(doc)
    await log_activity(f"Novo cliente: {data.trade_name}", "client", user)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.get("/clients/{cid}")
async def get_client(cid: str, user: dict = Depends(get_current_user)):
    # cliente só vê o próprio
    if user["role"].startswith("client") and user.get("client_id") != cid:
        raise HTTPException(403, "Acesso negado")
    c = await db.clients.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    return c

@api.delete("/clients/{cid}")
async def delete_client(cid: str, user: dict = Depends(require_role("superadmin", "diretoria"))):
    await db.clients.delete_one({"id": cid})
    await db.content.delete_many({"client_id": cid})
    return {"ok": True}

# ---------------- Content ----------------
@api.get("/content")
async def list_content(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if user["role"].startswith("client"):
        # cliente vê apenas seu próprio + status revisáveis
        q["client_id"] = user.get("client_id")
        q["status"] = {"$in": ["aguardando_aprovacao", "aprovado", "agendado", "publicado", "ajuste_solicitado"]}
    elif client_id:
        q["client_id"] = client_id
    items = await db.content.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api.post("/content")
async def create_content(data: ContentIn, user: dict = Depends(get_current_user)):
    if user["role"].startswith("client"):
        raise HTTPException(403, "Rota interna")
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "ideia"
    doc["version"] = 1
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["history"] = [{
        "version": 1, "action": "created", "user": user["name"],
        "timestamp": now_iso(), "comment": "Conteúdo criado"
    }]
    await db.content.insert_one(doc)
    await log_activity(f"Conteúdo criado: {data.title}", "content", user)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.patch("/content/{cid}")
async def update_content(cid: str, data: ContentUpdate, user: dict = Depends(get_current_user)):
    if user["role"].startswith("client"):
        raise HTTPException(403, "Rota interna")
    upd = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    upd["updated_at"] = now_iso()
    current = await db.content.find_one({"id": cid})
    if not current:
        raise HTTPException(404, "Conteúdo não encontrado")
    history_entry = {
        "version": current.get("version", 1), "action": "updated", "user": user["name"],
        "timestamp": now_iso(), "comment": f"Alterações: {', '.join(upd.keys())}"
    }
    await db.content.update_one({"id": cid}, {"$set": upd, "$push": {"history": history_entry}})
    if "status" in upd:
        await log_activity(f"Conteúdo '{current['title']}' → {upd['status']}", "content", user)
    return await db.content.find_one({"id": cid}, {"_id": 0})

@api.post("/content/{cid}/send-approval")
async def send_approval(cid: str, user: dict = Depends(get_current_user)):
    c = await db.content.find_one({"id": cid})
    if not c:
        raise HTTPException(404)
    await db.content.update_one({"id": cid}, {
        "$set": {"status": "aguardando_aprovacao", "updated_at": now_iso()},
        "$push": {"history": {
            "version": c.get("version", 1), "action": "sent_to_approval", "user": user["name"],
            "timestamp": now_iso(), "comment": "Enviado para aprovação do cliente"
        }}
    })
    await log_activity(f"'{c['title']}' enviado para aprovação", "content", user)
    return {"ok": True}

@api.post("/content/{cid}/approval-action")
async def approval_action(cid: str, data: ApprovalAction, user: dict = Depends(get_current_user)):
    c = await db.content.find_one({"id": cid})
    if not c:
        raise HTTPException(404)
    # se cliente, valida que é o dono
    if user["role"].startswith("client") and c["client_id"] != user.get("client_id"):
        raise HTTPException(403)
    new_status = {
        "approved": "aprovado",
        "adjustment": "ajuste_solicitado",
        "rejected": "cancelado",
    }[data.decision]
    new_version = c.get("version", 1)
    if data.decision == "adjustment":
        new_version = new_version + 1
    await db.content.update_one({"id": cid}, {
        "$set": {"status": new_status, "version": new_version, "updated_at": now_iso()},
        "$push": {"history": {
            "version": new_version, "action": data.decision, "user": user["name"],
            "timestamp": now_iso(), "comment": data.comment or ""
        }}
    })
    label = {"approved": "aprovou", "adjustment": "solicitou ajuste em", "rejected": "rejeitou"}[data.decision]
    await log_activity(f"{user['name']} {label} '{c['title']}'", "approval", user)
    return {"ok": True, "new_status": new_status, "version": new_version}

@api.get("/content/{cid}")
async def get_content(cid: str, user: dict = Depends(get_current_user)):
    c = await db.content.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404)
    if user["role"].startswith("client") and c["client_id"] != user.get("client_id"):
        raise HTTPException(403)
    return c

# ---------------- Portal (cliente) ----------------
@api.get("/portal/summary")
async def portal_summary(user: dict = Depends(get_current_user)):
    if not user["role"].startswith("client"):
        raise HTTPException(403, "Apenas para clientes")
    cid = user.get("client_id")
    c = await db.clients.find_one({"id": cid}, {"_id": 0})
    awaiting = await db.content.count_documents({"client_id": cid, "status": "aguardando_aprovacao"})
    approved = await db.content.count_documents({"client_id": cid, "status": {"$in": ["aprovado", "agendado", "publicado"]}})
    adjustments = await db.content.count_documents({"client_id": cid, "status": "ajuste_solicitado"})
    upcoming = await db.content.find(
        {"client_id": cid, "status": {"$in": ["aprovado", "agendado"]}},
        {"_id": 0}
    ).sort("scheduled_at", 1).limit(5).to_list(5)
    return {
        "client": c,
        "awaiting": awaiting,
        "approved": approved,
        "adjustments": adjustments,
        "upcoming": upcoming,
    }

# ---------------- Activity helper ----------------
async def log_activity(text: str, kind: str, user: dict):
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "text": text,
        "kind": kind,
        "user_name": user.get("name", "Sistema"),
        "created_at": now_iso(),
    })

# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"service": "VIBRAE OS", "status": "ok"}

app.include_router(api)

# Phase 2 modules
from phase2_endpoints import build_phase2_router
app.include_router(build_phase2_router(db, get_current_user))

# Phase 3 modules
from phase3_endpoints import build_phase3_router
app.include_router(build_phase3_router(db, get_current_user))

# Phase 4 modules
from phase4_endpoints import build_phase4_router
app.include_router(build_phase4_router(db, get_current_user))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Seed ----------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("id", unique=True)
    await db.clients.create_index("id", unique=True)
    await db.content.create_index("id", unique=True)
    await db.brand_kits.create_index("client_id", unique=True)
    await db.financial_transactions.create_index("id", unique=True)
    await seed()

async def seed():
    from seed_data import run_seed
    await run_seed(db, hash_password)

@app.on_event("shutdown")
async def shutdown():
    client.close()
