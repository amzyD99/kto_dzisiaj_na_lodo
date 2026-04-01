PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS time_slots (
    id    INTEGER PRIMARY KEY,
    label TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS attendances (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    slot_id    INTEGER NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, slot_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendances_date      ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_user      ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_slot_date ON attendances(slot_id, date);
