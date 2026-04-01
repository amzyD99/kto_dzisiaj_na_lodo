const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ice_rink.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Apply DDL from schema file
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Idempotent column migrations. SQLite lacks ADD COLUMN IF NOT EXISTS, so we
// attempt each ALTER TABLE and suppress only the "duplicate column" error.
// Any other error (disk full, locked db, etc.) is re-thrown so it is visible.
function addColumn(sql) {
    try {
        db.exec(sql);
    } catch (err) {
        if (!err.message.includes('duplicate column name')) throw err;
    }
}

addColumn('ALTER TABLE users ADD COLUMN avatar TEXT');
addColumn('ALTER TABLE users ADD COLUMN attendance_offset INTEGER NOT NULL DEFAULT 0');
addColumn('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');

// Chat messages table
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content    TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
`);

// Announcements table
db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        content    TEXT    NOT NULL,
        author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
`);

// Performance index: most per-user queries filter on both user_id and date
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attendances_user_date
    ON attendances(user_id, date)
`);

// Seed fixed time slots once
const slotCount = db.prepare('SELECT COUNT(*) as n FROM time_slots').get().n;
if (slotCount === 0) {
    const insert = db.prepare('INSERT INTO time_slots (id, label) VALUES (?, ?)');
    const seed = db.transaction(() => {
        insert.run(1, '15:30');
        insert.run(2, '17:00');
        insert.run(3, '18:30');
        insert.run(4, '20:00');
    });
    seed();
}

module.exports = db;
