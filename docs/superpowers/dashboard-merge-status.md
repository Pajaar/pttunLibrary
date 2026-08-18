# dashboard_pttun → pttunLibrary Merge — Status / Handoff

Read this first in a fresh session before touching the merge work. It points at
the durable docs (spec, plans) rather than duplicating them, and captures
session-only knowledge that isn't written down anywhere else yet.

## Where things stand (as of 2026-08-18)

Four sequential plans, decided during brainstorming (see spec below). **Plans 1
and 2 are done and pushed to `origin/main`.** Plans 3 and 4 haven't been
started — no dashboard_pttun frontend code has been copied into pttunLibrary
yet.

| Plan | Status | Doc |
|---|---|---|
| 1. Auth foundation | ✅ Done, pushed | `docs/superpowers/plans/2026-08-18-auth-foundation.md` |
| 2. Admin backend routes | ✅ Done, pushed | `docs/superpowers/plans/2026-08-18-admin-backend-routes.md` |
| 3. Frontend wiring | ⬜ Not started | Not written yet |
| 4. Cover scanner migration | ⬜ Not started | Not written yet |

**Source of truth for the overall design:** `docs/superpowers/specs/2026-08-18-dashboard-merge-design.md` — read this before writing Plan 3. It has a **correction note in Decision 7** (added mid-session): the real `detail_buku` column for total copies is `total_buku`, not `jumlah_eksemplar` — use `total_buku` in all new code.

## What's actually built and live in `main` right now

- `pengguna` table (real schema, not the old empty stub), session-based login (`POST /api/auth/login`, `/logout`, `GET /api/auth/me`), `requireAuth` middleware, `backend/scripts/seedAdmin.js` (manual account creation, no self-registration endpoint exists or ever will).
- `/api/admin/buku`, `/api/admin/category`, `/api/admin/rak`, `/api/admin/upload` (Cloudinary cover), `/api/admin/peminjaman` — all gated behind one `requireAuth` call in `backend/routes/adminRoutes.js`.
- Public `peminjamanRoutes.js` now exposes only `POST /` — `GET /` (used to leak every borrower's name+phone to anyone) and `PATCH /:id/status` moved to admin-only.
- Two live bugs fixed outside the plans, discovered mid-session: `PeminjamanModel.js` had a wrong column name (`jumlah_eksemplar` → `total_buku`, was silently breaking "mark as returned") and a missing stock cap on `reconcileOverdueLoans` — see commit `4ac907e`.
- Final review of Plan 2 caught a **Critical** bug before merge: `updatePeminjaman` was double-crediting stock for loans that were edited while overdue but never actually returned — fixed in commit `582b400` (also fixed 4 Important issues: multer error leak, `updateBuku` crash on partial payload, `deleteBuku` missing a dependency guard, and admin routes sharing the public form's rate-limit budget).
- `backend/.env.example` now documents `SESSION_SECRET` and `FRONTEND_URL` (it existed in git but was missing from disk before this session — recreated).
- An admin account already exists in the real database (created via `seedAdmin.js` this session) — credentials are known only to the user, not stored anywhere in chat/files.

## Environment gotchas discovered this session (not fully captured elsewhere)

These will very likely recur in Plan 3/4 sessions:

1. **A harness-level "Auto Mode classifier" blocks Bash commands that look like DB-writing scripts** (`node scripts/migrate_*.js`, `node scripts/seedAdmin.js`, even a plain `taskkill` once) — for both subagents AND the controller session directly, not just a permission prompt. There's no way found this session to get around it other than **having the actual human run the command themselves in their own terminal**. Don't spend time retrying alternate tool invocations — ask the user to run it directly.
2. **A server started in the user's own native terminal (`npm run dev` in PowerShell) is NOT reachable from Claude's Bash tool** — different network namespace. `curl localhost:5000` from Bash gets connection-refused even though the user's own browser/PowerShell can reach it fine. Fix: always start the dev server via `mcp__Claude_Browser__preview_start` with `{"name": "backend"}` (uses the existing `.claude/launch.json` entry) instead of asking the user to run `npm run dev` themselves — that server IS reachable from Bash.
3. **`preview_start`'s server can go stale/die silently between long gaps in the conversation** (confirmed this session after a token-limit interruption) — `preview_list` may show nothing, or a previously-working `serverId` stops responding. Always re-check `curl localhost:5000/` before trusting a previously-started server is still up; restart via `preview_stop` + `preview_start` if not.
4. **Sessions are in-memory (`express-session` default `MemoryStore`)** — any server restart invalidates all login sessions. If you need an authenticated session for testing, always get a *fresh* login after restarting the server, not a cookie from before the restart.
5. **For authenticated endpoint testing**, the working pattern established this session: give the user a PowerShell script using `Invoke-WebRequest -SessionVariable session`, then `$session.Cookies.GetCookies("http://localhost:5000") | Select-Object Name, Value` to extract just the `connect.sid` cookie value (not the password) for them to paste back — then use that cookie directly in your own `curl -H "Cookie: connect.sid=..."` calls. Much faster than relaying every single authenticated request through the user.
6. **This project's `.claude/settings.json` has a deny rule blocking `Edit`/`Write`/`Bash` on any `**/.env.*` file** (intentional guardrail, not a bug) — this also blocks harmless files like `backend/.env.example`. When that's needed, print the content and ask the user to save the file themselves.
7. **`rm -rf` is denied by the harness's global safety settings** — can't clean up the git-ignored `.superpowers/sdd/*` scratch workspace directories after a plan finishes. Harmless to leave them (git-ignored), just can't delete via Bash — ask the user if cleanup is wanted.
8. There is **no automated test framework** in this backend — all verification in this project is manual, real-database HTTP testing against a running dev server. This is an established, deliberate convention (see every plan's Global Constraints), not a gap to fill.

## Standing constraints (from the user, still in force)

- Never touch DB/network/port config without asking first, even incidentally.
- Never run anything that writes to the real database, or start a server connected to it, without the user's explicit go-ahead first — there was a prior-session incident where a smoke test wrote test data to the live DB unprompted.
- No `Co-Authored-By` trailer on any commit in this repo — hard requirement (watch for this specifically when a subagent writes a fix-wave commit; one slipped through once this session and had to be amended out).
- User prefers to `git push` manually themselves rather than have it done for them.
- Working directly on `main`, no git worktree — the user explicitly declined a worktree for this work.

## Book count / CLAUDE.md staleness (pre-existing, still unfixed)

`CLAUDE.md`'s schema section still documents stale `peminjaman` field names (`nama`, `nomor_telpon`, `durasi_peminjaman` instead of the real `nama_peminjam`, `no_telpon`, `durasi_hari`) and the stale book count (191, actual is 878). Also now missing the `pengguna` table and the `total_buku` column correction. This was deferred across both Plan 1 and Plan 2 (each plan noted it, neither fixed it) — worth doing either standalone or as part of Plan 4 wrap-up.

## Suggested next step

Brainstorm + write Plan 3 (frontend wiring): move dashboard_pttun's actual admin views/components into `frontend/src/`, wire the router with `AdminLayout` + a route guard checking `GET /api/auth/me`, build the login form. The design spec's Decision 4 already lays out the shape. Follow the same brainstorming → writing-plans → subagent-driven-development flow used for Plans 1-2.
