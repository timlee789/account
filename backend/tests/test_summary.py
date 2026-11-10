import pytest

import summary


SALES = [
    {"date": "2026-01-05", "cash": 100, "debit": 200, "credit": 300, "doordash": 50, "cash_tips": 10, "tips": 30, "stripe": 5},
    {"date": "2026-02-05", "cash": 10, "debit": 0, "credit": 0, "doordash": 0, "cash_tips": 0},
]
TRANS = [
    {"date": "2026-01-10", "income": 500, "expense": 0, "category": "Sales Deposit", "payee": ""},
    {"date": "2026-01-11", "income": 0, "expense": 200, "category": "Food Material", "payee": "US Foods"},
    {"date": "2026-01-12", "income": 0, "expense": 80, "category": "Home Food", "payee": "Costco"},
    {"date": "2026-01-13", "income": 0, "expense": 300, "category": "Card Payment", "payee": "Chase"},
    {"date": "2026-01-14", "income": 0, "expense": 40, "category": "CASH OUT", "payee": ""},
    {"date": "2026-01-15", "income": 0, "expense": 60, "category": "Wages", "payee": "Tim Lee", "cash_amount": 15},
]
CASH = [{"date": "2026-01-20", "income": 25, "expense": 5, "category": "Other", "payee": "X"}]
CC = [
    {"date": "2026-01-21", "expense": 90, "category": "Food Material", "payee": "Sysco"},
    {"date": "2026-01-22", "expense": 20, "category": "Home Etc", "payee": "Amazon"},
]


def totals(month=None):
    args = (SALES, TRANS, CASH, CC)
    if month:
        args = tuple(summary.filter_month(a, month) for a in args)
    return summary.compute_totals(*args)


def test_core_metrics_january():
    t = totals("2026-01")
    assert t["revenue"] == 500 + (100 + 10) + 25            # 원장 수입 + 현금 수입
    # (원장 지출 + 현금 지출) - Card Payment - Cash Out + 카드 지출
    assert t["total_expense"] == (200 + 80 + 300 + 40 + 60) + (15 + 5) - 300 - 40 + 110
    assert t["home_expense"] == 80 + 20
    assert t["business_expense"] == t["total_expense"] - t["home_expense"]
    assert t["sales_total"] == 100 + 200 + 300 + 50 + 10
    assert t["net_profit_sales"] == t["sales_total"] - t["total_expense"]
    assert t["business_profit"] == t["sales_total"] - t["business_expense"]
    assert t["card_payment"] == 300
    assert t["tim_lee_wage"] == 60 + 15
    assert t["owner_total_profit"] == t["business_profit"] + 75


def test_internal_transfers_excluded_from_category_and_payee_breakdown():
    cats, payees = summary.expense_breakdown(
        TRANS, CASH, CC, [{"name": "Wages"}, {"name": "Rent"}], {"Rent": 1000})
    names = {c["name"]: c for c in cats}
    assert "Card Payment" not in names and "CASH OUT" not in names
    assert names["Rent"] == {"name": "Rent", "amount": 0.0, "budget": 1000}   # 지출 없어도 예산 입력용으로 표시
    assert names["Wages"]["amount"] == 75
    assert "Chase" not in {p["name"] for p in payees}
    assert [c["amount"] for c in cats] == sorted((c["amount"] for c in cats), reverse=True)


def test_monthly_rows_sorted_desc_and_skip_zero_revenue_months():
    rows, tot = summary.monthly_rows(SALES, TRANS, CASH, CC)
    assert [r["month"] for r in rows] == ["2026-02", "2026-01"]
    assert tot["revenue"] == pytest.approx(sum(r["revenue"] for r in rows))
    rows2, _ = summary.monthly_rows([], [{"date": "2026-03-01", "expense": 10}], [], [])
    assert rows2 == []                                                      # 수입 0 인 달은 제외


def test_monthly_row_matches_dashboard_for_same_month():
    rows, _ = summary.monthly_rows(SALES, TRANS, CASH, CC)
    jan = next(r for r in rows if r["month"] == "2026-01")
    t = totals("2026-01")
    assert jan["totalExpense"] == summary.r2(t["total_expense"])
    assert jan["businessProfit"] == summary.r2(t["business_profit"])
    assert jan["ownerTotalProfit"] == summary.r2(t["owner_total_profit"])


def test_rounding_removes_float_noise():
    assert summary.r2(14381.360000000044) == 14381.36
    assert summary.r2(-0.0) == 0.0
