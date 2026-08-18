# dashboard_pttun → pttunLibrary Merge — Status / Handoff

Read this first in a fresh session before touching the merge work. It points at
the durable docs (spec, plans) rather than duplicating them, and captures
session-only knowledge that isn't written down anywhere else yet.

## Where things stand (as of 2026-08-19)

Four sequential plans, decided during brainstorming (see spec below). **Plans
1, 2, and 3 are done.** Plans 1-2 are pushed to `origin/main`. **Plan 3 is
committed to local `main` but NOT pushed yet** — the user pushes manually
themselves (standing preference, see below). Plan 4 hasn't been started at
all.

| Plan | Status | Doc |
|---|---|---|
| 1. Auth foundation | ✅ Done, pushed | `docs/superpowers/plans/2026-08-18-auth-foundation.md` |
| 2. Admin backend routes | ✅ Done, pushed | `docs/superpowers/plans/2026-08-18-admin-backend-routes.md` |
| 3. Frontend wiring | ✅ Done, committed locally, not pushed | `docs/superpowers/plans/2026-08-18-frontend-admin-wiring.md` |
| 4. Cover scanner migration | ⬜ Not started | Not written yet |

**Immediate next step:** Plan 4 (cover scanner migration) hasn't been
brainstormed yet — start there in a fresh session. The manual authenticated
verification pass that was deferred during Plan 3 itself has since been
done (see "Plan 3 — verification status" below) — everything checked out
except the two items that genuinely couldn't be tested (no active loan to
click "Tandai Dikembalikan" on, no Cloudinary credentials configured).

**Plan 3 outcome:** all 9 tasks built via `superpowers:subagent-driven-development`
(fresh implementer subagent per task, independent task review after each,
one final whole-branch review) — same flow as Plans 1-2, and the user's
stated preference. Final review found zero Critical/Important issues; 5
Minor findings were parked (see below), none blocking.

**Source of truth for the overall design:** `docs/superpowers/specs/2026-08-18-dashboard-merge-design.md` — read this before writing Plan 3. It has a **correction note in Decision 7** (added mid-session): the real `detail_buku` column for total copies is `total_buku`, not `jumlah_eksemplar` — use `total_buku` in all new code.

## What's actually built and live in `main` right now

- `pengguna` table (real schema, not the old empty stub), session-based login (`POST /api/auth/login`, `/logout`, `GET /api/auth/me`), `requireAuth` middleware, `backend/scripts/seedAdmin.js` (manual account creation, no self-registration endpoint exists or ever will).
- `/api/admin/buku`, `/api/admin/category`, `/api/admin/rak`, `/api/admin/upload` (Cloudinary cover), `/api/admin/peminjaman` — all gated behind one `requireAuth` call in `backend/routes/adminRoutes.js`.
- Public `peminjamanRoutes.js` now exposes only `POST /` — `GET /` (used to leak every borrower's name+phone to anyone) and `PATCH /:id/status` moved to admin-only.
- Two live bugs fixed outside the plans, discovered mid-session: `PeminjamanModel.js` had a wrong column name (`jumlah_eksemplar` → `total_buku`, was silently breaking "mark as returned") and a missing stock cap on `reconcileOverdueLoans` — see commit `4ac907e`.
- Final review of Plan 2 caught a **Critical** bug before merge: `updatePeminjaman` was double-crediting stock for loans that were edited while overdue but never actually returned — fixed in commit `582b400` (also fixed 4 Important issues: multer error leak, `updateBuku` crash on partial payload, `deleteBuku` missing a dependency guard, and admin routes sharing the public form's rate-limit budget).
- `backend/.env.example` now documents `SESSION_SECRET` and `FRONTEND_URL` (it existed in git but was missing from disk before this session — recreated).
- An admin account already exists in the real database (created via `seedAdmin.js` this session) — credentials are known only to the user, not stored anywhere in chat/files.
- **Plan 3 (frontend):** real session-based login (`stores/auth.js` + `router.beforeEach` guard on every `/admin/*` path), a logout button (new — dashboard_pttun's original had none), and full CRUD UI for buku/category/rak/peminjaman at `/admin/dashboard`, `/admin/categories`, `/admin/books`, `/admin/shelves`, `/admin/loans/monitoring`. A new admin service layer (`adminApi.js`, `bookAdminService.js`, `categoryService.js`, `rakService.js`, `loanAdminService.js`, `uploadAdminService.js`) targets `/api/admin/*`, kept separate from the existing public services. A "Tandai Dikembalikan" button (new, not in dashboard_pttun's original) calls the existing `PATCH /:id/status` endpoint. `CoverScanner` was deliberately not ported — `BooksView.vue` has a plain file-upload cover field instead, with a code comment marking Plan 4's hook point.

## Plan 3 — verification status

Plan 3's final whole-branch review passed with zero Critical/Important
findings. Live authenticated verification was explicitly declined during
the implementation session itself (Task 9's commit `b34ec43` says so
honestly) but **was completed manually in a follow-up session** (2026-08-19,
via the user's own browser, guided step-by-step — see the environment
gotcha below on why this couldn't be done through the Browser pane tool
directly). Confirmed working end-to-end:

- Login (session cookie round-trips, post-login redirect works)
- Dashboard: real stat numbers, both charts render
- Sidebar/topbar: nav links, username, logout button
- Full CRUD cycle on Categories (create → edit → delete)
- Books and Shelves list pages load with real data
- Loan Monitoring: list loads; the new "Dikembalikan" badge case and the
  mark-returned button's conditional hiding (`v-if="loan.status !== 'dikembalikan'"`)
  both confirmed correct on a real already-returned loan
- Logout: session genuinely destroyed server-side (revisiting `/admin/dashboard`
  after logout re-redirects to `/login`, not just a client-side flag)

**Still not verified** (both for reasons outside the code, not suspected
defects — revisit once the preconditions exist):
- Clicking "Tandai Dikembalikan" itself — no active (non-`dikembalikan`)
  loan existed at verification time to click it on. The conditional
  rendering around it (button hidden, green badge shown) IS confirmed;
  only the PATCH-and-refresh action itself is unexercised.
- Cover upload — `backend/.env` still has no `CLOUDINARY_*` credentials.

Five Minor findings were parked during review, none blocking, all either
inherited verbatim from the ported dashboard_pttun source or pre-existing
environment quirks unrelated to this plan:
1. `LoginView.vue`'s post-login redirect could theoretically receive an
   array if the `?redirect=` query key were repeated (harmless in practice).
2. `AppTopbar.vue` hardcodes `data-bs-target="#sidebar"` instead of taking
   the id as a prop — works because `AdminLayout.vue` always passes
   `id="sidebar"`, just an implicit contract between the two components.
3. `CategoriesView.vue`/`ShelvesView.vue` each have a `colspan` mismatch on
   their empty-state table row and an unused `.line-clamp-2` CSS class.
4. `LoanMonitoringView.vue`'s status badge/label helpers fall back to
   `dipinjam` styling for any unrecognized status string, not just that
   literal value (low risk — backend validates against a fixed 3-value enum).
5. **Pre-existing, not caused by this plan:** `.claude/launch.json`'s
   `"pttunlibrary"` config can start a backend subprocess bound to the wrong
   port (appears to inherit a `PORT` env meant for Vite) if used instead of
   the separate `"backend"` config — harmless as long as `preview_start` is
   always called with the two configs separately, as this session did.
   `backend/.env` is also missing `CLOUDINARY_*` credentials, which will
   block cover-upload testing whenever someone gets to it.

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
9. **Repo root has no `frontend/package.json`** — the Vite project root IS the repo root (`vite.config.js` lives at repo root, aliases `@` to `./frontend/src`). Any `npm install` for a frontend dependency runs at the repo root, not inside `frontend/`. Discovered/confirmed while writing Plan 3.
10. **A final-review subagent dispatch can fail on transient infra errors** (hit both a session-limit error and, on retry, two consecutive `529 Overloaded` errors back-to-back this session, during Plan 3's final whole-branch review) — after ~3 consecutive infra-side failures on the same dispatch, stop retrying the subagent and do the review directly in the controller session instead (read the pre-generated diff file, run a few targeted greps for cross-file consistency). Don't burn more retries hoping the next one lands.
11. **The Browser pane tool's tab and the user's own view of "the browser" can silently be two different browser processes with separate cookie jars**, discovered during Plan 3's manual login verification. Logging in via `mcp__Claude_Browser__computer`/`navigate` on a tab I opened does NOT authenticate a session the user can see, and vice versa — even when both are pointed at the identical `localhost:5173` URL. Confirmed this session: the user's independently-started `npm run dev` in their own terminal landed on port 5174 (auto-bumped since 5173 was already taken by my `preview_start`-managed instance) — reachable from my tools, but with zero shared cookie state, since it was a genuinely different server process too. **I also cannot type a password into a login form on the user's behalf under any circumstances** (hard rule, not situational) — so authenticated browser verification always requires either (a) the user typing credentials into a tab I opened and am actively driving, confirmed by me re-checking `window.location.href`/`GET /api/auth/me` status after — don't just trust "done, it worked" — or (b) treating the user as the tester: they act in their own browser/session and report results back per-step, which is what actually happened here after (a) didn't line up.

## Standing constraints (from the user, still in force)

- Never touch DB/network/port config without asking first, even incidentally.
- Never run anything that writes to the real database, or start a server connected to it, without the user's explicit go-ahead first — there was a prior-session incident where a smoke test wrote test data to the live DB unprompted.
- No `Co-Authored-By` trailer on any commit in this repo — hard requirement (watch for this specifically when a subagent writes a fix-wave commit; one slipped through once this session and had to be amended out).
- User prefers to `git push` manually themselves rather than have it done for them.
- Working directly on `main`, no git worktree — the user explicitly declined a worktree for this work.

## Book count / CLAUDE.md staleness (pre-existing, still unfixed)

`CLAUDE.md`'s schema section still documents stale `peminjaman` field names (`nama`, `nomor_telpon`, `durasi_peminjaman` instead of the real `nama_peminjam`, `no_telpon`, `durasi_hari`) and the stale book count (191, actual is 878). Also now missing the `pengguna` table and the `total_buku` column correction. This was deferred across both Plan 1 and Plan 2 (each plan noted it, neither fixed it) — worth doing either standalone or as part of Plan 4 wrap-up.

## Suggested next step

1. **User:** push Plan 3's commits (`5a30935..b34ec43`) to `origin/main` whenever ready — not done automatically, per standing preference. Manual verification is done; nothing is blocking this.
2. **Next session:** brainstorm Plan 4 (cover scanner migration — port `CoverScanner.vue` and its `opencv`/`jscanify`/`browser-image-compression` dependencies into `BooksView.vue`'s cover field, at the hook point already marked with a comment). Follow the same brainstorming → writing-plans → subagent-driven-development flow used for Plans 1-3.
3. Also still pending, deferred across all three plans so far: `CLAUDE.md`'s stale schema documentation (see "Book count / CLAUDE.md staleness" below) — worth doing standalone or as part of Plan 4 wrap-up.
4. Whenever real Cloudinary credentials get added to `backend/.env`, and/or a real active loan exists, revisit the two still-unverified checks noted in "Plan 3 — verification status" above.
