"""식재료 주문/구매처 가격 비교.

흐름: 직원이 날짜별 필요 수량 입력(order_requests) → 사장님이 구매처별 가격을 보고 구매처 확정 →
구매처별 주문서 → 발주 처리(단가 스냅샷 저장).
가격은 '품목의 주문 단위' 기준으로 구매처별 수동 입력한다. 변경 이력은 price_history 에 남는다.
"""
import re
from decimal import Decimal
from typing import Callable, Optional

import psycopg2.extras

import purchasing_seed

DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
STATUSES = ('requested', 'ordered', 'received')


def pick_vendor(prices: dict, default_vendor_id: Optional[int], active_vendor_ids: set) -> Optional[int]:
    """구매처 자동 제안: 가격이 입력된 활성 구매처 중 최저가, 동점이면 기본 구매처 우선(없으면 id 순).
    가격이 하나도 없으면 기본 구매처. prices = {vendor_id: price 또는 None}"""
    priced = {v: p for v, p in prices.items() if p is not None and v in active_vendor_ids}
    if not priced:
        return default_vendor_id
    best = min(priced.values())
    tied = sorted(v for v, p in priced.items() if p == best)
    return default_vendor_id if default_vendor_id in tied else tied[0]


def _clean(row: dict) -> dict:
    return {k: (float(v) if isinstance(v, Decimal) else v) for k, v in row.items()}


class PurchasingEngine:
    def __init__(self, get_conn: Callable):
        self.get_conn = get_conn

    # ---------- 공통 ----------
    def _run(self, sql, params=None, fetch=None, commit=False):
        conn = self.get_conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(sql, params or ())
            result = None
            if fetch == 'all':
                result = [_clean(r) for r in cur.fetchall()]
            elif fetch == 'one':
                r = cur.fetchone()
                result = _clean(r) if r else None
            if commit:
                conn.commit()
            return result
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # ---------- 스키마 / 기본 데이터 ----------
    def ensure_schema(self):
        conn = self.get_conn()
        try:
            cur = conn.cursor()
            cur.execute('''
                CREATE TABLE IF NOT EXISTS vendors (
                    id SERIAL PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 0
                )''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS purchase_items (
                    id SERIAL PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    order_unit TEXT NOT NULL DEFAULT 'case',
                    pack_size TEXT NOT NULL DEFAULT '',
                    default_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 0
                )''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS vendor_prices (
                    item_id INTEGER NOT NULL REFERENCES purchase_items(id) ON DELETE CASCADE,
                    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
                    price NUMERIC(14,4),
                    vendor_code TEXT NOT NULL DEFAULT '',
                    note TEXT NOT NULL DEFAULT '',
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY (item_id, vendor_id)
                )''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS price_history (
                    id SERIAL PRIMARY KEY,
                    item_id INTEGER NOT NULL REFERENCES purchase_items(id) ON DELETE CASCADE,
                    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
                    price NUMERIC(14,4),
                    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS order_requests (
                    id SERIAL PRIMARY KEY,
                    order_date TEXT NOT NULL,
                    item_id INTEGER NOT NULL REFERENCES purchase_items(id) ON DELETE CASCADE,
                    qty NUMERIC(10,2) NOT NULL,
                    requested_by TEXT NOT NULL DEFAULT '',
                    note TEXT NOT NULL DEFAULT '',
                    assigned_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
                    unit_price NUMERIC(14,4),
                    status TEXT NOT NULL DEFAULT 'requested',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE (order_date, item_id)
                )''')
            conn.commit()
            self._seed(conn)
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _seed(self, conn):
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM vendors")
        if cur.fetchone()[0] == 0:
            for i, name in enumerate(purchasing_seed.VENDORS):
                cur.execute("INSERT INTO vendors (name, sort_order) VALUES (%s, %s) ON CONFLICT DO NOTHING", (name, i))
        cur.execute("SELECT COUNT(*) FROM purchase_items")
        if cur.fetchone()[0] == 0:
            cur.execute("SELECT id, name FROM vendors")
            vid = {n: i for i, n in cur.fetchall()}
            order = 0

            def add(name, category, pack, vendor, codes):
                nonlocal order
                cur.execute(
                    "INSERT INTO purchase_items (name, category, pack_size, default_vendor_id, sort_order) "
                    "VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING id",
                    (name, category, pack, vid.get(vendor), order))
                row = cur.fetchone()
                order += 1
                if row:
                    for v, code, note in codes:
                        cur.execute(
                            "INSERT INTO vendor_prices (item_id, vendor_id, vendor_code, note) VALUES (%s, %s, %s, %s) "
                            "ON CONFLICT DO NOTHING", (row[0], vid[v], code, note))

            for name, category, pack, vendor, code in purchasing_seed.ITEMS:
                add(name, category, pack, vendor, [(vendor, code, "")])
            for name, category, pack, vendor, codes in purchasing_seed.SHARED_ITEMS:
                add(name, category, pack, vendor, codes)
        conn.commit()

    # ---------- 구매처 ----------
    def list_vendors(self, include_inactive=True):
        sql = "SELECT * FROM vendors" + ("" if include_inactive else " WHERE active") + " ORDER BY sort_order, id"
        return self._run(sql, fetch='all')

    def add_vendor(self, name: str):
        row = self._run(
            "INSERT INTO vendors (name, sort_order) VALUES (%s, COALESCE((SELECT MAX(sort_order) + 1 FROM vendors), 0)) "
            "ON CONFLICT (name) DO UPDATE SET active = TRUE RETURNING *", (name.strip(),), fetch='one', commit=True)
        return row

    def set_vendor_active(self, vendor_id: int, active: bool):
        self._run("UPDATE vendors SET active = %s WHERE id = %s", (active, vendor_id), commit=True)

    # ---------- 품목 ----------
    def list_items(self, include_inactive=False):
        sql = "SELECT * FROM purchase_items" + ("" if include_inactive else " WHERE active") + \
              " ORDER BY category, sort_order, name"
        return self._run(sql, fetch='all')

    def add_item(self, name, category='', order_unit='case', pack_size='', default_vendor_id=None):
        """같은 이름(대소문자 무시)이 삭제된 상태로 있으면 되살리고 값을 갱신한다."""
        name = name.strip()
        existing = self._run("SELECT id FROM purchase_items WHERE lower(name) = lower(%s)", (name,), fetch='one')
        if existing:
            return self._run(
                "UPDATE purchase_items SET active = TRUE, category = %s, order_unit = %s, pack_size = %s, "
                "default_vendor_id = %s WHERE id = %s RETURNING *",
                (category, order_unit, pack_size, default_vendor_id, existing['id']), fetch='one', commit=True)
        return self._run(
            "INSERT INTO purchase_items (name, category, order_unit, pack_size, default_vendor_id, sort_order) "
            "VALUES (%s, %s, %s, %s, %s, COALESCE((SELECT MAX(sort_order) + 1 FROM purchase_items), 0)) RETURNING *",
            (name, category, order_unit, pack_size, default_vendor_id), fetch='one', commit=True)

    ITEM_FIELDS = ('name', 'category', 'order_unit', 'pack_size', 'default_vendor_id', 'sort_order')

    def update_item(self, item_id: int, fields: dict):
        fields = {k: v for k, v in fields.items() if k in self.ITEM_FIELDS}
        if not fields:
            return True
        sets = ", ".join(f"{k} = %s" for k in fields)
        self._run(f"UPDATE purchase_items SET {sets} WHERE id = %s", (*fields.values(), item_id), commit=True)
        return True

    def deactivate_item(self, item_id: int):
        """삭제 = 비활성화. 과거 주문/가격 이력은 유지된다."""
        self._run("UPDATE purchase_items SET active = FALSE WHERE id = %s", (item_id,), commit=True)

    # ---------- 가격 ----------
    def list_prices(self):
        return self._run("SELECT item_id, vendor_id, price, vendor_code, note, updated_at::text AS updated_at "
                         "FROM vendor_prices", fetch='all')

    def set_price(self, item_id: int, vendor_id: int, price: Optional[float], note: str = '', vendor_code: str = ''):
        """가격(비어 있으면 None=아직 모름)을 저장한다. 값이 바뀌면 이력에 추가."""
        old = self._run("SELECT price FROM vendor_prices WHERE item_id = %s AND vendor_id = %s",
                        (item_id, vendor_id), fetch='one')
        self._run(
            "INSERT INTO vendor_prices (item_id, vendor_id, price, note, vendor_code, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, now()) "
            "ON CONFLICT (item_id, vendor_id) DO UPDATE SET price = EXCLUDED.price, note = EXCLUDED.note, "
            "vendor_code = EXCLUDED.vendor_code, updated_at = now()",
            (item_id, vendor_id, price, note, vendor_code), commit=True)
        if price is not None and (old is None or old['price'] != price):
            self._run("INSERT INTO price_history (item_id, vendor_id, price) VALUES (%s, %s, %s)",
                      (item_id, vendor_id, price), commit=True)

    def remove_price(self, item_id: int, vendor_id: int):
        """구매처가 해당 품목을 취급하지 않는 경우."""
        self._run("DELETE FROM vendor_prices WHERE item_id = %s AND vendor_id = %s", (item_id, vendor_id), commit=True)

    def price_history(self, item_id: int):
        return self._run(
            "SELECT h.vendor_id, v.name AS vendor, h.price, h.changed_at::text AS changed_at "
            "FROM price_history h JOIN vendors v ON v.id = h.vendor_id WHERE h.item_id = %s "
            "ORDER BY h.changed_at DESC LIMIT 100", (item_id,), fetch='all')

    # ---------- 주문 요청 (직원 입력) ----------
    def get_requests(self, order_date: str):
        return self._run("SELECT item_id, qty, status FROM order_requests WHERE order_date = %s", (order_date,), fetch='all')

    def set_request_qty(self, order_date: str, item_id: int, qty: float, requested_by: str = ''):
        """수량 입력/수정. 0 이하면 요청 삭제. 이미 발주된 줄은 수정할 수 없다(False 반환)."""
        row = self._run("SELECT id, status FROM order_requests WHERE order_date = %s AND item_id = %s",
                        (order_date, item_id), fetch='one')
        if row and row['status'] != 'requested':
            return False
        if qty <= 0:
            if row:
                self._run("DELETE FROM order_requests WHERE id = %s", (row['id'],), commit=True)
            return True
        self._run(
            "INSERT INTO order_requests (order_date, item_id, qty, requested_by) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (order_date, item_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()",
            (order_date, item_id, qty, requested_by), commit=True)
        return True

    # ---------- 가격 비교 / 주문서 (사장님) ----------
    def compare(self, order_date: str):
        """요청된 품목마다 구매처별 가격, 제안/확정 구매처, 합계를 계산한다."""
        lines = self._run(
            "SELECT r.id AS request_id, r.item_id, i.name, i.category, i.order_unit, i.pack_size, r.qty, r.status, "
            "r.assigned_vendor_id, r.unit_price AS locked_price, i.default_vendor_id "
            "FROM order_requests r JOIN purchase_items i ON i.id = r.item_id "
            "WHERE r.order_date = %s ORDER BY i.category, i.sort_order, i.name", (order_date,), fetch='all')
        vendors = self.list_vendors()
        active_ids = {v['id'] for v in vendors if v['active']}
        prices_by_item: dict = {}
        for p in self.list_prices():
            prices_by_item.setdefault(p['item_id'], []).append(p)

        out, totals = [], {}
        for ln in lines:
            plist = prices_by_item.get(ln['item_id'], [])
            price_map = {p['vendor_id']: p['price'] for p in plist}
            suggested = pick_vendor(price_map, ln['default_vendor_id'], active_ids)
            vendor_id = ln['assigned_vendor_id'] or suggested
            unit_price = ln['locked_price'] if ln['locked_price'] is not None else price_map.get(vendor_id)
            total = round(unit_price * ln['qty'], 2) if unit_price is not None else None
            ln.update({
                "prices": [{"vendor_id": p['vendor_id'], "price": p['price'], "note": p['note'],
                            "vendor_code": p['vendor_code']} for p in plist],
                "suggested_vendor_id": suggested,
                "vendor_id": vendor_id,
                "unit_price": unit_price,
                "line_total": total,
            })
            del ln['locked_price']
            out.append(ln)
            if vendor_id is not None:
                t = totals.setdefault(vendor_id, {"vendor_id": vendor_id, "total": 0.0, "lines": 0, "unpriced": 0})
                t["lines"] += 1
                if total is None:
                    t["unpriced"] += 1
                else:
                    t["total"] = round(t["total"] + total, 2)
        return {"date": order_date, "vendors": vendors, "lines": out, "vendor_totals": list(totals.values())}

    def assign_vendor(self, request_id: int, vendor_id: Optional[int]):
        """구매처를 수동 지정(None 이면 자동 제안으로 되돌림). 발주된 줄은 변경 불가(False)."""
        row = self._run("SELECT status FROM order_requests WHERE id = %s", (request_id,), fetch='one')
        if not row or row['status'] != 'requested':
            return False
        self._run("UPDATE order_requests SET assigned_vendor_id = %s, updated_at = now() WHERE id = %s",
                  (vendor_id, request_id), commit=True)
        return True

    def mark_ordered(self, order_date: str, vendor_id: int):
        """해당 날짜의 이 구매처 주문을 발주 처리: 구매처 확정 + 현재 단가 스냅샷 저장."""
        data = self.compare(order_date)
        n = 0
        for ln in data['lines']:
            if ln['vendor_id'] == vendor_id and ln['status'] == 'requested':
                self._run("UPDATE order_requests SET status = 'ordered', assigned_vendor_id = %s, unit_price = %s, "
                          "updated_at = now() WHERE id = %s", (vendor_id, ln['unit_price'], ln['request_id']), commit=True)
                n += 1
        return n

    def set_status(self, request_id: int, status: str):
        if status not in STATUSES:
            return False
        self._run("UPDATE order_requests SET status = %s, updated_at = now() WHERE id = %s",
                  (status, request_id), commit=True)
        return True
