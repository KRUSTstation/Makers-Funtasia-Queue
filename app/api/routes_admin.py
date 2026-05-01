from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from db.base import get_db
from services import queue_service
from core.config import TEMPLATES, ADMIN_USERNAME, ADMIN_PASSWORD, VALID_QUEUE_STATUSES

router = APIRouter()


def _require_admin(request: Request):
    return request.session.get('is_admin', False)


@router.get('/login', response_class=HTMLResponse)
def login(request: Request):
    if request.session.get('is_admin'):
        return RedirectResponse('/admin/dashboard', status_code=302)
    return TEMPLATES.TemplateResponse(request, 'admin_login.html')


@router.get('/dashboard', response_class=HTMLResponse)
def dashboard(request: Request):
    if not request.session.get('is_admin'):
        return RedirectResponse('/admin/login', status_code=302)
    return TEMPLATES.TemplateResponse(request, 'admin_dashboard.html')


@router.post('/auth', response_class=JSONResponse)
async def auth(request: Request):
    data = await request.json()
    username = data['username']
    password = data['password']
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        request.session['is_admin'] = True
        return JSONResponse({'success': True}, status_code=200)
    else:
        return JSONResponse(
            {'success': False, 'detail': 'Invalid username or password.'},
            status_code=401
        )


@router.get('/logout')
def logout(request: Request):
    request.session.clear()
    return RedirectResponse('/admin/login', status_code=302)


@router.patch('/queue/{queue_number}/status')
async def update_status(queue_number: int, request: Request, db=Depends(get_db)):
    if not request.session.get('is_admin'):
        return JSONResponse({'detail': 'Not authenticated'}, status_code=401)

    data   = await request.json()
    status = data.get('status', '')

    if status not in VALID_QUEUE_STATUSES:
        return JSONResponse(
            {'detail': f"Invalid status. Must be one of {queue_service.VALID_STATUSES}"},
            status_code=422
        )

    ok = queue_service.change_status(queue_number, status, db)
    if not ok:
        return JSONResponse({'detail': 'Queue entry not found or update failed'}, status_code=404)

    return {'success': True, 'queue_number': queue_number, 'status': status}