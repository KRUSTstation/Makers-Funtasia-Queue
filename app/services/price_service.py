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

def get_all_prices(db) -> list[dict]:
    cursor = db.cursor()
    cursor.execute('SELECT id, item_name, price, sector, unit FROM GamePrices ORDER BY sector ASC, created_at ASC')
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

def __add_price(item_name: str, price: str, sector: str, unit: str, db):
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO GamePrices (item_name, price, sector, unit) VALUES (?, ?, ?, ?)',
        (item_name, price, sector, unit)
    )
    db.commit()
    return True

def add_price(item_name: str, price: str, sector: str, unit: str, db) -> bool:
    return __execute_script(lambda: __add_price(item_name, price, sector, unit, db))

def __delete_price(price_id: int, db):
    cursor = db.cursor()
    cursor.execute('DELETE FROM GamePrices WHERE id = ?', (price_id,))
    db.commit()
    return cursor.rowcount > 0

def delete_price(price_id: int, db) -> bool:
    return __execute_script(lambda: __delete_price(price_id, db))

def __update_price(price_id: int, item_name: str, price: str, sector: str, unit: str, db):
    cursor = db.cursor()
    cursor.execute(
        'UPDATE GamePrices SET item_name = ?, price = ?, sector = ?, unit = ? WHERE id = ?',
        (item_name, price, sector, unit, price_id)
    )
    db.commit()
    return cursor.rowcount > 0

def update_price(price_id: int, item_name: str, price: str, sector: str, unit: str, db) -> bool:
    return __execute_script(lambda: __update_price(price_id, item_name, price, sector, unit, db))
