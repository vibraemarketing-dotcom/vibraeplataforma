"""VIBRAE OS — Endpoints Fase 3: Stories, Relatórios de Instagram, Tarefas com Gantt."""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def build_phase3_router(db, get_current_user):
    router = APIRouter(prefix="/api")

    # =============== Stories em Sequência ===============
    class StoryFrame(BaseModel):
        index: int
        text: str = ""
        cta: str = ""
        link: str = ""
        background: str = "#231F20"
        text_color: str = "#F7F5F2"
        media_url: str = ""
        poll_question: str = ""
        poll_options: List[str] = []
        interaction: str = "none"  # none | poll | question | link

    class StorySequenceIn(BaseModel):
        client_id: str
        title: str
        objective: str = ""
        scheduled_at: Optional[str] = None
        frames: List[StoryFrame] = []

    @router.get("/story-sequences")
    async def list_sequences(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        q = {}
        if user["role"].startswith("client"):
            q["client_id"] = user.get("client_id")
        elif client_id:
            q["client_id"] = client_id
        docs = await db.story_sequences.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
        return docs

    @router.post("/story-sequences")
    async def create_sequence(data: StorySequenceIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403, "Rota interna")
        doc = data.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["status"] = "rascunho"
        doc["version"] = 1
        doc["created_at"] = now_iso()
        doc["updated_at"] = now_iso()
        doc["history"] = [{"version": 1, "action": "created", "user": user["name"], "timestamp": now_iso()}]
        await db.story_sequences.insert_one(doc)
        return {k: v for k, v in doc.items() if k != "_id"}

    # Edição de conteúdo da sequência. Status/versão só mudam pelos endpoints de
    # aprovação, nunca por um PATCH direto.
    SEQUENCE_EDITABLE = {"title", "objective", "scheduled_at", "frames"}

    @router.patch("/story-sequences/{sid}")
    async def update_sequence(sid: str, data: dict, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        upd = {k: v for k, v in data.items() if k in SEQUENCE_EDITABLE}
        upd["updated_at"] = now_iso()
        r = await db.story_sequences.update_one({"id": sid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404)
        return await db.story_sequences.find_one({"id": sid}, {"_id": 0})

    @router.delete("/story-sequences/{sid}")
    async def delete_sequence(sid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        await db.story_sequences.delete_one({"id": sid})
        return {"ok": True}

    class BatchApprovalIn(BaseModel):
        decision: str  # approved | adjustment
        comment: str = ""

    @router.post("/story-sequences/{sid}/batch-approval")
    async def batch_approval(sid: str, data: BatchApprovalIn, user: dict = Depends(get_current_user)):
        seq = await db.story_sequences.find_one({"id": sid})
        if not seq:
            raise HTTPException(404)
        if user["role"].startswith("client") and seq["client_id"] != user.get("client_id"):
            raise HTTPException(403)
        new_status = {"approved": "aprovado", "adjustment": "ajuste_solicitado"}.get(data.decision)
        if not new_status:
            raise HTTPException(400, "Decisão inválida")
        version = seq.get("version", 1) + (1 if data.decision == "adjustment" else 0)
        await db.story_sequences.update_one({"id": sid}, {
            "$set": {"status": new_status, "version": version, "updated_at": now_iso()},
            "$push": {"history": {
                "version": version, "action": data.decision, "user": user["name"],
                "timestamp": now_iso(), "comment": data.comment or ""
            }}
        })
        return {"ok": True, "status": new_status}

    @router.post("/story-sequences/{sid}/send-approval")
    async def send_sequence_approval(sid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        await db.story_sequences.update_one({"id": sid}, {
            "$set": {"status": "aguardando_aprovacao", "updated_at": now_iso()},
            "$push": {"history": {"version": 1, "action": "sent_to_approval",
                                  "user": user["name"], "timestamp": now_iso()}}
        })
        return {"ok": True}

    # =============== Relatórios de Instagram ===============
    class MetricsIn(BaseModel):
        client_id: str
        month: int
        year: int
        followers: int = 0
        followers_delta: int = 0
        reach: int = 0
        impressions: int = 0
        engagement: float = 0
        profile_visits: int = 0
        website_clicks: int = 0
        saves: int = 0
        shares: int = 0
        comments: int = 0
        stories_reach: int = 0
        reels_views: int = 0
        source: str = "manual"  # manual | csv | api

    class ReportIn(BaseModel):
        client_id: str
        month: int
        year: int
        summary: str = ""
        highlights: List[str] = []
        learnings: List[str] = []
        risks: List[str] = []
        next_steps: List[str] = []
        top_content_ids: List[str] = []
        agency_notes: str = ""

    @router.get("/metrics")
    async def list_metrics(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        q = {}
        if user["role"].startswith("client"):
            q["client_id"] = user.get("client_id")
        elif client_id:
            q["client_id"] = client_id
        docs = await db.metrics.find(q, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(50)
        return docs

    @router.put("/metrics")
    async def upsert_metrics(data: MetricsIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        doc = data.model_dump()
        doc["updated_at"] = now_iso()
        await db.metrics.update_one(
            {"client_id": data.client_id, "month": data.month, "year": data.year},
            {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_iso()}},
            upsert=True
        )
        return await db.metrics.find_one(
            {"client_id": data.client_id, "month": data.month, "year": data.year}, {"_id": 0}
        )

    @router.get("/reports")
    async def list_reports(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        q = {}
        if user["role"].startswith("client"):
            q["client_id"] = user.get("client_id")
        elif client_id:
            q["client_id"] = client_id
        docs = await db.reports.find(q, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(100)
        return docs

    @router.get("/reports/{rid}")
    async def get_report(rid: str, user: dict = Depends(get_current_user)):
        r = await db.reports.find_one({"id": rid}, {"_id": 0})
        if not r:
            raise HTTPException(404)
        if user["role"].startswith("client") and r["client_id"] != user.get("client_id"):
            raise HTTPException(403)
        # inclui métricas do mês
        metrics = await db.metrics.find_one(
            {"client_id": r["client_id"], "month": r["month"], "year": r["year"]}, {"_id": 0}
        )
        r["metrics"] = metrics
        # inclui top contents (aprovados/publicados no mês)
        top = []
        if r.get("top_content_ids"):
            top = await db.content.find({"id": {"$in": r["top_content_ids"]}}, {"_id": 0}).to_list(20)
        r["top_content"] = top
        return r

    @router.put("/reports")
    async def upsert_report(data: ReportIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        existing = await db.reports.find_one(
            {"client_id": data.client_id, "month": data.month, "year": data.year}
        )
        doc = data.model_dump()
        doc["updated_at"] = now_iso()
        if existing:
            await db.reports.update_one({"id": existing["id"]}, {"$set": doc})
            return await db.reports.find_one({"id": existing["id"]}, {"_id": 0})
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = now_iso()
        doc["status"] = "rascunho"
        await db.reports.insert_one(doc)
        return {k: v for k, v in doc.items() if k != "_id"}

    # =============== Tarefas com Gantt ===============
    class TaskIn(BaseModel):
        client_id: Optional[str] = None
        title: str
        kind: str = "geral"  # captacao | campanha | producao | geral
        start_date: str
        end_date: str
        assignee: str = ""
        status: str = "pendente"  # pendente | em_andamento | concluida | atrasada
        priority: str = "media"
        description: str = ""
        depends_on: Optional[str] = None

    class TaskUpdate(BaseModel):
        title: Optional[str] = None
        start_date: Optional[str] = None
        end_date: Optional[str] = None
        assignee: Optional[str] = None
        status: Optional[str] = None
        priority: Optional[str] = None
        description: Optional[str] = None

    @router.get("/tasks")
    async def list_tasks(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        q = {}
        if client_id: q["client_id"] = client_id
        docs = await db.tasks.find(q, {"_id": 0}).sort("start_date", 1).to_list(500)
        return docs

    @router.post("/tasks")
    async def create_task(data: TaskIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        doc = data.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = now_iso()
        doc["updated_at"] = now_iso()
        await db.tasks.insert_one(doc)
        return {k: v for k, v in doc.items() if k != "_id"}

    @router.patch("/tasks/{tid}")
    async def update_task(tid: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        upd = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        upd["updated_at"] = now_iso()
        r = await db.tasks.update_one({"id": tid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404)
        return await db.tasks.find_one({"id": tid}, {"_id": 0})

    @router.delete("/tasks/{tid}")
    async def delete_task(tid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        await db.tasks.delete_one({"id": tid})
        return {"ok": True}

    @router.get("/tasks/capacity")
    async def capacity(user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        # capacidade por assignee: contar tarefas ativas
        pipeline = [
            {"$match": {"status": {"$in": ["pendente", "em_andamento", "atrasada"]}}},
            {"$group": {"_id": "$assignee", "count": {"$sum": 1}}}
        ]
        docs = await db.tasks.aggregate(pipeline).to_list(50)
        result = []
        for d in docs:
            n = d["count"]
            if n <= 3: level = "disponivel"
            elif n <= 5: level = "bem_distribuido"
            elif n <= 7: level = "proximo_limite"
            else: level = "sobrecarregado"
            result.append({"assignee": d["_id"] or "Não atribuído", "count": n, "level": level})
        return sorted(result, key=lambda x: x["count"], reverse=True)

    return router
