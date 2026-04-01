# kto dzisiaj na lodo

Ice rink attendance planner. Users register, mark which entry sessions they plan to attend over the next two weeks, and see who else is going along with a per-session attendance chart.

## Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18 + Vite                     |
| Backend  | Node.js + Express                   |
| Database | SQLite via better-sqlite3           |
| Auth     | JWT (jsonwebtoken) + bcrypt         |
| Charts   | Recharts                            |

## Entry hours

15:30 / 17:00 / 18:30 / 20:00

## Setup

### Prerequisites

- Node.js >= 18

### 1. Install server dependencies

```bash
cd server
npm install
```

### 2. Install client dependencies

```bash
cd client
npm install
```

### 3. Configure the server secret

Edit `server/.env` and replace the placeholder `JWT_SECRET` with a long random string.

### 4. Run in development

Open two terminals:

```bash
# Terminal 1 — API server (port 3001)
cd server
npm run dev

# Terminal 2 — Vite dev server (port 5173)
cd client
npm run dev
```

Then open http://localhost:5173 in a browser.

## Project structure

```
.
├── server/
│   ├── index.js            Express entry point
│   ├── db.js               SQLite init + seed
│   ├── schema.sql          DDL
│   ├── .env                JWT_SECRET, PORT
│   ├── middleware/
│   │   └── auth.js         JWT verify middleware
│   └── routes/
│       ├── auth.js         POST /api/auth/register|login
│       └── attendance.js   GET|POST|DELETE /api/attendance
└── client/
    └── src/
        ├── App.jsx
        ├── api.js           Axios instance with JWT interceptor
        ├── contexts/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   └── SchedulePage.jsx
        └── components/
            ├── NavBar.jsx
            ├── WeekNav.jsx
            ├── DayColumn.jsx
            ├── SlotCard.jsx
            └── AttendanceChart.jsx
```
