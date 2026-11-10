from typing import Optional

from fastapi import APIRouter, HTTPException
import summary
from pydantic import BaseModel

from deps import engine

router = APIRouter()

@router.get("/dashboard-summary")
def get_dashboard(month: Optional[str] = None):
    sales = engine.get_sales_records()
    trans = engine.get_all_transactions()
    cash_rcds = engine.get_all_cash_records()
    credit_cards = engine.get_all_credit_cards()

    # 전체(Lifetime) 지표는 월 필터 적용 전 데이터로 계산
    lifetime = summary.compute_totals(sales, trans, cash_rcds, credit_cards)

    if month:
        sales = summary.filter_month(sales, month)
        trans = summary.filter_month(trans, month)
        cash_rcds = summary.filter_month(cash_rcds, month)
        credit_cards = summary.filter_month(credit_cards, month)

    totals = summary.compute_totals(sales, trans, cash_rcds, credit_cards)
    budgets = engine.get_monthly_budgets(month) if month else {}
    category_expenses, payee_expenses = summary.expense_breakdown(
        trans, cash_rcds, credit_cards, engine.get_categories(), budgets)

    breakdown = summary.sales_breakdown(sales)
    return {
        **summary.dashboard_payload(totals),
        "salesBreakdown": {k: summary.r2(v) for k, v in breakdown.items()},
        "categoryExpenses": category_expenses,
        "payeeExpenses": payee_expenses,
        "lifetimeStats": summary.lifetime_payload(lifetime),
    }

@router.get("/monthly-summary")
def get_monthly_summary():
    rows, totals = summary.monthly_rows(
        engine.get_sales_records(),
        engine.get_all_transactions(),
        engine.get_all_cash_records(),
        engine.get_all_credit_cards(),
    )
    return {"months": rows, "totals": totals}

class BudgetUpdate(BaseModel):
    month: str
    category: str
    amount: float

@router.post("/budgets")
def update_category_budget(data: BudgetUpdate):
    success = engine.update_budget(data.month, data.category, data.amount)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Failed to update budget")
