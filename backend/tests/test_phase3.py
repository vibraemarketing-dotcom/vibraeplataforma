"""VIBRAE OS Phase 3 backend tests: Stories, Metrics/Reports, Tasks with Gantt."""
import os
import time
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vibrae-central.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"email": "admin@vibrae.com", "password": "vibrae2026"}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def aurora_id(admin_session):
    r = admin_session.get(f"{API}/clients", timeout=15)
    assert r.status_code == 200
    aurora = next((c for c in r.json() if "Aurora" in c["trade_name"]), None)
    assert aurora, "Aurora client not seeded"
    return aurora["id"]


# ---------------- Regression: sidebar-visible core endpoints ----------------
class TestRegressionPhase12:
    def test_dashboard_summary(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/summary", timeout=15)
        assert r.status_code == 200

    def test_clients_list(self, admin_session):
        r = admin_session.get(f"{API}/clients", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_leads_list(self, admin_session):
        r = admin_session.get(f"{API}/leads", timeout=15)
        assert r.status_code == 200

    def test_content_list(self, admin_session):
        r = admin_session.get(f"{API}/content", timeout=15)
        assert r.status_code == 200

    def test_financial_summary(self, admin_session):
        r = admin_session.get(f"{API}/financial/summary", timeout=15)
        assert r.status_code == 200


# ---------------- Story Sequences ----------------
class TestStorySequences:
    def test_list_sequences_for_aurora(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/story-sequences", params={"client_id": aurora_id}, timeout=15)
        assert r.status_code == 200
        seqs = r.json()
        assert len(seqs) >= 1, "Expected at least 1 seeded sequence for Aurora"
        seq = next((s for s in seqs if "Bastidores" in s.get("title", "")), seqs[0])
        assert seq["client_id"] == aurora_id
        assert len(seq.get("frames", [])) == 4
        assert seq["frames"][0]["index"] == 0

    def test_send_approval_updates_status(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/story-sequences", params={"client_id": aurora_id}).json()
        sid = r[0]["id"]
        r2 = admin_session.post(f"{API}/story-sequences/{sid}/send-approval", timeout=15)
        assert r2.status_code == 200
        # verify status
        seq = admin_session.get(f"{API}/story-sequences",
                                params={"client_id": aurora_id}).json()
        target = next(s for s in seq if s["id"] == sid)
        assert target["status"] == "aguardando_aprovacao"

    def test_batch_approve(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/story-sequences", params={"client_id": aurora_id}).json()
        sid = r[0]["id"]
        r2 = admin_session.post(f"{API}/story-sequences/{sid}/batch-approval",
                                json={"decision": "approved", "comment": "TEST_ok"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("status") == "aprovado"

    def test_update_sequence_frames(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/story-sequences", params={"client_id": aurora_id}).json()
        sid = r[0]["id"]
        frames = r[0]["frames"]
        frames[0]["text"] = "TEST_updated_" + str(int(time.time()))
        r2 = admin_session.patch(f"{API}/story-sequences/{sid}",
                                 json={"frames": frames}, timeout=15)
        assert r2.status_code == 200
        updated = r2.json()
        assert updated["frames"][0]["text"].startswith("TEST_updated_")

    def test_create_and_delete_sequence(self, admin_session, aurora_id):
        payload = {
            "client_id": aurora_id,
            "title": "TEST_seq_" + str(int(time.time())),
            "objective": "test",
            "frames": [{"index": 0, "text": "hi", "background": "#000", "text_color": "#fff"}]
        }
        r = admin_session.post(f"{API}/story-sequences", json=payload, timeout=15)
        assert r.status_code == 200
        sid = r.json()["id"]
        # delete
        r2 = admin_session.delete(f"{API}/story-sequences/{sid}", timeout=15)
        assert r2.status_code == 200


# ---------------- Metrics ----------------
class TestMetrics:
    def test_list_metrics_aurora(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/metrics", params={"client_id": aurora_id}, timeout=15)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 3, f"Expected 3 monthly metrics for Aurora, got {len(docs)}"
        for d in docs:
            assert d["client_id"] == aurora_id
            assert "followers" in d and "reach" in d

    def test_upsert_metrics(self, admin_session, aurora_id):
        payload = {
            "client_id": aurora_id,
            "month": 1, "year": 2020,  # TEST period unlikely to collide
            "followers": 100, "reach": 200, "impressions": 300,
            "engagement": 1.5, "profile_visits": 10, "website_clicks": 2,
            "saves": 5, "shares": 3, "comments": 1,
            "stories_reach": 50, "reels_views": 80,
            "source": "manual"
        }
        r = admin_session.put(f"{API}/metrics", json=payload, timeout=15)
        assert r.status_code == 200
        got = r.json()
        assert got["followers"] == 100

        # upsert again — should not duplicate
        payload["followers"] = 555
        r2 = admin_session.put(f"{API}/metrics", json=payload, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["followers"] == 555


# ---------------- Reports ----------------
class TestReports:
    def test_list_reports_aurora(self, admin_session, aurora_id):
        r = admin_session.get(f"{API}/reports", params={"client_id": aurora_id}, timeout=15)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1, "Expected at least 1 seeded report"
        assert docs[0]["client_id"] == aurora_id
        assert docs[0].get("summary")

    def test_get_report_detail_includes_metrics_and_top(self, admin_session, aurora_id):
        docs = admin_session.get(f"{API}/reports", params={"client_id": aurora_id}).json()
        rid = docs[0]["id"]
        r = admin_session.get(f"{API}/reports/{rid}", timeout=15)
        assert r.status_code == 200
        detail = r.json()
        assert "top_content" in detail
        assert "metrics" in detail
        assert isinstance(detail.get("highlights"), list)
        assert isinstance(detail.get("next_steps"), list)

    def test_upsert_report(self, admin_session, aurora_id):
        payload = {
            "client_id": aurora_id,
            "month": 2, "year": 2020,
            "summary": "TEST_summary",
            "highlights": ["a", "b"],
            "learnings": ["l1"],
            "risks": [],
            "next_steps": ["step1"],
            "top_content_ids": [],
            "agency_notes": "TEST"
        }
        r = admin_session.put(f"{API}/reports", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["summary"] == "TEST_summary"

        # upsert should return same id
        payload["summary"] = "TEST_summary_v2"
        r2 = admin_session.put(f"{API}/reports", json=payload, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["summary"] == "TEST_summary_v2"


# ---------------- Tasks & Gantt ----------------
class TestTasks:
    def test_list_tasks(self, admin_session):
        r = admin_session.get(f"{API}/tasks", timeout=15)
        assert r.status_code == 200
        tasks = r.json()
        assert len(tasks) >= 10, f"Expected >=10 seeded tasks, got {len(tasks)}"
        for t in tasks:
            assert "start_date" in t and "end_date" in t
            assert t.get("status") in ["pendente", "em_andamento", "concluida", "atrasada"]

    def test_capacity(self, admin_session):
        r = admin_session.get(f"{API}/tasks/capacity", timeout=15)
        assert r.status_code == 200, f"capacity endpoint failed: {r.text}"
        cap = r.json()
        assert isinstance(cap, list)
        assert len(cap) >= 4, f"Expected >=4 assignees, got {len(cap)}"
        for c in cap:
            assert c["level"] in ["disponivel", "bem_distribuido", "proximo_limite", "sobrecarregado"]
            assert isinstance(c["count"], int) and c["count"] > 0

    def test_create_task(self, admin_session):
        today = datetime.now(timezone.utc).date().isoformat()
        end = (datetime.now(timezone.utc) + timedelta(days=3)).date().isoformat()
        payload = {
            "title": "TEST_task_" + str(int(time.time())),
            "kind": "geral",
            "start_date": today,
            "end_date": end,
            "assignee": "TEST_Assignee",
            "status": "pendente",
            "priority": "media",
            "description": ""
        }
        r = admin_session.post(f"{API}/tasks", json=payload, timeout=15)
        assert r.status_code == 200
        created = r.json()
        assert created["title"].startswith("TEST_task_")
        tid = created["id"]

        # GET verify persistence
        all_tasks = admin_session.get(f"{API}/tasks").json()
        assert any(t["id"] == tid for t in all_tasks)

        # PATCH — cycle status
        r2 = admin_session.patch(f"{API}/tasks/{tid}", json={"status": "em_andamento"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "em_andamento"

        r3 = admin_session.patch(f"{API}/tasks/{tid}", json={"status": "concluida"}, timeout=15)
        assert r3.status_code == 200
        assert r3.json()["status"] == "concluida"

        # DELETE — cleanup
        r4 = admin_session.delete(f"{API}/tasks/{tid}", timeout=15)
        assert r4.status_code == 200

        # verify removed
        all_after = admin_session.get(f"{API}/tasks").json()
        assert not any(t["id"] == tid for t in all_after)

    def test_patch_missing_task_returns_404(self, admin_session):
        r = admin_session.patch(f"{API}/tasks/nonexistent-task-id",
                                json={"status": "pendente"}, timeout=15)
        assert r.status_code == 404
