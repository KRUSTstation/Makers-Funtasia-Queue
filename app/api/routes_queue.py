from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.config import RATE_LIMIT_TIME
from db.base import get_db
from services import queue_service

router = APIRouter()

MINS_PER_PERSON = 5  # estimated minutes each person takes

class QueueRequest(BaseModel):
    ph_num: str
    name: str

import time

last_request_times: dict[str, float] = {}

@router.post('/add')
def add_queue(data: QueueRequest, request: Request, db=Depends(get_db)):
    if not data: return

    client_ip = request.client.host
    now = time.time()
    if client_ip in last_request_times:
        if now - last_request_times[client_ip] < RATE_LIMIT_TIME:
            return JSONResponse({'status': 'failure', 'detail': 'Please wait 5 seconds before requesting again.'}, status_code=429)
            
    last_request_times[client_ip] = now

    success, queue_number = queue_service.add_to_queue(data, db)

    if not success:
        return JSONResponse({'status': 'failure'}, status_code=500)

    return {'status': 'success', 'queue_number': queue_number}

@router.get('/position/{queue_number}')
def queue_position(queue_number: int, db=Depends(get_db)):
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