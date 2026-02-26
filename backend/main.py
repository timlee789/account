# backend/main.py
import sys
import os
import psycopg2
from pydantic import BaseModel
from typing import Optional, Any

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from finance_engine import ExpenseEngine 
import uvicorn

app = FastAPI()

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
    
    if month:
        sales = [s for s in sales if str(s.get('date', '')).startswith(month)]
        trans = [t for t in trans if str(t.get('date', '')).startswith(month)]
    
    total_revenue = sum(s['total'] for s in sales)
    total_expense = sum(t['amount'] if 'amount' in t else t.get('expense', 0) for t in trans if (t.get('amount', 0) > 0 or t.get('expense', 0) > 0))
    
    # Calculate cash on hand (cash + cash_tips from sales - cash_amount from transactions)
    total_cash_sales = sum(s.get('cash', 0) + s.get('cash_tips', 0) for s in sales)
    total_cash_paid = sum(t.get('cash_amount', 0) for t in trans)
    current_cash = total_cash_sales - total_cash_paid
    
    # Calculate detailed sales breakdown
    sales_breakdown = {
        "cash": sum(s.get('cash', 0) for s in sales),
        "debit": sum(s.get('debit', 0) for s in sales),
        "credit": sum(s.get('credit', 0) for s in sales),
        "doordash": sum(s.get('doordash', 0) for s in sales),
        "stripe": sum(s.get('stripe', 0) for s in sales),
        "tips": sum(s.get('tips', 0) for s in sales),
        "cash_tips": sum(s.get('cash_tips', 0) for s in sales),
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
    category: Optional[str] = None
    payee: Optional[str] = None
    payee_note: Optional[str] = None
    cash_amount: Optional[float] = None

# 매출 기록 업데이트용 (신규)
class SalesUpdate(BaseModel):
    date: str
    field: str
    value: Any

class CashUpdate(BaseModel):
    field: str
    value: Any

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
    return {"count": len(data), "data": data}

@app.get("/invoices")
def get_invoices():
    data = engine.get_all_invoices()
    return {"count": len(data), "data": data}

@app.get("/credit-cards")
def get_credit_cards():
    data = engine.get_all_credit_cards()
    return {"count": len(data), "data": data}

# --- [장부 업데이트 로직] ---

@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, update: TransactionUpdate):
    conn = engine.get_conn()
    cursor = conn.cursor()
    
    try:
        if update.category is not None:
            cursor.execute("UPDATE transactions SET category = %s WHERE id = %s", (update.category, transaction_id))
        
        if update.payee is not None:
            cursor.execute("UPDATE transactions SET payee = %s WHERE id = %s", (update.payee, transaction_id))

        if update.payee_note is not None:
            cursor.execute("UPDATE transactions SET payee_note = %s WHERE id = %s", (update.payee_note, transaction_id))

        if update.cash_amount is not None:
            cursor.execute("UPDATE transactions SET cash_amount = %s WHERE id = %s", (update.cash_amount, transaction_id))
            
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