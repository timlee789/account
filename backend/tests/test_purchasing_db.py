"""주문/가격 비교 통합 테스트. TEST_DATABASE_URL 이 있을 때만 실행된다.
운영 테이블을 건드리지 않도록 임시 스키마를 만들어 그 안에서만 실행하고 끝나면 삭제한다."""
import os
import uuid

import psycopg2
import pytest
from fastapi.testclient import TestClient

import auth
import deps
import main
import purchasing as purchasing_module
from routers import purchasing as purchasing_router

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL 이 없어 DB 통합 테스트를 건너뜀")

DATE = "2026-03-02"


@pytest.fixture(scope="module")
def store():
    schema = f"test_purch_{uuid.uuid4().hex[:8]}"
    admin = psycopg2.connect(URL)
    admin.autocommit = True
    admin.cursor().execute(f"CREATE SCHEMA {schema}")

    def get_conn():
        conn = psycopg2.connect(URL)
        cur = conn.cursor()
        cur.execute(f"SET search_path TO {schema}")
        conn.commit()
        return conn

    engine = purchasing_module.PurchasingEngine(get_conn)
    # conftest 가 무력화하기 전의 원본 구현을 보관해 둔 real_ensure_schema 로 스키마 생성
    engine.ensure_schema = engine.real_ensure_schema
    engine.ensure_schema()
    try:
        yield engine
    finally:
        admin.cursor().execute(f"DROP SCHEMA {schema} CASCADE")
        admin.close()


def vendor_id(store, name):
    return next(v["id"] for v in store.list_vendors() if v["name"] == name)


def item_id(store, name):
    return next(i["id"] for i in store.list_items() if i["name"] == name)


def test_seed_vendors_and_items(store):
    assert [v["name"] for v in store.list_vendors()] == [
        "US Foods", "Sysco", "PFG", "R J Neese", "Best Supply", "Restaurant Depot"]
    names = {i["name"] for i in store.list_items()}
    assert {"Ground Beef 81/19 (Chub)", "Bacon", "Cabbage", "Large Buns", "Wheat Bread", "Sugar"} <= names
    assert len(names) == 55   # US Foods 42 + 공유(Lettuce) 1 + Restaurant Depot 7 + R J Neese 5
    lettuce = item_id(store, "Lettuce")
    carriers = {p["vendor_id"] for p in store.list_prices() if p["item_id"] == lettuce}
    assert carriers == {vendor_id(store, "US Foods"), vendor_id(store, "Restaurant Depot")}


def test_reseed_is_idempotent(store):
    before = len(store.list_items())
    store.ensure_schema()
    assert len(store.list_items()) == before


def test_add_delete_and_reactivate_item(store):
    it = store.add_item("Test Napkin", "Disposables", "case", "12/500")
    assert any(i["id"] == it["id"] for i in store.list_items())
    store.deactivate_item(it["id"])
    assert all(i["id"] != it["id"] for i in store.list_items())
    again = store.add_item("test napkin", "Disposables", "box")            # 대소문자 무시, 되살림
    assert again["id"] == it["id"] and again["active"] and again["order_unit"] == "box"
    store.update_item(it["id"], {"pack_size": "6/1000", "id": 999, "evil": "x"})
    assert next(i for i in store.list_items() if i["id"] == it["id"])["pack_size"] == "6/1000"


def test_price_history_only_on_change(store):
    lettuce, usf = item_id(store, "Lettuce"), vendor_id(store, "US Foods")
    store.set_price(lettuce, usf, 22.5, "bag")
    store.set_price(lettuce, usf, 22.5, "bag (same)")
    store.set_price(lettuce, usf, 24.0)
    prices = [h["price"] for h in store.price_history(lettuce) if h["vendor_id"] == usf]
    assert prices == [24.0, 22.5]


def test_order_flow_compare_assign_ordered_lock(store):
    lettuce = item_id(store, "Lettuce")
    usf, rd = vendor_id(store, "US Foods"), vendor_id(store, "Restaurant Depot")
    store.set_price(lettuce, usf, 30.0)
    store.set_price(lettuce, rd, 24.0)
    bacon = item_id(store, "Bacon")                                          # 가격 미입력 → 기본 구매처(RD)

    assert store.set_request_qty(DATE, lettuce, 2, "staff")
    assert store.set_request_qty(DATE, bacon, 1.5, "staff")
    assert store.set_request_qty(DATE, lettuce, 3, "staff")                  # 같은 날짜/품목은 수정(중복 행 없음)
    assert len(store.get_requests(DATE)) == 2

    data = store.compare(DATE)
    ln = {x["name"]: x for x in data["lines"]}
    assert ln["Lettuce"]["qty"] == 3 and ln["Lettuce"]["vendor_id"] == rd     # 최저가 RD
    assert ln["Lettuce"]["unit_price"] == 24.0 and ln["Lettuce"]["line_total"] == 72.0
    assert ln["Bacon"]["vendor_id"] == rd and ln["Bacon"]["line_total"] is None
    totals = {t["vendor_id"]: t for t in data["vendor_totals"]}
    assert totals[rd]["total"] == 72.0 and totals[rd]["lines"] == 2 and totals[rd]["unpriced"] == 1

    assert store.assign_vendor(ln["Lettuce"]["request_id"], usf)             # 수동으로 US Foods 지정
    assert next(x for x in store.compare(DATE)["lines"] if x["name"] == "Lettuce")["unit_price"] == 30.0

    assert store.mark_ordered(DATE, usf) == 1
    store.set_price(lettuce, usf, 99.0)                                       # 발주 후 가격이 바뀌어도 스냅샷 유지
    after = next(x for x in store.compare(DATE)["lines"] if x["name"] == "Lettuce")
    assert after["status"] == "ordered" and after["unit_price"] == 30.0 and after["line_total"] == 90.0
    assert store.set_request_qty(DATE, lettuce, 10, "staff") is False         # 발주된 줄은 직원이 수정 불가
    assert store.assign_vendor(after["request_id"], rd) is False

    assert store.set_request_qty(DATE, bacon, 0, "staff")                     # 0 이면 요청 삭제
    assert all(r["item_id"] != bacon for r in store.get_requests(DATE))


def test_api_roles_end_to_end(store, monkeypatch):
    monkeypatch.setattr(purchasing_router, "purchasing", store)
    client = TestClient(main._core_app)

    client.cookies.set("auth-token", auth.make_session_token("staff"))
    items = client.get("/purchasing/staff/items").json()["data"]
    assert items and set(items[0]) == {"id", "name", "category", "order_unit", "pack_size"}   # 가격/구매처 비노출
    r = client.put("/purchasing/staff/requests", json={"date": "2026-04-01", "item_id": items[0]["id"], "qty": 4})
    assert r.status_code == 200
    got = client.get("/purchasing/staff/requests", params={"date": "2026-04-01"}).json()["data"]
    assert got[0]["qty"] == 4
    assert client.put("/purchasing/staff/requests", json={"date": "bad", "item_id": 1, "qty": 1}).status_code == 422
    assert client.put("/purchasing/staff/requests", json={"date": "2026-04-01", "item_id": 1, "qty": -1}).status_code == 422
    assert client.get("/purchasing/compare", params={"date": "2026-04-01"}).status_code == 403

    client.cookies.set("auth-token", auth.make_session_token("admin"))
    cmp_ = client.get("/purchasing/compare", params={"date": "2026-04-01"}).json()
    assert len(cmp_["lines"]) == 1 and len(cmp_["vendors"]) == 6
