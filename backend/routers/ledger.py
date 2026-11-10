from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from deps import engine

router = APIRouter()

class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    payee: Optional[str] = None
    payee_note: Optional[str] = None
    cash_amount: Optional[float] = None
    income: Optional[float] = None
    expense: Optional[float] = None
    description: Optional[str] = None

class TransactionCreate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    payee: Optional[str] = None
    payee_note: Optional[str] = None

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), target_tab: Optional[str] = Form(None)):
    content = await file.read()
    result = engine.process_csv(content, file.filename, target_tab)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/transactions")
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
            
    # System Cash Sales 행은 매출 저장 시점(ensure_cash_sales_rows)에 생성한다. 조회는 읽기 전용.
    # Cash Sales 전용 행에만 cash_income 값을 바인딩하도록 강제 (중복 겹침 방지)
    for t in data:
        t_date = t.get('date')
        if t.get('type') == 'Cash Sales' and t.get('account_source') == 'System':
            t['cash_income'] = sales_cash_map.get(t_date, 0.0)
            t['description'] = 'Daily Cash Income Record'
        else:
            t['cash_income'] = 0.0
            
        t['cash_expense'] = float(t.get('cash_amount') or 0)
        
    return {"count": len(data), "data": data}

@router.post("/transactions")
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

@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    success = engine.delete_transaction(transaction_id)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete transaction")

@router.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, update: TransactionUpdate):
    fields = update.model_dump(exclude_unset=True)
    if not engine.update_record("transactions", transaction_id, fields):
        raise HTTPException(status_code=500, detail="Failed to update transaction")
    return {"status": "success", "message": "Updated successfully"}

@router.get("/invoices")
def get_invoices():
    data = engine.get_all_invoices()
    return {"count": len(data), "data": data}

@router.get("/credit-cards")
def get_credit_cards():
    data = engine.get_all_credit_cards()
    return {"count": len(data), "data": data}

@router.put("/credit-cards/{transaction_id}")
def update_credit_card(transaction_id: int, update: TransactionUpdate):
    fields = update.model_dump(exclude_unset=True)
    if not engine.update_record("credit_card_records", transaction_id, fields):
        raise HTTPException(status_code=500, detail="Failed to update credit card record")
    return {"status": "success", "message": "Updated successfully"}
