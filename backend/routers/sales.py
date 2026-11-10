from typing import Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from deps import engine

router = APIRouter()

class SalesUpdate(BaseModel):
    date: str
    field: str
    value: Union[float, int, str]

@router.get("/sales")
def get_sales():
    """매출 기록 목록을 가져옵니다."""
    data = engine.get_sales_records()
    return data

@router.delete("/sales/{date}")
def delete_sales(date: str):
    success = engine.delete_sales_record(date)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete record")

@router.post("/update-sales")
def update_sales(update: SalesUpdate):
    """매일의 매출 수치를 저장하거나 수정합니다."""
    success = engine.update_sales_record(update.date, update.field, update.value)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Sales record update failed")
