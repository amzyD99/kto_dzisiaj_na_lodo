PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password         TEXT    NOT NULL,
    avatar           TEXT,
    attendance_offset INTEGER NOT NULL DEFAULT 0,
    is_admin         INTEGER NOT NULL DEFAULT 0,
    message_color    TEXT    NOT NULL DEFAULT '#1e3f6b',
    message_color2   TEXT    NOT NULL DEFAULT '#1e3f6b',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS time_slots (
    id           INTEGER PRIMARY KEY,
    label        TEXT    NOT NULL UNIQUE,
    weekend_only INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendances (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    slot_id    INTEGER NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, slot_id, date)
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT    NOT NULL,
    author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attendances_date      ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_user      ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_slot_date ON attendances(slot_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);
