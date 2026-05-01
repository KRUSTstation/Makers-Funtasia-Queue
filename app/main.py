from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

import os

from core.config import BASE_DIR, SECRET_KEY

from api.routes_queue import router as queue_router
from api.routes_base import router as base_router
from api.routes_admin import router as admin_router

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY, https_only=False)

app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, 'frontend', 'css')), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, 'frontend', 'js')), name="js")

app.include_router(base_router, prefix='')
app.include_router(queue_router, prefix='/queue')
app.include_router(admin_router, prefix='/admin')