from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from core.config import TEMPLATES

router = APIRouter()

@router.get('/', response_class=HTMLResponse)
def base(request: Request):
    return TEMPLATES.TemplateResponse(request, 'index.html')

@router.get('/queue/status', response_class=HTMLResponse)
def queue_status_page(request: Request):
    return TEMPLATES.TemplateResponse(request, 'queue_status.html')

@router.get('/join', response_class=HTMLResponse)
def join_page(request: Request):
    return TEMPLATES.TemplateResponse(request, 'join_queue.html')

@router.get('/instructions', response_class=HTMLResponse)
def instructions_page(request: Request):
    return TEMPLATES.TemplateResponse(request, 'instructions.html')