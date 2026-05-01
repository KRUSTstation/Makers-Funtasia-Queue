from fastapi.templating import Jinja2Templates

import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..','..')

TEMPLATES = Jinja2Templates(directory=os.path.join(BASE_DIR, os.getenv("TEMPLATES_FOLDER")))

RESETDB = True if os.getenv('RESETDB') == '1' else False
DB_PATH = os.path.join(BASE_DIR, "app", "db")

VALID_QUEUE_NUMS = [i for i in range(1, 1000)]

ADMIN_USERNAME = os.getenv('ADMIN_USERNAME')
ADMIN_PASSWORD = os.getenv('ADMIN_PASS')
SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-dev-secret')

VALID_QUEUE_STATUSES = ('waiting', 'serving', 'done')
