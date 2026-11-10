from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from deps import engine

router = APIRouter()

class CashUpdate(BaseModel):
    field: str
    value: Any

@router.get("/cash")
def get_cash_records():
    data = engine.get_all_cash_records()
    return {"count": len(data), "data": data}

@router.post("/cash")
def add_cash_record():
    from datetime import datetime
    today = datetime.today().strftime('%Y-%m-%d')
    success, new_id = engine.add_cash_record({'date': today})
    if success:
        return {"status": "success", "id": new_id}
    raise HTTPException(status_code=500, detail="Failed to add cash record")

@router.put("/cash/{record_id}")
def update_cash_record(record_id: int, update: CashUpdate):
    success = engine.update_cash_record(record_id, update.field, update.value)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to update cash record")

@router.delete("/cash/{record_id}")
def delete_cash_record(record_id: int):
    success = engine.delete_cash_record(record_id)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete cash record")
