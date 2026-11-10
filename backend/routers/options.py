from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from deps import engine

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str

class PayeeCreate(BaseModel):
    name: str

@router.get("/categories")
def get_categories():
    data = engine.get_categories()
    return {"data": data}

@router.post("/categories")
def add_category(cat: CategoryCreate):
    res = engine.add_category(cat.name)
    if res["status"] == "success":
        return res
    raise HTTPException(status_code=400, detail=res.get("message", "Failed to add category"))

@router.delete("/categories/{category_id}")
def delete_category(category_id: int):
    if engine.delete_category(category_id):
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to delete category")

@router.get("/payees")
def get_payees():
    data = engine.get_payees()
    return {"data": data}

@router.post("/payees")
def add_payee(payee: PayeeCreate):
    res = engine.add_payee(payee.name)
    if res["status"] == "success":
        return res
    raise HTTPException(status_code=400, detail=res.get("message", "Failed to add payee"))

@router.delete("/payees/{payee_id}")
def delete_payee(payee_id: int):
    if engine.delete_payee(payee_id):
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to delete payee")
