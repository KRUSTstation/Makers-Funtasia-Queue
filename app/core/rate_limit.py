import time
from fastapi import Request, HTTPException

class RateLimiter:
    def __init__(self, time_limit: int):
        self.time_limit = time_limit
        self.last_request_times: dict[str, float] = {}

    def __call__(self, request: Request):
        client_ip = request.client.host
        now = time.time()
        
        if client_ip in self.last_request_times:
            if now - self.last_request_times[client_ip] < self.time_limit:
                raise HTTPException(
                    status_code=429, 
                    detail=f"Please wait {self.time_limit} seconds before requesting again."
                )
        
        self.last_request_times[client_ip] = now
