import time

import pytest
from fastapi.testclient import TestClient

import auth
import main
from purchasing import pick_vendor


# ---------- 구매처 자동 제안 ----------
def test_pick_vendor_cheapest_among_active():
    assert pick_vendor({1: 10.0, 2: 8.5, 3: 9.0}, default_vendor_id=1, active_vendor_ids={1, 2, 3}) == 2


def test_pick_vendor_ignores_inactive_and_unpriced():
    assert pick_vendor({1: 10.0, 2: 5.0, 3: None}, 1, {1, 3}) == 1          # 2번은 비활성
    assert pick_vendor({1: None, 2: None}, 2, {1, 2}) == 2                  # 가격 없음 → 기본 구매처


def test_pick_vendor_tie_prefers_default_then_lowest_id():
    assert pick_vendor({1: 5.0, 2: 5.0}, 2, {1, 2}) == 2
    assert pick_vendor({3: 5.0, 2: 5.0}, 9, {2, 3}) == 2


def test_pick_vendor_nothing_known():
    assert pick_vendor({}, None, {1, 2}) is None


# ---------- 역할 토큰 ----------
def test_token_roles():
    assert auth.token_role(auth.make_session_token("admin")) == "admin"
    assert auth.token_role(auth.make_session_token("staff")) == "staff"
    assert auth.token_role(auth.make_session_token()) == "admin"


def test_role_cannot_be_forged():
    staff = auth.make_session_token("staff")
    expires, _, sig = staff.split(".")
    assert auth.token_role(f"{expires}.admin.{sig}") is None                # 역할만 바꾸면 서명 불일치


def test_legacy_two_part_token_is_admin():
    expires = str(int(time.time()) + 100)
    assert auth.token_role(f"{expires}.{auth._sign(expires)}") == "admin"


# ---------- 경로 권한 ----------
@pytest.fixture()
def client():
    return TestClient(main._core_app)


def test_staff_blocked_from_admin_endpoints(client):
    client.cookies.set("auth-token", auth.make_session_token("staff"))
    for path in ("/transactions", "/dashboard-summary", "/purchasing/compare?date=2026-01-01",
                 "/purchasing/prices", "/purchasing/items", "/sales", "/categories"):
        assert client.get(path).status_code == 403, path
    assert client.put("/purchasing/prices", json={"item_id": 1, "vendor_id": 1, "price": 1}).status_code == 403


def test_staff_can_reach_me_and_staff_paths_pass_middleware(client):
    client.cookies.set("auth-token", auth.make_session_token("staff"))
    assert client.get("/me").json() == {"role": "staff"}
    assert auth._is_staff_path("/purchasing/staff/items")
    assert auth._is_staff_path("/api/purchasing/staff/requests")
    assert not auth._is_staff_path("/purchasing/prices")
    assert not auth._is_staff_path("/purchasing/staffx/items")


def test_admin_me_and_unauthenticated(client):
    assert client.get("/me").status_code == 401
    client.cookies.set("auth-token", auth.make_session_token("admin"))
    assert client.get("/me").json() == {"role": "admin"}


def test_login_roles(client, monkeypatch):
    monkeypatch.setattr(auth, "STAFF_PASSWORD", "staff-pass")
    r = client.post("/login", json={"password": "staff-pass"})
    assert r.status_code == 200 and r.json()["role"] == "staff"
    r = client.post("/login", json={"password": auth.ADMIN_PASSWORD})
    assert r.json()["role"] == "admin"
    monkeypatch.setattr(auth, "STAFF_PASSWORD", None)                       # 미설정이면 직원 로그인 불가
    assert client.post("/login", json={"password": "staff-pass"}).status_code == 401


# ---------- 구매 현황 집계 ----------
def _row(date, item_id, name, vendor, qty, price, category="Produce", unit="case", rid=0):
    return {"id": rid, "date": date, "item_id": item_id, "name": name, "category": category, "order_unit": unit,
            "qty": qty, "vendor": vendor, "vendor_id": None, "unit_price": price}


def test_summarize_totals_vendors_months_items():
    from purchasing import summarize
    rows = [
        _row("2026-02-03", 1, "Lettuce", "US Foods", 2, 30.0, rid=3),
        _row("2026-01-05", 1, "Lettuce", "Restaurant Depot", 3, 24.0, rid=1),
        _row("2026-01-20", 1, "Lettuce", "Restaurant Depot", 1, 27.0, rid=2),
        _row("2026-01-05", 2, "Bacon", "Restaurant Depot", 4, None, category="Meat", rid=4),   # 단가 없음
    ]
    out = summarize(rows)
    assert out["summary"] == {"total_spend": 72.0 + 27.0 + 60.0, "lines": 4, "unpriced_lines": 1, "items": 2}
    vendors = {v["vendor"]: v for v in out["by_vendor"]}
    assert vendors["Restaurant Depot"]["spend"] == 99.0 and vendors["Restaurant Depot"]["lines"] == 3
    assert vendors["US Foods"]["spend"] == 60.0
    assert [v["vendor"] for v in out["by_vendor"]] == ["Restaurant Depot", "US Foods"]       # 금액 큰 순
    assert round(sum(v["share"] for v in out["by_vendor"])) == 100
    assert [(m["month"], m["spend"]) for m in out["by_month"]] == [("2026-01", 99.0), ("2026-02", 60.0)]
    assert {c["category"]: c["spend"] for c in out["by_category"]} == {"Produce": 159.0, "Meat": 0.0}

    lettuce = next(i for i in out["by_item"] if i["name"] == "Lettuce")
    assert lettuce["qty"] == 6 and lettuce["spend"] == 159.0 and lettuce["purchases"] == 3
    assert lettuce["avg_price"] == round(159.0 / 6, 4)                       # 수량 가중 평균 단가
    assert (lettuce["min_price"], lettuce["max_price"]) == (24.0, 30.0)
    assert (lettuce["first_price"], lettuce["last_price"], lettuce["last_date"]) == (24.0, 30.0, "2026-02-03")
    assert lettuce["last_vendor"] == "US Foods" and lettuce["change_pct"] == 25.0       # 24 → 30
    bacon = next(i for i in out["by_item"] if i["name"] == "Bacon")
    assert bacon["avg_price"] is None and bacon["spend"] == 0.0 and bacon["change_pct"] is None


def test_summarize_empty():
    from purchasing import summarize
    out = summarize([])
    assert out["summary"] == {"total_spend": 0.0, "lines": 0, "unpriced_lines": 0, "items": 0}
    assert out["by_item"] == [] and out["by_vendor"] == []


def test_report_endpoint_validates_dates_and_requires_admin(client):
    client.cookies.set("auth-token", auth.make_session_token("staff"))
    assert client.get("/purchasing/report?from=2026-01-01&to=2026-01-31").status_code == 403
    client.cookies.set("auth-token", auth.make_session_token("admin"))
    assert client.get("/purchasing/report?from=bad&to=2026-01-31").status_code == 422
    assert client.get("/purchasing/report?from=2026-02-01&to=2026-01-31").status_code == 422
