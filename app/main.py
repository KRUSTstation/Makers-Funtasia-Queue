from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

import os

from core.config import BASE_DIR, SECRET_KEY, TEMPLATES

from api.routes_queue import router as queue_router
from api.routes_base import router as base_router
from api.routes_admin import router as admin_router
from api.routes_prizes import router as prizes_router

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY, https_only=False)

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return TEMPLATES.TemplateResponse(
            request=request,
            name="error.html",
            context={"error_code": exc.status_code, "error_message": exc.detail},
            status_code=exc.status_code
        )
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return TEMPLATES.TemplateResponse(
            request=request,
            name="error.html",
            context={"error_code": 500, "error_message": "Internal Server Error"},
            status_code=500
        )
    return JSONResponse({"detail": "Internal Server Error"}, status_code=500)

app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, 'frontend', 'css')), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, 'frontend', 'js')), name="js")
app.mount("/images", StaticFiles(directory=os.path.join(BASE_DIR, 'frontend', 'images')), name="images")

app.include_router(base_router, prefix='')
app.include_router(queue_router, prefix='/queue')
app.include_router(admin_router, prefix='/admin')
app.include_router(prizes_router, prefix='')