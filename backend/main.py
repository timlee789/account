# backend/main.py
import sys
import os
import psycopg2
from pydantic import BaseModel
from typing import Optional, Any, Union

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from finance_engine import ExpenseEngine 
import uvicorn

app = FastAPI()

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
            
        allowed = ["/login", "/logout", "/", "/api", "/api/"]
        path = request.url.path
        if any(path.endswith(p) for p in allowed):
            return await call_next(request)
            
        token = request.cookies.get("auth-token")
        admin_pw = os.environ.get("ADMIN_PASSWORD", "1234")
        
        if token != admin_pw:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
            
        return await call_next(request)

app.add_middleware(AuthMiddleware)

class LoginRequest(BaseModel):
    password: str

@app.post("/login")
def login(req: LoginRequest, response: Response):
    admin_pw = os.environ.get("ADMIN_PASSWORD", "1234")
    if req.password == admin_pw:
        response.set_cookie(
            key="auth-token", 
            value=admin_pw, 
            httponly=False,
            max_age=60*60*24*7, 
            samesite="lax",
            secure=True
        )
        return {"status": "success"}
    raise HTTPException(status_code=401, detail="Invalid admin password")

@app.post("/logout")
def logout(response: Response):
    response.delete_cookie("auth-token")
    return {"status": "success"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = ExpenseEngine()

@app.get("/dashboard-summary")
def get_dashboard(month: Optional[str] = None):
    sales = engine.get_sales_records()
    trans = engine.get_all_transactions()
    cash_rcds = engine.get_all_cash_records()
    
    if month:
        sales = [s for s in sales if str(s.get('date', '')).startswith(month)]
        trans = [t for t in trans if str(t.get('date', '')).startswith(month)]
        cash_rcds = [c for c in cash_rcds if str(c.get('date', '')).startswith(month)]
    
    # 수익 합계 = Financial Ledger (transactions)의 income 합계 + Sales Record의 현금 매출 (Cash Income)
    ledger_income = sum(float(t.get('income') or 0) for t in trans)
    sales_cash_income = sum(float(s.get('cash') or 0) + float(s.get('cash_tips') or 0) for s in sales)
    total_revenue = ledger_income + sales_cash_income
    
    # 지출 합계 = Ledger(transactions)의 expense + Cash records의 expense + Ledger의 cash_amount (Cash Expense)
    ledger_expense = sum(float(t.get('amount') or t.get('expense') or 0) for t in trans if (float(t.get('amount') or 0) > 0 or float(t.get('expense') or 0) > 0))
    cash_records_expense = sum(float(c.get('expense') or 0) for c in cash_rcds)
    ledger_cash_expense = sum(float(t.get('cash_amount') or 0) for t in trans)
    total_expense = ledger_expense + cash_records_expense + ledger_cash_expense
    
    # Calculate cash on hand (cash + cash_tips from sales - cash_amount from transactions)
    total_cash_sales = sum(float(s.get('cash') or 0) + float(s.get('cash_tips') or 0) for s in sales)
    total_cash_paid = sum(float(t.get('cash_amount') or 0) for t in trans)
    current_cash = total_cash_sales - total_cash_paid
    
    # Calculate detailed sales breakdown
    sales_breakdown = {
        "cash": sum(float(s.get('cash') or 0) for s in sales),
        "debit": sum(float(s.get('debit') or 0) for s in sales),
        "credit": sum(float(s.get('credit') or 0) for s in sales),
        "doordash": sum(float(s.get('doordash') or 0) for s in sales),
        "stripe": sum(float(s.get('stripe') or 0) for s in sales),
        "tips": sum(float(s.get('tips') or 0) for s in sales),
        "cash_tips": sum(float(s.get('cash_tips') or 0) for s in sales),
    }
    
    return {
        "totalRevenue": total_revenue,
        "totalExpense": total_expense,
        "netProfit": total_revenue - total_expense,
        "balance": current_cash,
        "salesBreakdown": sales_breakdown
    }

# --- [모델 정의] ---

# 장부 거래 업데이트용
class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    payee: Optional[str] = None
    payee_note: Optional[str] = None
    cash_amount: Optional[float] = None
    income: Optional[float] = None
    expense: Optional[float] = None
    description: Optional[str] = None

# 매출 기록 업데이트용 (신규)
class SalesUpdate(BaseModel):
    date: str
    field: str
    value: Union[float, int, str]

# 동적 카테고리/지급처 생성용
class CategoryCreate(BaseModel):
    name: str

class PayeeCreate(BaseModel):
    name: str

class CashUpdate(BaseModel):
    field: str
    value: Any

class TransactionCreate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    payee: Optional[str] = None
    payee_note: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Collegiate Grill ERP System Online"}

# --- [CSV 업로드 및 조회] ---

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), target_tab: Optional[str] = Form(None)):
    content = await file.read()
    result = engine.process_csv(content, file.filename, target_tab)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.get("/transactions")
def get_transactions():
    data = engine.get_all_transactions()
    sales = engine.get_sales_records()
    
    # 날짜별로 Sales Record의 현금(Cash + Cash Tips) 합계 맵 생성
    sales_cash_map = {}
    for s in sales:
        date = s.get('date')
        val = float(s.get('cash') or 0) + float(s.get('cash_tips') or 0)
        if date and val > 0:
            sales_cash_map[date] = val
            
    # 해당 날짜 거래 내역이 아예 없는지 확인
    existing_dates = set(t.get('date', '') for t in data)
    missing_dates = set(sales_cash_map.keys()) - existing_dates
    has_inserted = False
    
    for d in missing_dates:
        entry = {
            'date': d,
            'type': 'Cash Sales',
            'desc': 'Daily Cash Income Record',
            'income': 0,
            'expense': 0,
            'balance': 0,
            'source': 'System'
        }
        engine._save_row(entry, table_name="transactions")
        has_inserted = True
        
    # 만약 새로 추가된 행이 있다면 데이터를 다시 가져옵니다
    if has_inserted:
        data = engine.get_all_transactions()
        
    # 하루에 한 번만 cash_income이 보이도록 처리 (중복 방지)
    processed_dates = set()
    for t in data:
        t_date = t.get('date')
        if t_date in sales_cash_map and t_date not in processed_dates:
            t['cash_income'] = sales_cash_map[t_date]
            processed_dates.add(t_date)
        else:
            t['cash_income'] = 0.0
            
        t['cash_expense'] = float(t.get('cash_amount') or 0)
        
    return {"count": len(data), "data": data}

@app.post("/transactions")
def add_transaction(req: TransactionCreate):
    record = {
        'date': req.date,
        'description': req.description or 'Manual Ledger Entry',
        'type': req.type or 'Manual Entry',
        'category': req.category or '',
        'payee': req.payee or '',
        'payee_note': req.payee_note or ''
    }
    success, new_id = engine.add_transaction(record)
    if success:
        return {"status": "success", "id": new_id}
    raise HTTPException(status_code=500, detail="Failed to add manual transaction")

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    success = engine.delete_transaction(transaction_id)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete transaction")

@app.get("/invoices")
def get_invoices():
    data = engine.get_all_invoices()
    return {"count": len(data), "data": data}

@app.get("/credit-cards")
def get_credit_cards():
    data = engine.get_all_credit_cards()
    return {"count": len(data), "data": data}

# --- [카테고리 및 지급처 (Categories & Payees)] ---
@app.get("/categories")
def get_categories():
    data = engine.get_categories()
    return {"data": data}

@app.post("/categories")
def add_category(cat: CategoryCreate):
    res = engine.add_category(cat.name)
    if res["status"] == "success":
        return res
    raise HTTPException(status_code=400, detail=res.get("message", "Failed to add category"))

@app.delete("/categories/{category_id}")
def delete_category(category_id: int):
    if engine.delete_category(category_id):
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to delete category")

@app.get("/payees")
def get_payees():
    data = engine.get_payees()
    return {"data": data}

@app.post("/payees")
def add_payee(payee: PayeeCreate):
    res = engine.add_payee(payee.name)
    if res["status"] == "success":
        return res
    raise HTTPException(status_code=400, detail=res.get("message", "Failed to add payee"))

@app.delete("/payees/{payee_id}")
def delete_payee(payee_id: int):
    if engine.delete_payee(payee_id):
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to delete payee")

# --- [장부 업데이트 로직] ---

@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, update: TransactionUpdate):
    conn = engine.get_conn()
    cursor = conn.cursor()
    
    try:
        if update.date is not None:
            cursor.execute("UPDATE transactions SET date = %s WHERE id = %s", (update.date, transaction_id))

        if update.category is not None:
            cursor.execute("UPDATE transactions SET category = %s WHERE id = %s", (update.category, transaction_id))
        
        if update.payee is not None:
            cursor.execute("UPDATE transactions SET payee = %s WHERE id = %s", (update.payee, transaction_id))

        if update.payee_note is not None:
            cursor.execute("UPDATE transactions SET payee_note = %s WHERE id = %s", (update.payee_note, transaction_id))

        if update.cash_amount is not None:
            cursor.execute("UPDATE transactions SET cash_amount = %s WHERE id = %s", (update.cash_amount, transaction_id))
            
        if update.income is not None:
            cursor.execute("UPDATE transactions SET income = %s WHERE id = %s", (update.income, transaction_id))

        if update.expense is not None:
            cursor.execute("UPDATE transactions SET expense = %s WHERE id = %s", (update.expense, transaction_id))

        if update.description is not None:
            cursor.execute("UPDATE transactions SET description = %s WHERE id = %s", (update.description, transaction_id))

        conn.commit()
        return {"status": "success", "message": "Updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/credit-cards/{transaction_id}")
def update_credit_card(transaction_id: int, update: TransactionUpdate):
    conn = engine.get_conn()
    cursor = conn.cursor()
    
    try:
        if update.category is not None:
            cursor.execute("UPDATE credit_card_records SET category = %s WHERE id = %s", (update.category, transaction_id))
        
        if update.payee is not None:
            cursor.execute("UPDATE credit_card_records SET payee = %s WHERE id = %s", (update.payee, transaction_id))

        if update.payee_note is not None:
            cursor.execute("UPDATE credit_card_records SET payee_note = %s WHERE id = %s", (update.payee_note, transaction_id))

        if update.cash_amount is not None:
            cursor.execute("UPDATE credit_card_records SET cash_amount = %s WHERE id = %s", (update.cash_amount, transaction_id))
            
        conn.commit()
        return {"status": "success", "message": "Updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# --- [💰 Sales Record 엔드포인트 신규 추가] ---

@app.get("/sales")
def get_sales():
    """매출 기록 목록을 가져옵니다."""
    data = engine.get_sales_records()
    return data

# backend/main.py 하단에 추가

@app.delete("/sales/{date}")
def delete_sales(date: str):
    success = engine.delete_sales_record(date)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete record")
        
@app.post("/update-sales")
def update_sales(update: SalesUpdate):
    """매일의 매출 수치를 저장하거나 수정합니다."""
    success = engine.update_sales_record(update.date, update.field, update.value)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Sales record update failed")

# --- [💵 Cash Record 엔드포인트 신규 추가] ---

@app.get("/cash")
def get_cash_records():
    data = engine.get_all_cash_records()
    return {"count": len(data), "data": data}

@app.post("/cash")
def add_cash_record():
    from datetime import datetime
    today = datetime.today().strftime('%Y-%m-%d')
    success, new_id = engine.add_cash_record({'date': today})
    if success:
        return {"status": "success", "id": new_id}
    raise HTTPException(status_code=500, detail="Failed to add cash record")

@app.put("/cash/{record_id}")
def update_cash_record(record_id: int, update: CashUpdate):
    success = engine.update_cash_record(record_id, update.field, update.value)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to update cash record")

@app.delete("/cash/{record_id}")
def delete_cash_record(record_id: int):
    success = engine.delete_cash_record(record_id)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete cash record")

# --- Vercel Serverless specific routing ---
# Since Vercel passes the raw "/api/..." path to the ASGI application,
# we need to mount our main API to "/api" so it correctly responds to Next.js routes.
_core_app = app
app = FastAPI()
app.mount("/api", _core_app)

if __name__ == "__main__":
    uvicorn.run("main:_core_app", host="0.0.0.0", port=8000, reload=True)