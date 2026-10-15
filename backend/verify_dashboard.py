import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from finance_engine import ExpenseEngine

HOME_CATEGORIES = {'home food', 'home etc'}

def _sum_home_expense(trans, cash_rcds, credit_cards):
    def _is_home(rec):
        return str(rec.get('category') or '').strip().lower() in HOME_CATEGORIES
    total = 0.0
    for t in trans:
        if _is_home(t):
            total += float(t.get('amount') or t.get('expense') or 0)
            total += float(t.get('cash_amount') or 0)
    for c in cash_rcds:
        if _is_home(c):
            total += float(c.get('expense') or 0)
    for cc in credit_cards:
        if _is_home(cc):
            total += float(cc.get('expense') or 0)
    return total

def run(month):
    engine = ExpenseEngine()
    sales = engine.get_sales_records()
    trans = engine.get_all_transactions()
    cash_rcds = engine.get_all_cash_records()
    credit_cards = engine.get_all_credit_cards()

    if month:
        sales = [s for s in sales if str(s.get('date', '')).startswith(month)]
        trans = [t for t in trans if str(t.get('date', '')).startswith(month)]
        cash_rcds = [c for c in cash_rcds if str(c.get('date', '')).startswith(month)]
        credit_cards = [c for c in credit_cards if str(c.get('date', '')).startswith(month)]

    ledger_income = sum(float(t.get('income') or 0) for t in trans)
    ledger_expense = sum(float(t.get('amount') or t.get('expense') or 0) for t in trans if (float(t.get('amount') or 0) > 0 or float(t.get('expense') or 0) > 0))

    cash_income = sum(float(s.get('cash') or 0) + float(s.get('cash_tips') or 0) for s in sales) + sum(float(c.get('income') or 0) for c in cash_rcds)
    cash_expense = sum(float(t.get('cash_amount') or 0) for t in trans) + sum(float(c.get('expense') or 0) for c in cash_rcds)

    cc_expense = sum(float(c.get('expense') or 0) for c in credit_cards)
    card_payment_amount = sum(float(t.get('amount') or t.get('expense') or 0) for t in trans if str(t.get('category') or '').strip().lower() == 'card payment')
    cash_out_amount = sum(float(t.get('amount') or t.get('expense') or 0) for t in trans if str(t.get('category') or '').strip().lower() == 'cash out')

    total_revenue = ledger_income + cash_income
    total_expense = ledger_expense + cash_expense
    real_expense = total_expense - card_payment_amount - cash_out_amount + cc_expense

    home_expense = _sum_home_expense(trans, cash_rcds, credit_cards)
    business_expense = real_expense - home_expense

    net_profit = total_revenue - real_expense

    sales_breakdown = {
        "cash": sum(float(s.get('cash') or 0) for s in sales),
        "debit": sum(float(s.get('debit') or 0) for s in sales),
        "credit": sum(float(s.get('credit') or 0) for s in sales),
        "doordash": sum(float(s.get('doordash') or 0) for s in sales),
        "stripe": sum(float(s.get('stripe') or 0) for s in sales),
        "tips": sum(float(s.get('tips') or 0) for s in sales),
        "cash_tips": sum(float(s.get('cash_tips') or 0) for s in sales),
    }
    total_sales = sum(sales_breakdown[k] for k in ['cash', 'debit', 'credit', 'doordash', 'cash_tips'])
    net_profit_sales = total_sales - real_expense
    real_profit = total_sales - business_expense

    payee_exp_map = {}
    for t in trans:
        expense_val = float(t.get('expense') or 0.0) + float(t.get('cash_amount') or 0.0)
        c = str(t.get('category') or "").strip()
        p = str(t.get('payee') or "").strip()
        if expense_val > 0 and c.lower() not in ('card payment', 'cash out'):
            if p: payee_exp_map[p] = payee_exp_map.get(p, 0.0) + expense_val
    for c_rcd in cash_rcds:
        expense_val = float(c_rcd.get('expense') or 0.0)
        c = str(c_rcd.get('category') or "").strip()
        p = str(c_rcd.get('payee') or "").strip()
        if expense_val > 0 and c.lower() not in ('card payment', 'cash out'):
            if p: payee_exp_map[p] = payee_exp_map.get(p, 0.0) + expense_val
    for cc in credit_cards:
        expense_val = float(cc.get('expense') or 0.0)
        p = str(cc.get('payee') or "").strip()
        if expense_val > 0:
            if p: payee_exp_map[p] = payee_exp_map.get(p, 0.0) + expense_val

    tim_lee_wage = sum(v for k, v in payee_exp_map.items() if 'tim lee' in k.lower().replace('  ', ' '))
    total_profit = real_profit + tim_lee_wage

    print(f"===== month={month or 'ALL (lifetime)'} =====")
    print(f"ledger_income        = {ledger_income:,.2f}")
    print(f"ledger_expense       = {ledger_expense:,.2f}")
    print(f"cash_income          = {cash_income:,.2f}")
    print(f"cash_expense         = {cash_expense:,.2f}")
    print(f"cc_expense           = {cc_expense:,.2f}")
    print(f"card_payment_amount  = {card_payment_amount:,.2f}")
    print(f"cash_out_amount      = {cash_out_amount:,.2f}")
    print(f"home_expense         = {home_expense:,.2f}")
    print(f"total_sales          = {total_sales:,.2f}")
    print("---")
    print(f"total_revenue        = {total_revenue:,.2f}")
    print(f"[Dashboard]Total Expense (=real_expense)      = {real_expense:,.2f}")
    print(f"[Dashboard]Real Expense  (=business_expense)  = {business_expense:,.2f}")
    print(f"[Dashboard]Net Profit (Rev)                   = {net_profit:,.2f}")
    print(f"[Dashboard]Net Profit (Sales)                 = {net_profit_sales:,.2f}")
    print(f"[Dashboard]Real Profit                        = {real_profit:,.2f}")
    print(f"Tim Lee wage (payee 'tim lee' 합)              = {tim_lee_wage:,.2f}")
    print(f"[Dashboard]Total Profit (=Real Profit + wage)  = {total_profit:,.2f}")
    print()

def list_months():
    engine = ExpenseEngine()
    sales = engine.get_sales_records()
    trans = engine.get_all_transactions()
    cash_rcds = engine.get_all_cash_records()
    credit_cards = engine.get_all_credit_cards()
    months = {}
    for lst, name in [(sales, 'sales'), (trans, 'trans'), (cash_rcds, 'cash'), (credit_cards, 'cc')]:
        for r in lst:
            d = str(r.get('date') or '')
            if len(d) >= 7:
                m = d[:7]
                months.setdefault(m, set()).add(name)
    for m in sorted(months.keys()):
        print(m, sorted(months[m]))

if __name__ == "__main__":
    import sys as _s
    if len(_s.argv) > 1 and _s.argv[1] == "list":
        list_months()
    else:
        month = _s.argv[1] if len(_s.argv) > 1 else None
        run(month)
