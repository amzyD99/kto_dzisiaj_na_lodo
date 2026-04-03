const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const db = new Database(path.join(__dirname, '../server/ice_rink.db'));

const TARGET_DATE = '2026-04-01';
const SLOT_IDS = [1, 2, 3, 4];

const USERNAMES = [
    'mroźny_zbyszek', 'lodowa_krysia', 'ślizgacz_marek', 'hokejka_ania',
    'zimny_patrol', 'łyżwiarz99', 'pingwin_tomek', 'szron_magda',
    'cztery_okrążenia', 'lodowiec_piotrek', 'srebna_łyżwa', 'wieczna_zima',
    'slalom_basia', 'polar_express', 'góral_na_lodzie', 'zawrotek_jarek',
    'lodowa_księżniczka', 'szybki_żbik', 'mróz_i_lód', 'śnieżna_kula',
];

async function seed() {
    const hash = await bcrypt.hash('haslo123', 10);

    const insertUser = db.prepare(
        'INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)'
    );
    const getUser = db.prepare('SELECT id FROM users WHERE username = ?');
    const insertAttendance = db.prepare(
        'INSERT OR IGNORE INTO attendances (user_id, slot_id, date) VALUES (?, ?, ?)'
    );

    let totalAttendances = 0;

    for (const username of USERNAMES) {
        insertUser.run(username, hash);
        const { id } = getUser.get(username);

        // Each user attends 1–3 randomly selected slots
        const shuffled = [...SLOT_IDS].sort(() => Math.random() - 0.5);
        const slotCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < slotCount; i++) {
            insertAttendance.run(id, shuffled[i], TARGET_DATE);
            totalAttendances++;
        }
    }

    console.log(`Inserted ${USERNAMES.length} users, ${totalAttendances} attendance records on ${TARGET_DATE}.`);
    db.close();
}

seed().catch(console.error);
