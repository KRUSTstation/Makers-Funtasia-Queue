from fastapi import FastAPI

from api.routes_queue import router as queue_router

app = FastAPI()

app.include_router(queue_router, prefix='/queue')