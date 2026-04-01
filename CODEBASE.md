# Codebase Reference

Explanation of every file in the project, grouped by layer.

---

## Root

### `readme.md`
Setup guide: prerequisites, install commands, how to run both dev servers, and a high-level project structure tree.

### `.gitignore`
Tells git to ignore `node_modules/`, the SQLite database file, and `.env` files so secrets and build artifacts are never committed.

---

## Server (`server/`)

### `server/package.json`
npm manifest for the backend process. Declares runtime dependencies (`express`, `better-sqlite3`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv`) and the dev dependency `nodemon` for hot-reloading. Defines two scripts: `start` (plain node) and `dev` (nodemon via npx, required on WSL where bin permissions are restricted).

### `server/.env`
Environment variable file loaded by `dotenv` at startup. Contains two variables:
- `JWT_SECRET` — the secret key used to sign and verify JSON Web Tokens. Must be kept private; never commit a real value.
- `PORT` — the TCP port the Express server binds to (default `3001`).

### `server/schema.sql`
SQLite DDL executed once on server startup. Defines three tables:

| Table | Purpose |
|---|---|
| `users` | Stores registered accounts: `id`, `username` (unique, case-insensitive), bcrypt `password` hash, `created_at` timestamp. |
| `time_slots` | Static lookup table for the four entry hours (15:30, 17:00, 18:30, 20:00). Using a FK target instead of raw strings normalises the schema. |
| `attendances` | One row per (user, slot, date) triple. A `UNIQUE (user_id, slot_id, date)` constraint enforces the one-mark-per-slot rule at the database level, independent of application logic. |

Also sets `PRAGMA journal_mode = WAL` (Write-Ahead Logging) for concurrent read performance and `PRAGMA foreign_keys = ON` to enforce referential integrity.

### `server/db.js`
Initialises the SQLite database using `better-sqlite3` (a synchronous driver — no async/await needed for DB calls). On module load it:
1. Opens or creates `ice_rink.db` in the same directory.
2. Executes `schema.sql` to create tables if they do not yet exist (`CREATE TABLE IF NOT EXISTS`).
3. Seeds the four `time_slots` rows if the table is empty (runs inside a `better-sqlite3` transaction to make the four inserts atomic).

Exports the database instance so every other module that requires it shares the same connection.

### `server/index.js`
Express application entry point. Responsibilities:
- Loads `.env` via `dotenv`.
- Applies global middleware: `cors()` (allows the Vite dev server on port 5173 to call the API) and `express.json()` (parses JSON request bodies).
- Mounts route modules: `/api/auth` and `/api/attendance`.
- Registers a generic error handler that logs the error server-side and returns a `500` JSON response without leaking stack traces to the client.
- Starts the HTTP server on `process.env.PORT`.

### `server/middleware/auth.js`
Express middleware function `requireAuth`. Extracts the JWT from the `Authorization: Bearer <token>` header, verifies its signature and expiry against `JWT_SECRET` using `jsonwebtoken.verify()`, and attaches the decoded payload (containing `id` and `username`) to `req.user`. Returns `401` if the header is absent or the token is invalid/expired. Mounted on all attendance routes.

### `server/routes/auth.js`
Two endpoints:

**`POST /api/auth/register`** — validates that `username` is at least 2 characters and `password` is at least 6 characters, hashes the password with `bcrypt` (10 salt rounds), inserts the new user via `RETURNING` to get the generated `id`, and issues a JWT. Returns `409` if the username is already taken (detected by SQLite's UNIQUE constraint violation).

**`POST /api/auth/login`** — looks up the user by username, uses `bcrypt.compare()` to verify the supplied password against the stored hash (timing-safe comparison), and issues a JWT on success. Returns `401` with a generic "Invalid credentials" message for both unknown username and wrong password to avoid user enumeration.

Both endpoints return `{ token, user: { id, username } }`.

### `server/routes/attendance.js`
Three protected endpoints (all require `requireAuth`):

**`GET /api/attendance?from=&to=`** — retrieves all attendance rows in the given date range with a single SQL JOIN against `users`. Aggregates the flat rows into `(date, slot_id) => users[]` using an in-memory map keyed by a composite string. Returns `{ slots, attendances }` so a single HTTP request hydrates the entire two-week grid.

**`POST /api/attendance`** — validates that the requested date falls within the server-computed 14-day window (today to today + 13 days) before inserting. The window is recomputed on every request so it always reflects the real calendar day. Returns `400` if the date is out of range, `409` on a duplicate mark.

**`DELETE /api/attendance/:slot_id/:date`** — removes only the calling user's attendance row (the `WHERE user_id = req.user.id` clause prevents a user from deleting another user's record). Returns `404` if no matching row exists.

---

## Client (`client/`)

### `client/package.json`
npm manifest for the frontend. Runtime dependencies: `react`, `react-dom`, `react-router-dom` (v6 routing), `axios` (HTTP client), `recharts` (bar chart). Dev dependencies: `vite` and `@vitejs/plugin-react` (JSX transform, HMR).

### `client/index.html`
Minimal HTML shell required by Vite. Contains a single `<div id="root">` mount point and a `<script type="module">` tag pointing at `src/main.jsx`. Vite injects hashed asset URLs at build time.

### `client/vite.config.js`
Vite configuration. Enables the React plugin for JSX. Configures a development proxy: any request from the browser to `/api/*` is forwarded to `http://localhost:3001`, so the client code uses relative paths and never needs CORS headers during development.

### `client/src/main.jsx`
React application bootstrap. Calls `ReactDOM.createRoot()` on the `#root` element and renders `<App />` wrapped in `<React.StrictMode>`. Imports the global `index.css`.

### `client/src/index.css`
Global CSS reset and CSS custom property (variable) definitions. Sets the dark-theme colour palette (`--bg`, `--surface`, `--accent`, etc.), base typography, and box-sizing. All component styles consume these variables, making a theme change a single-file edit.

### `client/src/api.js`
A pre-configured `axios` instance with `baseURL: '/api'`. A request interceptor reads the JWT from `localStorage` and injects it as `Authorization: Bearer <token>` on every outgoing request. All components import this instance instead of raw `axios`, ensuring authentication headers are always present without repetition.

### `client/src/App.jsx`
Root component. Wraps the entire tree in `<AuthProvider>` (context) and `<BrowserRouter>` (routing). Defines three routes:
- `/` — protected by `ProtectedRoute`; renders `SchedulePage`. Redirects unauthenticated users to `/login`.
- `/login` — wrapped in `GuestRoute`; redirects already-authenticated users to `/`.
- `/register` — same guest guard.
- `*` — catch-all redirect to `/`.

### `client/src/contexts/AuthContext.jsx`
React context providing authentication state to the entire component tree. Initialises `user` from `localStorage` on first render (so a page refresh does not log the user out). Exposes:
- `user` — the stored `{ id, username }` object or `null`.
- `login(token, userData)` — persists both values to `localStorage` and updates state.
- `logout()` — clears `localStorage` and nulls the state, which triggers `ProtectedRoute` to redirect to `/login`.

---

## Pages (`client/src/pages/`)

### `LoginPage.jsx`
Controlled form with `username` and `password` inputs. On submit calls `POST /api/auth/login` via the shared `api` instance. On success calls `login()` from `AuthContext` and navigates to `/`. Renders inline error messages from the API response.

### `RegisterPage.jsx`
Identical structure to `LoginPage` but calls `POST /api/auth/register`. HTML5 `minLength` attributes provide client-side pre-validation before the request is sent.

### `AuthPage.module.css`
Shared CSS Module used by both auth pages. Centres the form card vertically and horizontally, styles inputs with focus highlight, and provides the error message block with a red border.

### `SchedulePage.jsx`
The main view. Manages two pieces of state: `weekOffset` (0 = current 7 days, 1 = next 7 days) and `attendanceMap` (a flat object keyed by `"YYYY-MM-DD::slotId"`). On mount and whenever `weekOffset` changes, fetches the full attendance payload for the visible week. Implements `toggleAttendance(date, slotId)` with an optimistic update pattern: the local state is mutated synchronously before the HTTP request is sent, giving instant UI feedback. If the request fails the state is reconciled by re-fetching ground truth.

### `SchedulePage.module.css`
Layout CSS for the schedule page: full-height flex column, constrained-width main area, and a 7-column CSS Grid for the day columns. Responsive breakpoints collapse the grid to 4 and then 2 columns on smaller viewports.

---

## Components (`client/src/components/`)

### `NavBar.jsx` / `NavBar.module.css`
Sticky top bar displaying the application name and the signed-in username. Contains a "Sign out" button that calls `logout()` from `AuthContext`.

### `WeekNav.jsx` / `WeekNav.module.css`
Navigation control that displays the human-readable date range for the visible week (e.g. "Mon 30 Mar - Sun 5 Apr") and two buttons to switch between week 0 and week 1. Buttons are disabled at their respective boundaries so the user cannot navigate outside the 14-day window.

### `DayColumn.jsx` / `DayColumn.module.css`
Renders a single day's column in the grid. Parses the ISO date string to derive the day name and date label. Applies a visual highlight border when the column represents today. Renders one `SlotCard` per time slot, passing the relevant slice of `attendanceMap` and the current user's ID so the card knows whether to display the slot as "going".

### `SlotCard.jsx` / `SlotCard.module.css`
The core interactive unit. Displays the entry time, a toggle button ("Join" / "Going"), and a collapsible attendee count. The attendee list is hidden by default and revealed via a local `open` boolean state, toggled by clicking the count button. The toggle button inverts its colour scheme when `isMarked` is true. Calls `onToggle` (provided by `SchedulePage` via `DayColumn`) on click.

### `AttendanceChart.jsx` / `AttendanceChart.module.css`
Renders a grouped bar chart using Recharts. The `buildChartData` function transforms `attendanceMap` into the array format Recharts expects: one object per day, with each time-slot label as a numeric key. Uses `ResponsiveContainer` so the chart reflows with the window width. Each slot is assigned a distinct colour constant. Tooltip and axis tick styles use the CSS variable palette for visual consistency with the rest of the UI.
