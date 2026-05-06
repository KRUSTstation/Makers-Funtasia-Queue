from db.base import get_db_connection

def __execute_script(func: callable):
    attempts = 0
    max_attempts = 10

    while attempts <= max_attempts:
        try:
            return func()
        except Exception as e:
            attempts += 1
            import time
            time.sleep(0.2)

            if attempts >= max_attempts:
                print(e)
                return False

def get_all_prizes(db) -> list[dict]:
    cursor = db.cursor()
    cursor.execute('SELECT id, name, points FROM Prizes ORDER BY points ASC')
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

def __add_prize(name: str, points: int, db):
    cursor = db.cursor()
    cursor.execute('INSERT INTO Prizes (name, points) VALUES (?, ?)', (name, points))
    db.commit()
    return True

def add_prize(name: str, points: int, db) -> bool:
    return __execute_script(lambda: __add_prize(name, points, db))

def __delete_prize(prize_id: int, db):
    cursor = db.cursor()
    cursor.execute('DELETE FROM Prizes WHERE id = ?', (prize_id,))
    db.commit()
    return cursor.rowcount > 0

def delete_prize(prize_id: int, db) -> bool:
    return __execute_script(lambda: __delete_prize(prize_id, db))

def __update_prize(prize_id: int, name: str, points: int, db):
    cursor = db.cursor()
    cursor.execute('UPDATE Prizes SET name = ?, points = ? WHERE id = ?', (name, points, prize_id))
    db.commit()
    return cursor.rowcount > 0

def update_prize(prize_id: int, name: str, points: int, db) -> bool:
    return __execute_script(lambda: __update_prize(prize_id, name, points, db))
