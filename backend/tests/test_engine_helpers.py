from datetime import datetime

import pytest

from finance_engine import ExpenseEngine


def test_dedupe_key_distinguishes_identical_rows_within_a_file():
    seen = {}
    keys = [ExpenseEngine._dedupe_key("k", seen) for _ in range(3)]
    assert keys == ["k", "k#1", "k#2"]                       # 첫 행은 기존 키와 동일 → 재업로드 호환
    assert ExpenseEngine._dedupe_key("k", None) == "k"


@pytest.mark.parametrize("name,expected", [
    ("2026-09-07.csv", "2026-09-07"),
    ("inv_03-15-2025.csv", "2025-03-15"),
    ("Sysco_09-07.csv", None),                               # 연도 없음: 올해 또는 작년
])
def test_invoice_date_from_filename(name, expected):
    got = ExpenseEngine._invoice_date_from_filename(name)
    if expected:
        assert got == expected
    else:
        assert datetime.strptime(got, "%Y-%m-%d").date() <= datetime.now().date()


def test_invoice_date_without_year_never_in_future():
    today = datetime.now().date()
    got = ExpenseEngine._invoice_date_from_filename("x_12-31.csv")
    assert datetime.strptime(got, "%Y-%m-%d").date() <= today


def test_update_record_rejects_unknown_table_and_columns():
    e = ExpenseEngine()                                      # create_tables 는 conftest 에서 무력화
    assert e.update_record("users; DROP TABLE x", 1, {"category": "a"}) is False
    assert e.update_record("transactions", 1, {}) is True    # 수정할 값 없음
    assert e.update_record("transactions", 1, {"id": 5, "evil": 1}) is True  # 허용 외 컬럼은 무시(DB 접속 없음)


def test_update_sales_record_rejects_unknown_field():
    assert ExpenseEngine().update_sales_record("2026-01-01", "cash; DROP TABLE x", 1) is False
