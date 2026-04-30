from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db.base import get_db
from services import queue_service

router = APIRouter()

class QueueRequest(BaseModel):
    ph_num: str
    name: str

@router.post('/add')
def add_queue(data: QueueRequest, db = Depends(get_db)):
    if not data: return

    success = queue_service.add_to_queue(data, db)

    return {'status': 'success' if success else 'failure'}