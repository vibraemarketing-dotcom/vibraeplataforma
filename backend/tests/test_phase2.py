"""VIBRAE OS Phase 2 backend tests: Brand Kit, IA VIBRAE, Compliance, Financeiro, Calendário."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vibrae-central.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "admin@vibrae.com", "password": "vibrae2026"}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def aurora_id(admin_session):
    r = admin_session.get(f"{API}/clients", timeout=15)
    assert r.status_code == 200
    clients = r.json()
    aurora = next((c for c in clients if "Aurora" in c["trade_name"]), None)
    assert aurora, "Aurora client not seeded"
    return aurora["id"]


# ---------------- Regression: Phase 1 login ----------------
class TestAuthRegression:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "admin@vibrae.com", "password": "vibrae2026"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["role"] == "superadmin"

    def test_login_bad_credentials(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "admin@vibrae.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401


# ---------------- Brand Kit ----------------
class TestBrandKit:
    def test_get_aurora_brand_kit(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/clients/{aurora_id}/brand-kit", timeout=15)
        assert r.status_code == 200
        bk = r.json()
        assert bk.get("council") == "estetica"
        assert bk.get("tone_of_voice")
        assert isinstance(bk.get("pillars"), list) and len(bk["pillars"]) > 0
        assert "milagre" in [w.lower() for w in bk.get("forbidden_words", [])]

    def test_put_brand_kit_persists(self, admin_session, aurora_id):
        # Read current
        cur = admin_session.get(f"{API}/clients/{aurora_id}/brand-kit").json()
        new_tone = "TEST_tone_" + str(int(time.time()))
        payload = {
            "tone_of_voice": new_tone,
            "audience": cur.get("audience", ""),
            "persona": cur.get("persona", ""),
            "pillars": cur.get("pillars", []),
            "allowed_words": cur.get("allowed_words", []),
            "forbidden_words": cur.get("forbidden_words", []),
            "ctas": cur.get("ctas", []),
            "hashtags": cur.get("hashtags", ""),
            "color_primary": cur.get("color_primary", ""),
            "color_secondary": cur.get("color_secondary", ""),
            "references": cur.get("references", ""),
            "council": cur.get("council", "estetica"),
            "council_number": cur.get("council_number", ""),
            "responsible_technician": cur.get("responsible_technician", ""),
            "archetype": cur.get("archetype", ""),
        }
        r = admin_session.put(f"{API}/clients/{aurora_id}/brand-kit", json=payload, timeout=15)
        assert r.status_code == 200
        # Verify persisted
        r2 = admin_session.get(f"{API}/clients/{aurora_id}/brand-kit").json()
        assert r2["tone_of_voice"] == new_tone
        # Restore
        payload["tone_of_voice"] = cur.get("tone_of_voice", "")
        admin_session.put(f"{API}/clients/{aurora_id}/brand-kit", json=payload)


# ---------------- Compliance ----------------
class TestCompliance:
    def test_low_risk_clean_text(self, admin_session):
        r = admin_session.post(f"{API}/compliance/check",
                               json={"text": "Agende sua avaliação para conversar sobre seu cuidado facial."}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["risk"] == "baixo"
        assert d["findings"] == []

    def test_high_risk_multiple_forbidden(self, admin_session, aurora_id):
        # 'garantido' + 'promoção' + 'R$ 199' + 'antes e depois' + 'cura' → severity 3 multiple → bloqueado
        text = "Resultado garantido em nossa promoção especial R$ 199! Veja antes e depois. Cura definitiva."
        r = admin_session.post(f"{API}/compliance/check",
                               json={"text": text, "client_id": aurora_id}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["risk"] in ("bloqueado", "alto")
        rules = [f["rule"] for f in d["findings"]]
        # sanity: should detect promoção/preço/antes e depois/garantido
        joined = " ".join(rules).lower()
        assert "promo" in joined or "preço" in joined or "preco" in joined or "divulgação de preço" in joined or "garantia" in joined.lower()
        assert any("antes" in r.lower() for r in rules), f"Expected antes-e-depois in {rules}"
        assert d["score"] >= 6

    def test_superlative_atencao(self, admin_session):
        r = admin_session.post(f"{API}/compliance/check",
                               json={"text": "Somos o melhor da região em cuidados."}, timeout=15)
        d = r.json()
        assert d["risk"] in ("atencao", "alto"), f"got {d['risk']} for superlative"

    def test_content_compliance_endpoint(self, admin_session):
        # Get any content and run compliance
        contents = admin_session.get(f"{API}/content").json()
        assert len(contents) > 0
        cid = contents[0]["id"]
        r = admin_session.post(f"{API}/content/{cid}/compliance-check", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "risk" in d and "findings" in d and "disclaimer" in d


# ---------------- Financeiro ----------------
class TestFinancial:
    def test_summary_shape_and_mrr(self, admin_session):
        r = admin_session.get(f"{API}/financial/summary", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("mrr", "revenue_month", "expenses_month", "profit_month",
                  "receivable_total", "overdue_total", "overdue_count", "series"):
            assert k in d, f"Missing key {k}"
        # 4 active clients: Aurora 4800 + Rafael 6200 + Marina 2800 = 13800 (only 3 ativos, Sorriso is onboarding, Vida is pausado)
        assert d["mrr"] == 13800, f"MRR expected 13800, got {d['mrr']}"
        assert isinstance(d["series"], list) and len(d["series"]) == 6

    def test_transactions_list(self, admin_session):
        r = admin_session.get(f"{API}/financial/transactions", timeout=15)
        assert r.status_code == 200
        txs = r.json()
        assert len(txs) > 0
        # Fields validation
        for t in txs[:3]:
            assert "id" in t and "type" in t and "amount" in t and "status" in t

    def test_mark_pending_as_paid(self, admin_session):
        txs = admin_session.get(f"{API}/financial/transactions").json()
        pending = [t for t in txs if t["status"] == "pendente"]
        if not pending:
            pytest.skip("No pending transactions to test")
        tid = pending[0]["id"]
        r = admin_session.patch(f"{API}/financial/transactions/{tid}",
                                json={"status": "pago"}, timeout=15)
        assert r.status_code == 200
        updated = r.json()
        assert updated["status"] == "pago"
        assert updated.get("paid_at") is not None
        # Restore
        admin_session.patch(f"{API}/financial/transactions/{tid}",
                            json={"status": "pendente"})

    def test_create_transaction_persists(self, admin_session):
        payload = {
            "type": "despesa", "category": "TEST_category",
            "description": "TEST_transaction_" + str(int(time.time())),
            "amount": 123.45, "due_date": "2026-02-15",
            "status": "pendente", "payment_method": "PIX",
        }
        r = admin_session.post(f"{API}/financial/transactions", json=payload, timeout=15)
        assert r.status_code == 200
        created = r.json()
        assert created["description"] == payload["description"]
        assert created["amount"] == 123.45
        # Verify persistence via list
        txs = admin_session.get(f"{API}/financial/transactions").json()
        assert any(t["id"] == created["id"] for t in txs)

    def test_profitability(self, admin_session):
        r = admin_session.get(f"{API}/financial/profitability", timeout=15)
        assert r.status_code == 200
        prof = r.json()
        assert isinstance(prof, list) and len(prof) > 0
        for p in prof:
            assert p["rating"] in ("muito_rentavel", "rentavel", "atencao", "prejuizo")
            assert "margin" in p and "revenue" in p and "profit" in p


# ---------------- Calendário ----------------
class TestCalendar:
    def test_calendar_current_month(self, admin_session):
        # Any month should return valid shape
        import datetime
        now = datetime.datetime.now()
        r = admin_session.get(f"{API}/calendar/events",
                              params={"year": now.year, "month": now.month}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("events", "holidays", "conflicts"):
            assert k in d and isinstance(d[k], list)

    def test_calendar_holidays_jul(self, admin_session):
        r = admin_session.get(f"{API}/calendar/events",
                              params={"year": 2026, "month": 7}, timeout=15).json()
        titles = [h["title"] for h in r["holidays"]]
        assert any("Nutricionista" in t for t in titles), f"July should include Nutricionista, got {titles}"

    def test_calendar_holidays_sep(self, admin_session):
        r = admin_session.get(f"{API}/calendar/events",
                              params={"year": 2026, "month": 9}, timeout=15).json()
        titles = [h["title"] for h in r["holidays"]]
        assert any("Fisioterapia" in t for t in titles)

    def test_calendar_holidays_oct(self, admin_session):
        r = admin_session.get(f"{API}/calendar/events",
                              params={"year": 2026, "month": 10}, timeout=15).json()
        titles = [h["title"] for h in r["holidays"]]
        assert any("Dentista" in t for t in titles)


# ---------------- IA VIBRAE (real LLM — slow, allow 60s) ----------------
class TestAI:
    def test_ai_generate_caption(self, admin_session, aurora_id):
        payload = {
            "client_id": aurora_id,
            "tool": "caption",
            "objective": "Divulgar consulta de avaliação",
            "orientation": "",
            "content_format": "",
        }
        r = admin_session.post(f"{API}/ai/generate", json=payload, timeout=90)
        assert r.status_code == 200, f"AI failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d["tool"] == "caption"
        assert "raw" in d and d["raw"]
        # parsed JSON — should contain caption
        if d.get("data"):
            data = d["data"]
            assert "caption" in data or "hook" in data, f"Expected caption/hook in {list(data.keys())}"
