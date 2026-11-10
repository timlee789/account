"""금액 컬럼을 REAL(float4) -> NUMERIC 으로 변환하는 1회성 마이그레이션.

사용법:
    python migrate_money_to_numeric.py            # dry-run: 변경 대상과 반올림으로 값이 바뀌는 행 수만 출력
    python migrate_money_to_numeric.py --apply    # 실제 변환 (단일 트랜잭션, 실패 시 전체 롤백)

* REAL -> NUMERIC 직접 캐스트는 유효숫자 6자리로 잘려 센트가 사라지므로 double precision 을 거쳐 변환한다.
* 이미 NUMERIC 인 컬럼은 건너뛰므로 여러 번 실행해도 안전하다.
* 실행 전 DB 백업(예: Supabase 백업/스냅샷)을 권장한다.
"""
import os
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv()

# (table, column) -> NUMERIC 정밀도
SCALE_OVERRIDES = {("invoice_items", "quantity"): (14, 3), ("invoice_items", "unit_price"): (14, 4)}
TABLES = {
    "transactions": ["cash_amount", "income", "expense", "net_amount", "bank_balance"],
    "credit_card_records": ["cash_amount", "income", "expense", "net_amount", "bank_balance"],
    "invoice_items": ["quantity", "unit_price", "total_price"],
    "sales_records": ["cash", "debit", "credit", "svc", "tips", "tax", "cash_tips",
                      "doordash", "stripe", "total", "deposit"],
    "cash_records": ["income", "expense", "balance"],
    "category_budgets": ["amount"],
}


def main(apply: bool):
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    try:
        todo = []
        for table, cols in TABLES.items():
            for col in cols:
                cur.execute(
                    "SELECT data_type FROM information_schema.columns "
                    "WHERE table_schema = current_schema() AND table_name = %s AND column_name = %s",
                    (table, col),
                )
                row = cur.fetchone()
                if row and row[0] == "real":
                    todo.append((table, col))
        if not todo:
            print("변환할 REAL 컬럼이 없습니다.")
            return
        for table, col in todo:
            p, s = SCALE_OVERRIDES.get((table, col), (14, 2))
            cur.execute(
                f"SELECT COUNT(*), COUNT(*) FILTER (WHERE {col} IS NOT NULL "
                f"AND ABS({col}::double precision - ROUND({col}::double precision::numeric, {s})::double precision) > 1e-9) "
                f"FROM {table}"
            )
            total, changed = cur.fetchone()
            print(f"{table}.{col}: REAL -> NUMERIC({p},{s})  rows={total}  반올림으로 값이 바뀌는 행={changed}")
            if apply:
                cur.execute(
                    f"ALTER TABLE {table} ALTER COLUMN {col} TYPE NUMERIC({p},{s}) "
                    f"USING {col}::double precision::numeric({p},{s})"
                )
        if apply:
            conn.commit()
            print("완료: 모든 컬럼을 변환하고 커밋했습니다.")
        else:
            conn.rollback()
            print("\ndry-run 입니다. 실제로 변환하려면 --apply 를 붙여 실행하세요.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main("--apply" in sys.argv)
