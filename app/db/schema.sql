CREATE TABLE Queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_number INT NOT NULL,
    ph_num VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    attempts INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'serving', 'done')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP UNIQUE
);