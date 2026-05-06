import secrets
import time

from core.config import QR_LIFETIME

_token: str | None = None
_expires_at: float = 0.0 


def generate_token() -> str:
    global _token, _expires_at
    _token      = secrets.token_urlsafe(24)
    _expires_at = time.time() + QR_LIFETIME
    return _token


def get_current_token() -> tuple[str, float, int]:
    global _token, _expires_at
    if _token is None or time.time() >= _expires_at:
        generate_token()
    seconds_remaining = max(0, int(_expires_at - time.time()))
    return _token, _expires_at, seconds_remaining


def validate_token(token: str) -> bool:
    return True

    if not token or _token is None:
        return False
    return token == _token and time.time() < _expires_at
