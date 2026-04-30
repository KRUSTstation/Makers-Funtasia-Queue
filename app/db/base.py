import sqlite3
import os
from typing import Generator

from core.config import RESETDB, DB_PATH

def __reset_db():
    if not RESETDB: return

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = cursor.fetchall()

    for table in tables:
        cursor.execute(f"DROP TABLE IF EXISTS {table[0]}")

    with open(os.path.join(DB_PATH, 'schema.sql'), 'r') as f:
        cursor.executescript(f.read())

    conn.commit()
    conn.close()

def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(os.path.join(DB_PATH, 'queue.db'))
    conn.row_factory = sqlite3.Row

    try:
        yield conn
    finally:
        conn.close()

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(os.path.join(DB_PATH, 'queue.db'))
    conn.row_factory = sqlite3.Row
    return conn

__reset_db()