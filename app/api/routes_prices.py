from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db.base import get_db
from services import price_service

router = APIRouter()

class PriceRequest(BaseModel):
    item_name: str
    price: str
    sector: str
    unit: str

@router.get('/api/prices')
def get_prices(db=Depends(get_db)):
    return price_service.get_all_prices(db)

@router.post('/admin/prices')
async def add_price(data: PriceRequest, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = price_service.add_price(data.item_name, data.price, data.sector, data.unit, db)
    if not success:
        return JSONResponse({'detail': 'Failed to add price'}, status_code=500)

    return {'success': True}

@router.delete('/admin/prices/{price_id}')
async def delete_price(price_id: int, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = price_service.delete_price(price_id, db)
    if not success:
        return JSONResponse({'detail': 'Price not found or failed to delete'}, status_code=404)

    return {'success': True}

@router.patch('/admin/prices/{price_id}')
async def update_price(price_id: int, data: PriceRequest, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = price_service.update_price(price_id, data.item_name, data.price, data.sector, data.unit, db)
    if not success:
        return JSONResponse({'detail': 'Price not found or failed to update'}, status_code=404)

    return {'success': True}
