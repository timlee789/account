"""식재료 주문: 직원 입력(/purchasing/staff/*)과 사장님 가격 비교/주문서(그 외)."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from deps import purchasing
from purchasing import DATE_RE, STATUSES

router = APIRouter(prefix="/purchasing")


def _date(value: str) -> str:
    if not DATE_RE.match(value or ""):
        raise HTTPException(status_code=422, detail="date must be YYYY-MM-DD")
    return value


class QtyUpdate(BaseModel):
    date: str
    item_id: int
    qty: float = Field(ge=0, le=100000)


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = ""
    order_unit: str = "case"
    pack_size: str = ""
    default_vendor_id: Optional[int] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    category: Optional[str] = None
    order_unit: Optional[str] = None
    pack_size: Optional[str] = None
    default_vendor_id: Optional[int] = None
    sort_order: Optional[int] = None


class VendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class VendorUpdate(BaseModel):
    active: bool


class PriceUpdate(BaseModel):
    item_id: int
    vendor_id: int
    price: Optional[float] = Field(default=None, ge=0)
    note: str = ""
    vendor_code: str = ""


class VendorAssign(BaseModel):
    vendor_id: Optional[int] = None


class OrderedRequest(BaseModel):
    date: str
    vendor_id: int


class StatusUpdate(BaseModel):
    status: str


# ---------------- 직원 (가격/구매처 정보는 내려주지 않는다) ----------------
@router.get("/staff/items")
def staff_items():
    items = purchasing.list_items()
    return {"data": [{k: i[k] for k in ("id", "name", "category", "order_unit", "pack_size")} for i in items]}


@router.get("/staff/requests")
def staff_requests(date: str = Query(...)):
    return {"data": purchasing.get_requests(_date(date))}


@router.put("/staff/requests")
def staff_set_request(update: QtyUpdate, request: Request):
    return _set_qty(update, getattr(request.state, "role", "staff"))


def _set_qty(update: QtyUpdate, who: str):
    if not purchasing.set_request_qty(_date(update.date), update.item_id, update.qty, who):
        raise HTTPException(status_code=409, detail="이미 발주 처리된 품목은 수정할 수 없습니다.")
    return {"status": "success"}


# ---------------- 관리자 ----------------
@router.put("/requests")
def admin_set_request(update: QtyUpdate):
    return _set_qty(update, "admin")


@router.get("/items")
def list_items(include_inactive: bool = False):
    return {"data": purchasing.list_items(include_inactive)}


@router.post("/items")
def add_item(item: ItemCreate):
    return purchasing.add_item(**item.model_dump())


@router.put("/items/{item_id}")
def update_item(item_id: int, item: ItemUpdate):
    purchasing.update_item(item_id, item.model_dump(exclude_unset=True))
    return {"status": "success"}


@router.delete("/items/{item_id}")
def delete_item(item_id: int):
    purchasing.deactivate_item(item_id)
    return {"status": "success"}


@router.get("/vendors")
def list_vendors():
    return {"data": purchasing.list_vendors()}


@router.post("/vendors")
def add_vendor(vendor: VendorCreate):
    return purchasing.add_vendor(vendor.name)


@router.put("/vendors/{vendor_id}")
def update_vendor(vendor_id: int, vendor: VendorUpdate):
    purchasing.set_vendor_active(vendor_id, vendor.active)
    return {"status": "success"}


@router.get("/prices")
def list_prices():
    return {"data": purchasing.list_prices()}


@router.put("/prices")
def set_price(p: PriceUpdate):
    purchasing.set_price(p.item_id, p.vendor_id, p.price, p.note, p.vendor_code)
    return {"status": "success"}


@router.delete("/prices")
def remove_price(item_id: int, vendor_id: int):
    purchasing.remove_price(item_id, vendor_id)
    return {"status": "success"}


@router.get("/prices/history/{item_id}")
def price_history(item_id: int):
    return {"data": purchasing.price_history(item_id)}


@router.get("/compare")
def compare(date: str = Query(...)):
    return purchasing.compare(_date(date))


@router.put("/requests/{request_id}/vendor")
def assign_vendor(request_id: int, body: VendorAssign):
    if not purchasing.assign_vendor(request_id, body.vendor_id):
        raise HTTPException(status_code=409, detail="이미 발주 처리되었거나 존재하지 않는 요청입니다.")
    return {"status": "success"}


@router.post("/orders/ordered")
def mark_ordered(body: OrderedRequest):
    return {"status": "success", "updated": purchasing.mark_ordered(_date(body.date), body.vendor_id)}


@router.put("/requests/{request_id}/status")
def set_status(request_id: int, body: StatusUpdate):
    if body.status not in STATUSES or not purchasing.set_status(request_id, body.status):
        raise HTTPException(status_code=422, detail=f"status must be one of {STATUSES}")
    return {"status": "success"}
