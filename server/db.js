const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ice_rink.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Apply DDL from schema file
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Seed fixed time slots once
const slotCount = db.prepare('SELECT COUNT(*) as n FROM time_slots').get().n;
if (slotCount === 0) {
    const insert = db.prepare('INSERT INTO time_slots (id, label, weekend_only) VALUES (?, ?, ?)');
    const seed = db.transaction(() => {
        insert.run(1, '15:30', 0);
        insert.run(2, '17:00', 0);
        insert.run(3, '18:30', 0);
        insert.run(4, '20:00', 0);
        insert.run(5, '11:00', 1);
        insert.run(6, '12:30', 1);
        insert.run(7, '14:00', 1);
    });
    seed();
}

// Ensure weekend slots exist (idempotent for existing databases)
const weekendSlots = [
    [5, '11:00', 1],
    [6, '12:30', 1],
    [7, '14:00', 1],
];
const insertIfMissing = db.prepare(
    'INSERT OR IGNORE INTO time_slots (id, label, weekend_only) VALUES (?, ?, ?)'
);
for (const s of weekendSlots) insertIfMissing.run(...s);

module.exports = db;
