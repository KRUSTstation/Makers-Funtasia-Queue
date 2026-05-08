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
    cursor.execute('SELECT id, name, sector, points, quantity_left FROM Prizes ORDER BY sector ASC, points ASC')
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

def __add_prize(name: str, sector: str, points: int, quantity_left: int, db):
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO Prizes (name, sector, points, quantity_left) VALUES (?, ?, ?, ?)',
        (name, sector, points, quantity_left)
    )
    db.commit()
    return True

def add_prize(name: str, sector: str, points: int, quantity_left: int, db) -> bool:
    return __execute_script(lambda: __add_prize(name, sector, points, quantity_left, db))

def __delete_prize(prize_id: int, db):
    cursor = db.cursor()
    cursor.execute('DELETE FROM Prizes WHERE id = ?', (prize_id,))
    db.commit()
    return cursor.rowcount > 0

def delete_prize(prize_id: int, db) -> bool:
    return __execute_script(lambda: __delete_prize(prize_id, db))

def __update_prize(prize_id: int, name: str, sector: str, points: int, quantity_left: int, db):
    cursor = db.cursor()
    cursor.execute(
        'UPDATE Prizes SET name = ?, sector = ?, points = ?, quantity_left = ? WHERE id = ?',
        (name, sector, points, quantity_left, prize_id)
    )
    db.commit()
    return cursor.rowcount > 0

def update_prize(prize_id: int, name: str, sector: str, points: int, quantity_left: int, db) -> bool:
    return __execute_script(lambda: __update_prize(prize_id, name, sector, points, quantity_left, db))

def __update_quantity(prize_id: int, quantity_left: int, db):
    cursor = db.cursor()
    cursor.execute('UPDATE Prizes SET quantity_left = ? WHERE id = ?', (quantity_left, prize_id))
    db.commit()
    return cursor.rowcount > 0

def update_quantity(prize_id: int, quantity_left: int, db) -> bool:
    return __execute_script(lambda: __update_quantity(prize_id, quantity_left, db))
