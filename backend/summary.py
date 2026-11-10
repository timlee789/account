"""Dashboard / Monthly P&L 지표 계산 (순수 함수 모듈).

DB나 FastAPI 에 의존하지 않으므로 단위 테스트가 쉽다. 지표 정의는 여기 한 곳에서만 바꾼다.

지표 정의
- revenue          = 원장 수입 + 현금 수입(매출 현금/현금팁 + Cash 탭 수입)
- total_expense    = (원장 지출 + 현금 지출) - Card Payment - Cash Out + 신용카드 지출
                     (Card Payment / Cash Out 은 내부 이체라 제외)
- business_expense = total_expense - home_expense
- net_profit_ledger = revenue - total_expense
- net_profit_sales  = sales_total - total_expense
- business_profit   = sales_total - business_expense
- owner_total_profit = business_profit + tim_lee_wage (Tim Lee 급여는 지출로 기록되지만 본인 수입)
"""
from typing import Optional

HOME_CATEGORIES = {'home food', 'home etc'}
INTERNAL_TRANSFER_CATEGORIES = ('card payment', 'cash out')


def _f(value) -> float:
    return float(value or 0)


def _cat(rec) -> str:
    return str(rec.get('category') or '').strip().lower()


def _is_tim_lee(rec) -> bool:
    return 'tim lee' in str(rec.get('payee') or '').strip().lower()


def _ledger_amount(t) -> float:
    """원장 행의 지출액 (amount 가 있으면 amount, 없으면 expense)."""
    return _f(t.get('amount') or t.get('expense'))


def r2(value: float) -> float:
    """응답용 금액 반올림 (float 누적 오차 제거)."""
    return round(value + 0.0, 2)


def month_of(date_value) -> Optional[str]:
    s = str(date_value or "")
    return s[:7] if len(s) >= 7 and s[4] == '-' else None


def filter_month(records, month: str):
    return [r for r in records if str(r.get('date', '')).startswith(month)]


def compute_totals(sales, trans, cash_rcds, credit_cards) -> dict:
    """주어진 레코드 전체에 대한 지표를 계산한다 (월 필터는 호출 전에 적용)."""
    ledger_income = sum(_f(t.get('income')) for t in trans)
    ledger_expense = sum(
        _ledger_amount(t) for t in trans
        if _f(t.get('amount')) > 0 or _f(t.get('expense')) > 0
    )
    card_payment = sum(_ledger_amount(t) for t in trans if _cat(t) == 'card payment')
    cash_out = sum(_ledger_amount(t) for t in trans if _cat(t) == 'cash out')

    cash_income = (
        sum(_f(s.get('cash')) + _f(s.get('cash_tips')) for s in sales)
        + sum(_f(c.get('income')) for c in cash_rcds)
    )
    cash_expense = (
        sum(_f(t.get('cash_amount')) for t in trans)
        + sum(_f(c.get('expense')) for c in cash_rcds)
    )
    cc_expense = sum(_f(c.get('expense')) for c in credit_cards)

    home_expense = 0.0
    for t in trans:
        if _cat(t) in HOME_CATEGORIES:
            home_expense += _ledger_amount(t) + _f(t.get('cash_amount'))
    for c in cash_rcds:
        if _cat(c) in HOME_CATEGORIES:
            home_expense += _f(c.get('expense'))
    for cc in credit_cards:
        if _cat(cc) in HOME_CATEGORIES:
            home_expense += _f(cc.get('expense'))

    tim_lee_wage = 0.0
    for t in trans:
        if _is_tim_lee(t) and _cat(t) not in INTERNAL_TRANSFER_CATEGORIES:
            tim_lee_wage += max(_f(t.get('expense')) + _f(t.get('cash_amount')), 0.0)
    for c in cash_rcds:
        if _is_tim_lee(c) and _cat(c) not in INTERNAL_TRANSFER_CATEGORIES:
            tim_lee_wage += max(_f(c.get('expense')), 0.0)
    for cc in credit_cards:
        if _is_tim_lee(cc):
            tim_lee_wage += max(_f(cc.get('expense')), 0.0)

    sales_total = sum(
        _f(s.get('cash')) + _f(s.get('debit')) + _f(s.get('credit'))
        + _f(s.get('doordash')) + _f(s.get('cash_tips'))
        for s in sales
    )

    revenue = ledger_income + cash_income
    total_expense = (ledger_expense + cash_expense) - card_payment - cash_out + cc_expense
    business_expense = total_expense - home_expense
    return {
        "revenue": revenue,
        "sales_total": sales_total,
        "total_expense": total_expense,
        "business_expense": business_expense,
        "home_expense": home_expense,
        "net_profit_ledger": revenue - total_expense,
        "net_profit_sales": sales_total - total_expense,
        "business_profit": sales_total - business_expense,
        "card_payment": card_payment,
        "cash_balance": cash_income - cash_expense,
        "tim_lee_wage": tim_lee_wage,
        "owner_total_profit": (sales_total - business_expense) + tim_lee_wage,
    }


def sales_breakdown(sales) -> dict:
    keys = ("cash", "debit", "credit", "doordash", "stripe", "tips", "cash_tips")
    return {k: sum(_f(s.get(k)) for s in sales) for k in keys}


def expense_breakdown(trans, cash_rcds, credit_cards, categories, budgets):
    """카테고리별/지급처별 지출 (금액 큰 순). 카테고리는 지출이 없어도 예산 입력을 위해 항상 포함."""
    cat_map = {c['name']: 0.0 for c in categories} if categories else {}
    payee_map: dict = {}

    def add(rec, amount, skip_internal):
        if amount <= 0:
            return
        c = str(rec.get('category') or "").strip()
        p = str(rec.get('payee') or "").strip()
        if skip_internal and c.lower() in INTERNAL_TRANSFER_CATEGORIES:
            return
        if c:
            cat_map[c] = cat_map.get(c, 0.0) + amount
        if p:
            payee_map[p] = payee_map.get(p, 0.0) + amount

    for t in trans:
        add(t, _f(t.get('expense')) + _f(t.get('cash_amount')), True)
    for c in cash_rcds:
        add(c, _f(c.get('expense')), True)
    for cc in credit_cards:
        add(cc, _f(cc.get('expense')), False)

    category_expenses = [
        {"name": k, "amount": r2(v), "budget": budgets.get(k, 0)} for k, v in cat_map.items()
    ]
    category_expenses.sort(key=lambda x: (-x["amount"], x["name"]))
    payee_expenses = sorted(
        ({"name": k, "amount": r2(v)} for k, v in payee_map.items()),
        key=lambda x: x["amount"], reverse=True,
    )
    return category_expenses, payee_expenses


def dashboard_payload(totals: dict) -> dict:
    return {
        "totalRevenue": r2(totals["revenue"]),
        "totalExpense": r2(totals["total_expense"]),
        "businessExpense": r2(totals["business_expense"]),
        "homeExpense": r2(totals["home_expense"]),
        "netProfitLedger": r2(totals["net_profit_ledger"]),
        "businessProfit": r2(totals["business_profit"]),
        "totalSales": r2(totals["sales_total"]),
        "netProfitSales": r2(totals["net_profit_sales"]),
        "balance": r2(totals["cash_balance"]),
        "cardPayment": r2(totals["card_payment"]),
    }


def lifetime_payload(totals: dict) -> dict:
    return {
        "revenue": r2(totals["revenue"]),
        "totalExpense": r2(totals["total_expense"]),
        "businessExpense": r2(totals["business_expense"]),
        "homeExpense": r2(totals["home_expense"]),
        "netProfitLedger": r2(totals["net_profit_ledger"]),
        "businessProfit": r2(totals["business_profit"]),
        "totalSales": r2(totals["sales_total"]),
        "netProfitSales": r2(totals["net_profit_sales"]),
        "cardPayment": r2(totals["card_payment"]),
    }


def monthly_rows(sales, trans, cash_rcds, credit_cards):
    """월별 P&L 행(최신 월 먼저)과 합계. 수입이 0 이하인 달은 제외."""
    def group(records):
        out: dict = {}
        for r in records:
            m = month_of(r.get('date'))
            if m:
                out.setdefault(m, []).append(r)
        return out

    s_by, t_by, c_by, cc_by = group(sales), group(trans), group(cash_rcds), group(credit_cards)
    months = set(s_by) | set(t_by) | set(c_by) | set(cc_by)

    rows = []
    for m in sorted(months, reverse=True):
        t = compute_totals(s_by.get(m, []), t_by.get(m, []), c_by.get(m, []), cc_by.get(m, []))
        if t["revenue"] <= 0:
            continue
        rows.append({
            "month": m,
            "revenue": r2(t["revenue"]),
            "sales": r2(t["sales_total"]),
            "totalExpense": r2(t["total_expense"]),
            "businessExpense": r2(t["business_expense"]),
            "homeExpense": r2(t["home_expense"]),
            "netProfitLedger": r2(t["net_profit_ledger"]),
            "netProfitSales": r2(t["net_profit_sales"]),
            "businessProfit": r2(t["business_profit"]),
            "timLeeWage": r2(t["tim_lee_wage"]),
            "ownerTotalProfit": r2(t["owner_total_profit"]),
        })

    total_keys = ("revenue", "sales", "totalExpense", "businessExpense", "homeExpense",
                  "netProfitLedger", "netProfitSales", "businessProfit", "timLeeWage", "ownerTotalProfit")
    totals = {k: r2(sum(r[k] for r in rows)) for k in total_keys}
    return rows, totals
