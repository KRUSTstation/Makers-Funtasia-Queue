import time

from core.config import VALID_QUEUE_NUMS
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
    cursor.execute('SELECT queue_number FROM Queue')
    used_numbers = [i[0] for i in cursor.fetchall()]

    for num in VALID_QUEUE_NUMS:
        if num not in used_numbers:
            queue_number = num
            break

    if queue_number is None:
        raise Exception("No available queue numbers")

    cursor.execute('INSERT INTO Queue(queue_number, ph_num, name) VALUES (?, ?, ?)', (queue_number, ph_num, name))

    db.commit()

def add_to_queue(data, db):
    success = __execute_script(lambda: __add_to_queue(data.ph_num, data.name, db))

    return success

def __change_status(queue_number: int, status: str, db):
    cursor = db.cursor()