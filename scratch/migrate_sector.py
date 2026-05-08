import sqlite3
import os

db_path = os.path.join('app', 'db', 'queue.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

migrations = [
    ("Prizes", "sector", "ALTER TABLE Prizes ADD COLUMN sector VARCHAR(20) NOT NULL DEFAULT 'software'"),
    ("Prizes", "quantity_left", "ALTER TABLE Prizes ADD COLUMN quantity_left INT NOT NULL DEFAULT -1"),
    ("GamePrices", "sector", "ALTER TABLE GamePrices ADD COLUMN sector VARCHAR(20) NOT NULL DEFAULT 'software'"),
    ("GamePrices", "unit", "ALTER TABLE GamePrices ADD COLUMN unit VARCHAR(50) NOT NULL DEFAULT 'attempt'"),
]

for table, col, sql in migrations:
    try:
        cursor.execute(sql)
        conn.commit()
        print(f"[OK] Added {col} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"[SKIP] {col} already exists in {table}")
        else:
            print(f"[ERR] {table}.{col}: {e}")

conn.close()
print("Migration complete.")
