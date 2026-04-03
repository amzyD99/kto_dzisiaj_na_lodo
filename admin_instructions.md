# Database management from the terminal

All commands assume you are in the `server/` directory.
The database file is `ice_rink.db` (SQLite, managed by `better-sqlite3`).

## Opening the database

```bash
sqlite3 ice_rink.db
```

## Users

### List all users

```sql
SELECT id, username, is_admin, created_at FROM users;
```

### Create an admin user

Passwords are stored as bcrypt hashes. Generate one with Node:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('TwojeHaslo', 10).then(h => console.log(h))"
```

Then insert the user with the resulting hash:

```sql
INSERT INTO users (username, password, is_admin)
VALUES ('admin', '$2b$10$...wklej_hash_tutaj...', 1);
```

Both steps combined in a single command:

```bash
node -e "
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('ice_rink.db');
bcrypt.hash('TwojeHaslo', 10).then(hash => {
    db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)').run('admin', hash);
    console.log('Admin user created');
});
"
```

### Promote an existing user to admin

```sql
UPDATE users SET is_admin = 1 WHERE username = 'janek';
```

### Revoke admin privileges

```sql
UPDATE users SET is_admin = 0 WHERE username = 'janek';
```

### Reset a user's password

```bash
node -e "
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('ice_rink.db');
bcrypt.hash('NoweHaslo', 10).then(hash => {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'janek');
    console.log('Password updated');
});
"
```

### Delete a user

```sql
DELETE FROM users WHERE username = 'janek';
```

Foreign keys are set to `ON DELETE CASCADE`, so the user's attendances, messages, and announcements are removed automatically.

## Time slots

### List slots

```sql
SELECT id, label, weekend_only FROM time_slots;
```

### Add a new slot

```sql
INSERT INTO time_slots (id, label, weekend_only) VALUES (8, '09:00', 1);
```

`weekend_only = 1` means the slot is displayed only on weekends. Use `0` for every day.

### Remove a slot

```sql
DELETE FROM time_slots WHERE id = 8;
```

## Attendance

### View attendance for a specific date

```sql
SELECT u.username, t.label AS slot, a.date
FROM attendances a
JOIN users u ON u.id = a.user_id
JOIN time_slots t ON t.id = a.slot_id
WHERE a.date = '2026-04-03';
```

### Remove all attendance records for a date

```sql
DELETE FROM attendances WHERE date = '2026-04-03';
```

## Chat messages

### View recent messages

```sql
SELECT m.id, u.username, m.content, m.created_at
FROM messages m
JOIN users u ON u.id = m.user_id
ORDER BY m.id DESC
LIMIT 20;
```

### Delete a specific message

```sql
DELETE FROM messages WHERE id = 42;
```

## Announcements

### List announcements

```sql
SELECT a.id, u.username AS author, a.content, a.created_at
FROM announcements a
JOIN users u ON u.id = a.author_id
ORDER BY a.created_at DESC;
```

### Create an announcement

```sql
INSERT INTO announcements (content, author_id)
VALUES ('Lodowisko zamkniete w piatek', 1);
```

Replace `1` with the admin user's `id`.

## Full database reset

Delete the database file. It will be recreated with the schema on next server start:

```bash
rm ice_rink.db ice_rink.db-shm ice_rink.db-wal
```
