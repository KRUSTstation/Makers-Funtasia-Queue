import time

from core.config import VALID_QUEUE_NUMS, VALID_QUEUE_STATUSES
from db.base import get_db_connection

def __execute_script(func: callable):
    attempts = 0
    max_attempts = 10

    while attempts <= max_attempts:
        try:
            func()
            break
        
        except Exception as e:
            attempts+=1
            time.sleep(0.2)

            if attempts >= max_attempts:
                print(e)
                return False
    
    return True

def __add_to_queue(ph_num, name, db):
    cursor = db.cursor()
    cursor.execute("SELECT queue_number FROM Queue WHERE status IN ('waiting', 'serving')")
    used_numbers = [i[0] for i in cursor.fetchall()]


    queue_number = None
    for num in VALID_QUEUE_NUMS:
        if num not in used_numbers:
            queue_number = num
            break

    if queue_number is None:
        raise Exception("No available queue numbers")

    cursor.execute('INSERT INTO Queue(queue_number, ph_num, name) VALUES (?, ?, ?)', (queue_number, ph_num, name))
    db.commit()
    return queue_number

def add_to_queue(data, db):
    queue_number = None

    def _do():
        nonlocal queue_number
        queue_number = __add_to_queue(data.ph_num, data.name, db)

    success = __execute_script(_do)
    return success, queue_number

def __change_status(queue_number: int, status: str, db):
    if status not in VALID_QUEUE_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of {VALID_QUEUE_STATUSES}")

    cursor = db.cursor()
    cursor.execute(
        '''
        UPDATE Queue 
        SET status = ? 
        WHERE id = (SELECT id FROM Queue WHERE queue_number = ? ORDER BY id DESC LIMIT 1)
        ''',
        (status, queue_number)
    )

    if cursor.rowcount == 0:
        raise Exception(f"Queue number {queue_number} not found")
    db.commit()

def change_status(queue_number: int, status: str, db) -> bool:
    return __execute_script(lambda: __change_status(queue_number, status, db))


def get_queue_position(queue_number: int, db):
    cursor = db.cursor()
    cursor.execute(
        'SELECT id, queue_number, name, status FROM Queue WHERE queue_number = ? ORDER BY id DESC LIMIT 1',
        (queue_number,)
    )
    row = cursor.fetchone()
    if row is None:
        return None

    cursor.execute(
        "SELECT COUNT(*) FROM Queue WHERE status = 'waiting' AND id < ?",
        (row['id'],)
    )

    ahead = cursor.fetchone()[0]

    return {
        'queue_number': row['queue_number'],
        'name':         row['name'],
        'status':       row['status'],
        'position':     ahead + 1,
        'ahead':        ahead,
    }

def get_all_queue(db) -> list[dict]:
    cursor = db.cursor()
    cursor.execute(
        'SELECT queue_number, name, ph_num, status, created_at '
        'FROM Queue ORDER BY queue_number ASC'
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]
