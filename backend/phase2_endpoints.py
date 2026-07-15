"""VIBRAE OS — Endpoints Fase 2: Brand Kit, IA VIBRAE, Compliance, Financeiro, Calendário."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def build_phase2_router(db, get_current_user):
    router = APIRouter(prefix="/api")

    # ------------ Brand Kit ------------
    class BrandKitIn(BaseModel):
        tone_of_voice: str = ""
        audience: str = ""
        persona: str = ""
        pillars: List[str] = []
        allowed_words: List[str] = []
        forbidden_words: List[str] = []
        ctas: List[str] = []
        hashtags: str = ""
        color_primary: str = ""
        color_secondary: str = ""
        references: str = ""
        council: str = "none"
        council_number: str = ""
        responsible_technician: str = ""
        archetype: str = ""

    @router.get("/clients/{cid}/brand-kit")
    async def get_brand_kit(cid: str, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client") and user.get("client_id") != cid:
            raise HTTPException(403)
        bk = await db.brand_kits.find_one({"client_id": cid}, {"_id": 0})
        return bk or {"client_id": cid}

    @router.put("/clients/{cid}/brand-kit")
    async def put_brand_kit(cid: str, data: BrandKitIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403, "Rota interna")
        upd = data.model_dump()
        upd["client_id"] = cid
        upd["updated_at"] = now_iso()
        await db.brand_kits.update_one({"client_id": cid}, {"$set": upd}, upsert=True)
        return {**upd}

    # ------------ IA VIBRAE ------------
    class AIRequest(BaseModel):
        client_id: str
        tool: str  # caption | reels_script | ideas | carousel | hashtags
        objective: str = ""
        content_format: str = ""
        orientation: str = ""

    @router.post("/ai/generate")
    async def ai_generate(data: AIRequest, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403, "Rota interna")
        client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
        if not client:
            raise HTTPException(404, "Cliente não encontrado")
        brand_kit = await db.brand_kits.find_one({"client_id": data.client_id}, {"_id": 0}) or {}
        try:
            from ai_service import generate
            result = await generate(data.tool, client, brand_kit, data.objective, data.orientation, data.content_format)
        except Exception as e:
            raise HTTPException(500, f"Falha na IA VIBRAE: {str(e)[:200]}")
        # log
        await db.ai_generations.insert_one({
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "tool": data.tool,
            "user_name": user.get("name"),
            "objective": data.objective,
            "orientation": data.orientation,
            "created_at": now_iso(),
        })
        return result

    @router.get("/ai/history")
    async def ai_history(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        q = {"client_id": client_id} if client_id else {}
        docs = await db.ai_generations.find(q, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
        return docs

    # ------------ Compliance ------------
    class ComplianceCheckIn(BaseModel):
        text: str
        client_id: Optional[str] = None

    @router.post("/compliance/check")
    async def compliance_check(data: ComplianceCheckIn, user: dict = Depends(get_current_user)):
        from compliance_rules import analyze
        client = None; bk = None
        if data.client_id:
            client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
            bk = await db.brand_kits.find_one({"client_id": data.client_id}, {"_id": 0})
        return analyze(data.text, client, bk)

    @router.post("/content/{cid}/compliance-check")
    async def content_compliance(cid: str, user: dict = Depends(get_current_user)):
        from compliance_rules import analyze
        c = await db.content.find_one({"id": cid}, {"_id": 0})
        if not c:
            raise HTTPException(404)
        bk = await db.brand_kits.find_one({"client_id": c["client_id"]}, {"_id": 0})
        # concatena todos os textos do conteúdo
        text = " ".join(filter(None, [c.get("title", ""), c.get("caption", ""), c.get("hook", ""), c.get("cta", "")]))
        result = analyze(text, None, bk)
        # persiste na review
        await db.content.update_one({"id": cid}, {"$set": {
            "compliance_result": result,
            "compliance_checked_at": now_iso(),
        }})
        return result

    # ------------ Financeiro ------------
    class FinancialTxIn(BaseModel):
        client_id: Optional[str] = None
        type: str  # receita | despesa
        category: str
        description: str
        amount: float
        due_date: str
        status: str = "pendente"  # previsto, pendente, pago, vencido, cancelado
        payment_method: str = ""
        recurring: bool = False
        notes: str = ""

    class FinancialTxUpdate(BaseModel):
        status: Optional[str] = None
        paid_at: Optional[str] = None
        payment_method: Optional[str] = None
        amount: Optional[float] = None
        notes: Optional[str] = None

    @router.get("/financial/summary")
    async def financial_summary(user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        today = datetime.now(timezone.utc)
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        # revenue this month = receitas com paid_at neste mês
        pipe_rev = [
            {"$match": {"type": "receita", "status": "pago", "paid_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        pipe_exp = [
            {"$match": {"type": "despesa", "status": "pago", "paid_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        pipe_receivable = [
            {"$match": {"type": "receita", "status": {"$in": ["pendente", "previsto", "vencido"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        pipe_overdue = [
            {"$match": {"type": "receita", "status": "vencido"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        # aggregate
        rev = await db.financial_transactions.aggregate(pipe_rev).to_list(1)
        exp = await db.financial_transactions.aggregate(pipe_exp).to_list(1)
        receivable = await db.financial_transactions.aggregate(pipe_receivable).to_list(1)
        overdue = await db.financial_transactions.aggregate(pipe_overdue).to_list(1)

        revenue_month = rev[0]["total"] if rev else 0
        expenses_month = exp[0]["total"] if exp else 0
        profit_month = revenue_month - expenses_month
        receivable_total = receivable[0]["total"] if receivable else 0
        overdue_total = overdue[0]["total"] if overdue else 0
        overdue_count = overdue[0]["count"] if overdue else 0

        # MRR
        mrr_agg = [{"$match": {"status": "ativo"}}, {"$group": {"_id": None, "total": {"$sum": "$monthly_fee"}}}]
        mrr_res = await db.clients.aggregate(mrr_agg).to_list(1)
        mrr = mrr_res[0]["total"] if mrr_res else 0

        # série últimos 6 meses (receita paga) — navegação por mês-calendário real,
        # sem aproximar "1 mês = 30 dias" (o que pulava/duplicava meses de 31 dias).
        series = []
        base_index = today.year * 12 + (today.month - 1)  # índice absoluto do mês atual
        for i in range(5, -1, -1):
            y, mo0 = divmod(base_index - i, 12)
            mo = mo0 + 1
            m_start = datetime(y, mo, 1, tzinfo=timezone.utc)
            m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) if mo == 12 else datetime(y, mo + 1, 1, tzinfo=timezone.utc)
            pipe = [
                {"$match": {"type": "receita", "status": "pago",
                            "paid_at": {"$gte": m_start.isoformat(), "$lt": m_end.isoformat()}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            r = await db.financial_transactions.aggregate(pipe).to_list(1)
            series.append({
                "month": m_start.strftime("%b/%y"),
                "revenue": r[0]["total"] if r else 0
            })

        return {
            "mrr": mrr,
            "revenue_month": revenue_month,
            "expenses_month": expenses_month,
            "profit_month": profit_month,
            "receivable_total": receivable_total,
            "overdue_total": overdue_total,
            "overdue_count": overdue_count,
            "series": series,
        }

    @router.get("/financial/transactions")
    async def list_tx(status: Optional[str] = None, type: Optional[str] = None,
                     client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        # O filtro de status é aplicado DEPOIS da reclassificação de vencidos, senão
        # pedir status="vencido" não traria os pendentes que já venceram (e "pendente"
        # traria itens que na prática já estão vencidos).
        q = {}
        if type: q["type"] = type
        if client_id: q["client_id"] = client_id
        docs = await db.financial_transactions.find(q, {"_id": 0}).sort("due_date", 1).to_list(500)
        # marcar vencidos automaticamente
        today = datetime.now(timezone.utc).date().isoformat()
        for d in docs:
            if d.get("status") == "pendente" and d.get("due_date", "9999")[:10] < today:
                d["status"] = "vencido"
        if status:
            docs = [d for d in docs if d.get("status") == status]
        return docs

    @router.post("/financial/transactions")
    async def create_tx(data: FinancialTxIn, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        doc = data.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = now_iso()
        doc["updated_at"] = now_iso()
        doc["paid_at"] = None
        await db.financial_transactions.insert_one(doc)
        await db.activities.insert_one({
            "id": str(uuid.uuid4()),
            "text": f"Nova {data.type}: {data.description} — R$ {data.amount:.2f}",
            "kind": "financial", "user_name": user.get("name"), "created_at": now_iso(),
        })
        return {k: v for k, v in doc.items() if k != "_id"}

    @router.patch("/financial/transactions/{tid}")
    async def update_tx(tid: str, data: FinancialTxUpdate, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        upd = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        upd["updated_at"] = now_iso()
        if upd.get("status") == "pago" and "paid_at" not in upd:
            upd["paid_at"] = now_iso()
        r = await db.financial_transactions.update_one({"id": tid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404)
        return await db.financial_transactions.find_one({"id": tid}, {"_id": 0})

    @router.get("/financial/profitability")
    async def profitability(user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            raise HTTPException(403)
        clients = await db.clients.find({}, {"_id": 0}).to_list(500)
        result = []
        for c in clients:
            # receita paga últimos 6 meses do cliente
            pipe_rev = [
                {"$match": {"client_id": c["id"], "type": "receita", "status": "pago"}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            pipe_exp = [
                {"$match": {"client_id": c["id"], "type": "despesa", "status": "pago"}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            rev = await db.financial_transactions.aggregate(pipe_rev).to_list(1)
            exp = await db.financial_transactions.aggregate(pipe_exp).to_list(1)
            revenue = rev[0]["total"] if rev else 0
            expense = exp[0]["total"] if exp else 0
            profit = revenue - expense
            margin = (profit / revenue * 100) if revenue > 0 else 0
            if margin >= 40: rating = "muito_rentavel"
            elif margin >= 20: rating = "rentavel"
            elif margin >= 0: rating = "atencao"
            else: rating = "prejuizo"
            result.append({
                "client_id": c["id"], "trade_name": c["trade_name"],
                "monthly_fee": c.get("monthly_fee", 0),
                "revenue": revenue, "expense": expense,
                "profit": profit, "margin": round(margin, 1), "rating": rating,
            })
        return sorted(result, key=lambda x: x["margin"], reverse=True)

    # ------------ Calendário Editorial ------------
    # Feriados/datas comemorativas relevantes para saúde/marketing
    HOLIDAYS = [
        # (mês, dia, título, categoria)
        (1, 1, "Ano Novo", "geral"), (1, 27, "Dia da Terapia Ocupacional", "saude"),
        (2, 4, "Dia Mundial de Combate ao Câncer", "saude"),
        (3, 8, "Dia Internacional da Mulher", "geral"),
        (4, 7, "Dia Mundial da Saúde", "saude"),
        (4, 22, "Dia do Descobrimento do Brasil", "geral"),
        (5, 1, "Dia do Trabalho", "geral"), (5, 12, "Dia da Enfermagem", "saude"),
        (5, 13, "Dia das Mães (2º dom)", "comercial"),
        (6, 12, "Dia dos Namorados", "comercial"),
        (7, 27, "Dia do Nutricionista", "saude"),
        (8, 11, "Dia dos Pais (2º dom)", "comercial"),
        (9, 3, "Dia do Biomédico", "saude"), (9, 21, "Dia da Fisioterapia", "saude"),
        (10, 3, "Dia do Dentista", "saude"), (10, 12, "Nossa Senhora Aparecida", "geral"),
        (10, 18, "Dia do Médico", "saude"), (10, 25, "Dia da Saúde Bucal", "saude"),
        (11, 15, "Proclamação da República", "geral"), (11, "novembro", "Novembro Azul", "campanha"),
        (12, 24, "Véspera de Natal", "comercial"), (12, 25, "Natal", "geral"),
        (12, 31, "Réveillon", "geral"),
    ]

    @router.get("/calendar/events")
    async def calendar_events(year: int, month: int, user: dict = Depends(get_current_user)):
        if user["role"].startswith("client"):
            # cliente vê apenas o próprio
            client_id = user.get("client_id")
            q = {"client_id": client_id, "scheduled_at": {"$exists": True, "$ne": None}}
        else:
            q = {"scheduled_at": {"$exists": True, "$ne": None}}
        contents = await db.content.find(q, {"_id": 0}).to_list(1000)
        # filtra por mês
        events = []
        for c in contents:
            try:
                dt = datetime.fromisoformat(c["scheduled_at"].replace("Z", "+00:00"))
                if dt.year == year and dt.month == month:
                    events.append({
                        "id": c["id"], "type": "content",
                        "title": c["title"], "format": c.get("format"),
                        "status": c.get("status"), "client_id": c.get("client_id"),
                        "date": dt.date().isoformat(), "responsible": c.get("responsible"),
                    })
            except Exception:
                continue
        # holidays no mês
        holidays = [{"day": d, "title": t, "kind": k, "date": f"{year:04d}-{month:02d}-{d:02d}"}
                    for (m, d, t, k) in HOLIDAYS if m == month and isinstance(d, int)]
        # conflitos: mais de 3 no mesmo dia
        from collections import Counter
        counts = Counter(e["date"] for e in events)
        conflicts = [d for d, n in counts.items() if n > 3]
        return {"events": events, "holidays": holidays, "conflicts": conflicts}

    return router
