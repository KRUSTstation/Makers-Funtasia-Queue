import sqlite3
import os

db_path = os.path.join('app', 'db', 'queue.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS GamePrices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name VARCHAR(255) NOT NULL,
            price VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    print("GamePrices table created successfully.")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    conn.close()
