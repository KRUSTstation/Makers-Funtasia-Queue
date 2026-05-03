from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
import re

from core.config import RATE_LIMIT_TIME
from db.base import get_db
from services import queue_service
from core.rate_limit import RateLimiter

router = APIRouter()

MINS_PER_PERSON = 5  # estimated minutes each person takes

class QueueRequest(BaseModel):
    ph_num: str
    name: str

    @field_validator('ph_num')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean_v = "".join(v.split())
        if not re.match(r'^[89]\d{7}$', clean_v):
            raise ValueError('Invalid phone number. Must be an 8-digit Singapore number starting with 8 or 9.')
        return clean_v


queue_rate_limiter = RateLimiter(RATE_LIMIT_TIME)

@router.post('/add', dependencies=[Depends(queue_rate_limiter)])
def add_queue(data: QueueRequest, request: Request, db=Depends(get_db)):
    if not data: return

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