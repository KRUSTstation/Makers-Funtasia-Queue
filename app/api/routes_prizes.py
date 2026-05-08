from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel

from db.base import get_db
from services import prize_service
from core.config import TEMPLATES

router = APIRouter()

class PrizeRequest(BaseModel):
    name: str
    sector: str
    points: int
    quantity_left: int = -1

class QuantityRequest(BaseModel):
    quantity_left: int

@router.get('/prizes', response_class=HTMLResponse)
def prizes_page(request: Request):
    return TEMPLATES.TemplateResponse(request, 'prizes.html')

@router.get('/api/prizes')
def get_prizes(db=Depends(get_db)):
    return prize_service.get_all_prizes(db)

@router.post('/admin/prizes')
async def add_prize(data: PrizeRequest, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = prize_service.add_prize(data.name, data.sector, data.points, data.quantity_left, db)
    if not success:
        return JSONResponse({'detail': 'Failed to add prize'}, status_code=500)

    return {'success': True}

@router.delete('/admin/prizes/{prize_id}')
async def delete_prize(prize_id: int, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = prize_service.delete_prize(prize_id, db)
    if not success:
        return JSONResponse({'detail': 'Prize not found or failed to delete'}, status_code=404)

    return {'success': True}

@router.patch('/admin/prizes/{prize_id}')
async def update_prize(prize_id: int, data: PrizeRequest, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = prize_service.update_prize(prize_id, data.name, data.sector, data.points, data.quantity_left, db)
    if not success:
        return JSONResponse({'detail': 'Prize not found or failed to update'}, status_code=404)

    return {'success': True}

@router.patch('/admin/prizes/{prize_id}/quantity')
async def update_prize_quantity(prize_id: int, data: QuantityRequest, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    success = prize_service.update_quantity(prize_id, data.quantity_left, db)
    if not success:
        return JSONResponse({'detail': 'Prize not found or failed to update'}, status_code=404)

    return {'success': True}
