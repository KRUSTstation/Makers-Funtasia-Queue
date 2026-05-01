from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db.base import get_db
from services import queue_service

router = APIRouter()

MINS_PER_PERSON = 5  # estimated minutes each person takes

class QueueRequest(BaseModel):
    ph_num: str
    name: str

@router.post('/add')
def add_queue(data: QueueRequest, db=Depends(get_db)):
    if not data: return

    success, queue_number = queue_service.add_to_queue(data, db)

    if not success:
        return JSONResponse({'status': 'failure'}, status_code=500)

    return {'status': 'success', 'queue_number': queue_number}

@router.get('/position/{queue_number}')
def queue_position(queue_number: int, db=Depends(get_db)):
    """Public endpoint — returns position and estimated wait for status page."""
    info = queue_service.get_queue_position(queue_number, db)
    if info is None:
        return JSONResponse({'detail': 'Queue entry not found'}, status_code=404)

    info['estimated_wait_mins'] = max(0, info['ahead']) * MINS_PER_PERSON
    return info

@router.get('/get')
def get_queue(request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)
    rows = queue_service.get_all_queue(db)
    return rows