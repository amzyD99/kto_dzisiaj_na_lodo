# Project Review — kto dzisiaj na lodo

---

## Strong points

### Architecture
- Clear separation of concerns: each server route lives in its own file, client pages and components are isolated, and shared state flows through a single AuthContext rather than prop drilling.
- Idempotent database migrations via `try/catch ALTER TABLE` allow the server to start cleanly on any database state without a formal migration runner.
- The `ON DELETE CASCADE` foreign key on `attendances.user_id` means deleting a user atomically removes all their attendance records — no orphaned rows are possible.
- `UNIQUE (user_id, slot_id, date)` on the attendances table makes duplicate entries physically impossible at the database level, independent of application logic.
- Optimistic UI updates in `SchedulePage` with automatic revert on failure keep the interface feeling responsive without sacrificing consistency.

### Security
- Passwords are stored exclusively as bcrypt hashes with 10 salt rounds — plaintext passwords never touch the database.
- JWTs carry `is_admin` and are verified on every protected request; the `requireAdmin` middleware guards all admin-only endpoints server-side, so the frontend admin check is purely cosmetic.
- Admin user deletion requires confirmation with the acting administrator's own password, preventing accidental or unauthorized account removal.
- Self-deletion is blocked at the API level, preventing an admin from locking out the last admin account.
- Avatar uploads are filtered by MIME type and capped at 2 MB.

### Frontend
- Attendance toggling is fully functional on both mouse and touch devices via `onPointerEnter`/`onPointerLeave` (mouse) and `onClick` with `pointerType` discrimination (touch), avoiding the synthesized event interference problem.
- Past dates are made read-only both visually (opacity, cursor) and logically (the toggle button is disabled), with a corresponding date-window check on the server.
- The snowfall particle count is conditionally reduced to 80 on touch/narrow-viewport devices, limiting GPU load without removing the effect.
- Month-based analytics with prev/next navigation cover all historical data rather than a fixed trailing window.
- The chat implementation uses incremental polling (`?after=ID`) so each poll only transfers new messages rather than reloading the full history.
- Polish pluralisation (`1 osoba / 2 osoby / 5 osób`) is implemented correctly.

---

## Weak points

### Security gaps
- **No rate limiting** on any endpoint. The login and register routes are open to brute-force and credential-stuffing attacks. A library such as `express-rate-limit` could be added in under 10 lines.
- **Avatar path traversal risk.** Uploaded filenames are constructed by the server (`userId_timestamp.ext`), but the MIME type filter relies solely on `file.mimetype`, which is provided by the client and can be spoofed. Content-based validation (e.g. `file-type` package checking magic bytes) would be more robust.
- **JWT secret missing from `.env` example.** There is no `.env.example` file, so a new developer has no indication that `JWT_SECRET` must be set. An empty or weak secret would make all tokens forgeable.
- **No HTTPS enforcement.** In production, all tokens and passwords travel in plaintext unless a reverse proxy is configured externally. There is no in-app redirect or `Strict-Transport-Security` header.
- **Chat messages have no edit or delete functionality.** A user who sends a sensitive or mistaken message has no recourse.

### Data integrity and reliability
- The three idempotent migrations (`try { ALTER TABLE } catch {}`) silently swallow all errors, including genuine failures unrelated to the column already existing (e.g. disk full, locked database). The errors should at least be logged.
- The attendance offset mechanism for the resettable counter can produce a negative displayed count if an admin deletes historical attendance records after a reset, because the stored offset would exceed the new total.
- There is no transaction wrapping the avatar upload flow: the file is written to disk and the database is updated as two separate operations. A server crash between them leaves an orphaned file on disk or a stale database reference.
- No database backup mechanism is enforced at the application level. The `admin.md` documents a manual `cp` command but there is no automated backup on startup or shutdown.

### Performance
- **Chat polling at 3-second intervals** is unbounded. With 50 simultaneous users, the server would receive ~1 000 `GET /api/chat` requests per minute doing nothing but reading zero new rows. Server-Sent Events (SSE) would eliminate this entirely, or the interval could back off exponentially when no new messages arrive.
- The `GET /api/analytics` query for `topUsers` performs a `LEFT JOIN` with an aggregate over the entire attendances table every time the page is loaded. With a large dataset and no covering index on `(user_id, date)`, this will become slow.
- `ResponsiveContainer` from Recharts calculates chart dimensions on every render. Wrapping the analytics charts in `React.memo` would prevent unnecessary recalculation when only the month changes.
- The `AnnouncementBoard` component fetches its data independently on mount but has no refresh mechanism. An announcement posted after the board is loaded will not appear until the user navigates away and back.

### UX gaps
- **No notification system.** There is no indication that a new chat message or announcement has arrived while the user is on the schedule page. A simple unread-count badge on the sidebar icon would address this.
- **No confirmation before attendance toggle on mobile.** A single tap immediately commits a change; misclicks on small slot cards are likely.
- **The chat page does not indicate when another user is typing**, which is a standard expectation in modern messaging UIs.
- **No empty state on the schedule page** when a user first registers and the day has no attendees — the DayColumn shows empty slot cards with no explanatory text.
- **Profile page navigation requires two taps on mobile**: NavBar avatar → Profile → "Zarządzaj użytkownikami". Admins perform this path frequently.
- **Announcements have no read/unread state.** Every visit shows all announcements identically; there is no way to know if something new was posted.
- **Chat messages cannot be paginated.** The initial load fetches only the last 50 messages; earlier messages are inaccessible from the UI.

---

## Improvement suggestions

### Functional
1. **Server-Sent Events for chat** — replace the 3-second polling loop with a persistent `text/event-stream` connection. The server pushes each new message immediately, reducing latency to near-zero and eliminating idle polling load.
2. **Unread badge on sidebar icons** — track the last-seen message ID and announcement ID in localStorage. Compare against the latest IDs fetched in the background and show a numeric badge on the Chat and Schedule (announcements) sidebar icons.
3. **Chat message deletion** — allow users to delete their own messages; allow admins to delete any message. This mirrors the existing announcement delete pattern and requires a single `DELETE /api/chat/:id` endpoint with ownership check.
4. **Paginated chat history** — add a "load earlier messages" button at the top of the chat feed that fetches messages with `id < firstVisibleId`.
5. **Attendance window configuration** — the 14-day window is hardcoded in `getAllowedWindow()`. Exposing it as an environment variable or admin setting would make the application more adaptable.
6. **Email field and password recovery** — currently forgotten passwords require administrator intervention. Adding an optional email field and a time-limited reset token sent by email would make self-service recovery possible.
7. **Export attendance data** — an admin-accessible `GET /api/admin/export.csv` endpoint returning attendance history as a CSV file would be useful for record-keeping.

### Code quality
1. **Centralise error responses** — the pattern `err.response?.data?.error || 'Fallback string'` is repeated across every form component. A shared `extractError(err)` utility function would eliminate the duplication.
2. **Add `Content-Type` header validation** to the Express JSON body parser to reject non-JSON payloads before they reach route handlers.
3. **Add a database index** on `(user_id, date)` for the attendances table. All per-user analytics and stats queries filter on both columns.
4. **Environment variable validation on startup** — check that `JWT_SECRET` is defined and at least 32 characters before the server begins accepting connections, rather than failing at the first authenticated request.
5. **Add an `.env.example` file** documenting `JWT_SECRET` and `PORT` so the project is immediately runnable by a new contributor.

---

## UI and aesthetic suggestions

### Layout
- **Right panel minimum width.** The `AnnouncementBoard` in the right panel of the schedule page has no minimum width set, so on screens between 900 px and 1200 px it compresses to an unreadably narrow column. A `min-width: 240px` would maintain legibility.
- **Sidebar active indicator.** The current active state changes icon colour only. A left-border accent line (2–3 px, `var(--accent)`) on the active item would make navigation state more legible at a glance, as is conventional in sidebar navigation patterns.
- **NavBar height is disproportionate** relative to the sidebar. The avatar button is 66 px tall, making the NavBar visually heavier than the content it organises. Reducing the avatar to 40–44 px would bring it into proportion with the 64 px sidebar width.
- **The schedule page has no visual hierarchy between the left panel and the announcement board.** Both surfaces use identical `var(--surface)` background. Giving the announcement board a `var(--surface2)` background would create depth without adding colour.

### Typography and spacing
- **Inconsistent section title treatment.** The `sectionTitle` style is defined independently in `ProfilePage.module.css`, `AdminPage.module.css`, `AnnouncementBoard.module.css`, and `AnalyticsPage.module.css` with near-identical values. Extracting it to a shared CSS custom property or utility class would enforce visual consistency and simplify future changes.
- **The chat timestamp is very small** (0.65 rem). Increasing to 0.72–0.75 rem and switching colour to `var(--text-muted)` at 0.8 opacity (rather than the current full muted tone) would improve readability without competing with message content.
- **MonthCalendar day cells have no minimum touch target size.** On mobile the cells are approximately 28–32 px square; the WCAG 2.5.5 advisory recommends 44 px. Increasing the calendar grid cell size on small screens would reduce mis-taps.

### Colour and visual refinement
- **Graph gradient colours for the 20:00 slot** were changed from `#4ade80` (vivid green) to `#8378e6` (muted violet) at some point, but the `SLOT_COLORS` constant in `AttendanceChart.jsx` and `AnalyticsPage.jsx` are now out of sync — `AnalyticsPage` still uses the original green. Unifying them would make the slot colours consistent across both views.
- **The snowfall particles are uniformly `#e2e8f0`**. Introducing two or three slightly different shades (e.g. `#c8e8f5`, `#ddeef7`, `#ffffff`) distributed randomly among particles would give the effect more natural visual depth.
- **Chat bubble borders are visible on both sent and received messages**, which flattens the distinction between sides. Removing the border from sent (`.mine .text`) messages and relying on the background colour alone, as is conventional in messaging UIs, would improve clarity.
- **The profile page avatar hover overlay text reads "zmień"** in a small sans-serif font. Replacing the text with a camera icon SVG (consistent with the icon language used in the sidebar) would feel more polished.
- **No loading skeleton states.** Every data-dependent surface shows either nothing or a plain text "Ładowanie…" string during fetch. Skeleton placeholders matching the shape of the content (a few grey rectangles for chart cards, grey bubbles for the attendee row) would prevent layout shift and communicate progress more clearly.
