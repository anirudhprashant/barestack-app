# BareStack CRM — Security & Architecture Audit

**Repository:** `github.com/anirudhprashant/barestack-app`
**Commit reviewed:** `87c630c` (`main`, up to date)
**Date:** 2026-06-19
**Method:** read-only review of source, PocketBase migrations, build/serve/CI config, and dependency manifest. All claims cite `file:line`. No files were executed or modified during the review.

> **How to re-run the structural review:** the codebase was also turned into a
> knowledge graph (`graphify-out/graph.html`) — 358 nodes / 729 edges / 28
> communities — which surfaced the architecture and the `useData()` coupling
> discussed below. Open `graphify-out/graph.html` in a browser to navigate.

---

## Executive Summary

BareStack CRM is a React/TS + PocketBase single-tenant-per-user business OS. The
**security core is sound**: per-user isolation and email-verification gating are
enforced **server-side** by version-controlled PocketBase migrations, there is no
filter-injection path, the CSP locks down scripts, and the static server exposes
only the built `dist/`. These are real strengths for an open-source project.

However the review found **real hygiene gaps**, the most significant being that
input-validation schemas exist and are tested but are **not wired into the write
path** — so the only thing standing between oversized/malformed client payloads
and the database is the PocketBase field validators, which exist but are not as
tight as the intended Zod schemas. Other findings: activity/import metadata is
client-forged, `user` ownership is re-parentable on update, no HSTS, and the
self-host installer downloads a binary without checksum verification over
plaintext HTTP.

**Verdict:** not "perfect and secure," but the foundation is correct and the gaps
are fixable without architectural change. Each finding below is marked
`FIXED` (addressed in this hardening pass on branch `security/audit-hardening`)
or `DOC-ONLY` (documented; fix requires a deploy/operational decision or a
riskier migration and is left to the maintainer).

### Verdict table

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | `recent_activity` & `import_batches` fully client-writable → forged/backdated activity logs | PARTIAL (pb_hooks integrity guards added; full transactional tie still doc-only) |
| 2 | Medium | Zod validation schemas are dead code on the write path | FIXED |
| 3 | Medium | No `Strict-Transport-Security` (HSTS) | FIXED (serve.cjs) |
| 4 | Medium | `user` field is client-writable text; update rules don't freeze it → ownership re-parenting | DOC-ONLY (needs relation migration) |
| 5 | Medium | `install.sh`: binary downloaded with no checksum, PB on plaintext `0.0.0.0` HTTP, no `--origins`/`--publicUrl`, `curl\|bash` promoted | PARTIAL (checksum + guidance added) |
| 6 | Medium | Silent-skip in `require_verified` migration → partial fallback to non-verified rules | FIXED (idempotent re-pin migration) |
| 7 | Low | Bulk-create carries a server `id` on "create new" duplicate rows | FIXED |
| 8 | Low | CSP `connect-src` default includes a bare `https:` wildcard | DOC-ONLY (needs prod backend list) |
| 9 | Low | CSP `style-src 'unsafe-inline'` + third-party `fonts.googleapis.com` | DOC-ONLY (UX concession for jsPDF/React) |
| 10 | Low | Runtime dependencies use `^` caret ranges (not exact-pinned); client PocketBase SDK `^0.21.5` vs server `0.36.2` | DOC-ONLY |
| 11 | Low | CI workflow has no `permissions:` block | DOC-ONLY |
| 12 | Low | Raw backend `.message` strings rendered to users in banners; ErrorBoundary logs stack to console | DOC-ONLY |
| 13 | Low | No password-strength validation on sign-up | DOC-ONLY |
| 14 | Low | Import size cap is on the compressed file, not the decompressed payload | DOC-ONLY |
| 15 | Low | `xlsx` sourced from third-party `@e965/xlsx` fork scope | DOC-ONLY (community-trusted) |

---

## Architecture & Data Flow

```
App.tsx
  └─ useAuth() gate (auth.tsx) ──> if !verified: <VerifyGate/>  (client gate, cosmetic)
      └─ <DataProvider session>      (dataStore.tsx)
            └─ api.fetch<Collection>(userId)   (src/lib/api.ts)
                  └─ filter: `user="${sanitizeId(userId)}"`   (PocketBase JS SDK)
                        └─ PocketBase collection access rules  ← REAL security boundary
                              @request.auth.id != "" &&
                              @request.auth.verified = true &&
                              user = @request.auth.id
```

The graph (`graphify-out/graph.html`) confirmed `useData()` (`dataStore.tsx`) is
the central hook with 39 edges, but it is a **thin, wide** seam — not a god
object — and the real structural chokepoints are the files `dataStore.tsx`
(betweenness 0.228) and `api.ts` (0.214), which is the correct place to add a
single centralized defense layer.

**Stack:** React 18 + TypeScript + Vite 7 + Tailwind 4. PocketBase 0.36.2
(server binary, pinned in `install.sh:16`) via the `pocketbase` JS SDK
(`^0.21.5`, client). 10 data collections: contacts, deals, projects, tasks,
invoices, time_entries, expenses, notes, recent_activity, import_batches.

**Deploy paths:** self-host (`install.sh` → PB `0.0.0.0:8092` + `npm run
preview`) and cloud (`start-cloud.sh` → `npm run build` → PM2 `serve.cjs`
on `:8084`). Per the repo README, production sits behind a reverse proxy that
sets security headers; `serve.cjs` also emits them.

---

## Verified Strengths

These were checked against source and held up — credit where due.

**Server-enforced isolation.** `pb_migrations/1780500000_require_verified_for_data.js:14` sets all five rule slots (list/view/create/update/delete) on all 10 collections to:
```
@request.auth.id != "" && @request.auth.verified = true && user = @request.auth.id
```
`pb_migrations/1780400000_pin_users_access_rules.js:20-23` locks the `users` collection to `id = @request.auth.id`. Isolation therefore does not depend on client honesty — a malicious client cannot read or mutate another tenant's rows as long as the migrations are applied to the live DB.

**No filter injection.** Every `fetch*` call (`src/lib/api.ts:54,76,98,120,142,164,186,208,223,245`) interpolates a single value into a filter string: `user="${safeId}"`, where `safeId = sanitizeId(userId)` and `sanitizeId` (`src/lib/validation.ts:4-12`) uses the allow-list regex `/^[a-zA-Z0-9_-]+$/`. The classic payload `a" || user="b` is rejected. No untrusted free-text reaches a `filter=` param.

**`users` collection pinned** to stop the email-enumeration default; the migration comment (`1780400000_pin_users_access_rules.js:3-7`) even names that exact risk.

**CSP `script-src 'self'`** with no `'unsafe-inline'`/`'unsafe-eval'`; `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` (`serve.cjs:28-40`). Strong script policy — the most important directive is tight.

**Static server exposes only `dist/`.** `serve.cjs:6,61` serves `path.join(__dirname, 'dist')` only; `pb_data`, `.env`, `node_modules`, `pb_migrations`, `graphify-out` are never served. Directory-traversal protection is correct (normalize + `startsWith(DIST_DIR + path.sep)` + URL-decode in try/catch, `serve.cjs:53-68`). No source maps generated (`vite.config.ts` build has no `sourcemap: true`). No wildcard CORS on the static server.

**CI is safe.** `.github/workflows/ci.yml` uses `pull_request` (not `pull_request_target`), `npm ci`, no secrets in the build bundle (only the public `VITE_POCKETBASE_URL`), `npm audit --omit=dev --audit-level=high`.

**No demo-mode bypass** and **no admin/superuser auth path** in the client (grep-clean). Email verification is confirmed via a server-validated single-use PocketBase token (`src/lib/auth.ts:55`), not client state.

---

## Findings

### F1 — `recent_activity` & `import_batches` fully client-writable (High, PARTIAL)

`recent_activity` has create/update/delete rules identical to user data
(`user = @request.auth.id`, `1780500000` effective rule). Its fields are:
`type` is a client-set `select` (`1779676001991:35-49`, values
CONTACT_ADDED/PROJECT_CREATED/INVOICE_CREATED/INVOICE_SENT/TASK_COMPLETED/DEAL_ADDED/EXPENSE_ADDED),
`timestamp` a client-set `date` (`1779676001991:26-28`), `description` text max 2000 (`1779676001991:54-62`).

**Impact:** any verified user can POST, PATCH, or DELETE activity-log entries
directly via the API — forging, backdating, or redacting a feed history (e.g.
fabricate an `INVOICE_SENT` that never happened). `import_batches.file_name`/
`contact_count` can likewise be forged to make a CSV import appear to have
occurred. There is no `pb_hooks/` directory, so no server-only write path.

**Fix (this pass — PARTIAL):** added `pb_hooks/integrity.pb.js`, a server-side
integrity guard on `onRecordCreateRequest`/`onRecordUpdateRequest` for both
collections. It enforces, server-side and un-bypassable from a console:
- `recent_activity.type` must be a known enum value
- `recent_activity.timestamp` must be a valid date and not in the future; if
  omitted/invalid, the server stamps `now()` — so a client cannot backdate or
  forward-date an entry
- `recent_activity.description` capped to 2000 chars
- `import_batches.contact_count` must be a non-negative integer
- `import_batches.file_name` capped to 500 chars

This was **verified end-to-end** against the pinned PocketBase 0.36.2 binary in
an isolated sandbox: a verified user's legitimate writes succeed unchanged,
while bad-enum, future-dated, and out-of-bounds writes are rejected (HTTP 400)
or coerced. During that testing two real JSVM bugs were caught and fixed before
shipping: (a) the older `onRecordBefore*Request` hook names silently never fire
on 0.22+ (confirmed against the binary's embedded type defs — use
`onRecordCreateRequest`), and (b) hook callbacks run in an isolated scope that
cannot see top-level helper declarations, so all guard logic is inlined; and a
`date` field read via `record.get()` returns a truthy DateTime object, so the
hook uses `record.getString()`.

**Still DOC-ONLY (the complete fix):** the hook constrains *what* an entry can
say but does not transactionally tie an activity row to a real mutation (e.g.
require an `INVOICE_DELETED` entry to correspond to an invoice actually deleted
in the same request). That requires re-architecting the app's "do action, then
log it as a separate request" pattern across ~15 call sites and is left as a
deliberate future change. The remaining forge surface is now "a plausible,
well-formed, present-dated entry" rather than "anything at all."

### F2 — Zod validation schemas are dead code on the write path (Medium, FIXED)

Verified: the only import of `validation` outside the test file is
`src/lib/api.ts:3 -> import { sanitizeId } from './validation'`. Every exported
schema (`ContactSchema`, `DealSchema`, … `ImportBatchSchema`), `validate`,
`sanitizeString`, `sanitizeArray` is imported **only** by
`src/lib/validation.test.ts`. Schema-level bounds (`.max()`, `z.enum`, `min(0)`)
are therefore never enforced on any write.

**Why not just wire `validate(Schema, item)` in:** the schemas have **diverged**
from the live shapes. Examples: `ProjectSchema` declares
`description`/`start_date`/`end_date` but `types.ts` `Project` has
`estimated_hours` and none of those fields; `TaskSchema` makes `project_id`
optional and omits `assigned_to`/`estimated_hours`; `TimeEntrySchema` has
`duration`/`date` but the live type has `hours`/`task_id`/`is_billable`;
`NoteSchema` has a `title` field absent from the live `Note` (it has `content`/
`contact_id`); `ImportBatchSchema` (`name`/`total_records`/`imported_records`/
`status`) does not match how `ImportModal.tsx:252` actually builds a batch
(`file_name`/`contact_count`). Wiring them in naively would reject valid
traffic and **break the app**.

**Fix (this pass):** add a `sanitizeCreatePayload(collection, data)` layer in
`validation.ts` that enforces only the security-relevant bounds that match the
**real server field constraints** (verified against the migration files — see the
table below), then route creates through it at the single centralized
chokepoint `api.ts create()` and `createContactsBulk()`. It is **fail-soft**:
oversized strings are truncated to the verified `max`, out-of-enum selects are
dropped, numbers are clamped — it never throws on valid app data, so business
logic is unchanged; PocketBase remains the final arbiter. Updates are not routed
(they accept arbitrary subsets; the diverged-schema risk is highest there).

Real server field caps (verified in migrations):

| Collection | Field caps |
|---|---|
| contacts | name 500, phone 100, company 500, tags 1000, import_batch_id 100 |
| deals | contact_id 100; stage enum {Lead,Qualified,Proposal,Won,Lost} |
| projects | name 500, client_id 100; status enum {Active,Completed,Archived} |
| tasks | title 1000, project_id 100, assigned_to 200; status enum {To Do,In Progress,Done} |
| invoices | invoice_number 100, client_id 100, payment_method 200; status enum {Draft,Sent,Paid,Overdue}; line_items json (array + per-item capped) |
| time_entries | project_id 100, task_id 100, description 5000 |
| expenses | description 2000, project_id 100, receipt_url 2000; category enum {Travel,Meals,Equipment,Software,Other} |
| notes | content 50000, contact_id 100 |
| recent_activity | description 2000; type enum {CONTACT_ADDED,PROJECT_CREATED,INVOICE_CREATED,INVOICE_SENT,TASK_COMPLETED,DEAL_ADDED,EXPENSE_ADDED} |
| import_batches | file_name 500 (contact_count number) |

Plus an `ALLOWED_CREATE_COLLECTIONS` allow-list so an unknown collection name
cannot slip through unsanitized. New tests in `validation.test.ts` assert:
per-collection cap enforcement, enum rejection, long-string truncation,
unknown-collection allow-list, and — the anti-regression guard — that the
**real app-shaped payloads** (what `dataStore.tsx`/`ImportModal.tsx` actually
send) pass through unmodified.

### F3 — No Strict-Transport-Security (Medium, FIXED)

Neither `serve.cjs:42-48` nor `vite.config.ts:45-50` emits
`Strict-Transport-Security`. Without HSTS a first-visit MITM can downgrade a
production HTTPS app.

**Fix:** add `'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'`
to the `securityHeaders` object in `serve.cjs`, with a comment noting it only
matters over TLS (it is a no-op over HTTP, so local dev is unaffected). If TLS
terminates at an upstream proxy, set it there too.

### F4 — `user` ownership is client-writable re-parentable (Medium, DOC-ONLY)

The ownership discriminator `user` is a client-writable `text` field
(`1779676001983_created_contacts.js:87-93`, max 100), not a relation, and the
`1780500000` update rule checks the record's **current** `user` value but does
not forbid changing it. A verified user can PATCH their own record and set
`user` to another user's id, **re-parenting (donating)** the row to a victim.
They cannot *steal* (the create rule's `user = @request.auth.id` blocks
acquiring a row with `user != self`), but ownership-laundering is possible and
irreversible for the original owner.

**Why DOC-ONLY:** the sound fix is making `user` a relation to `users` and/or
adding a PocketBase rule binding `@request.body.user` on create and freezing
`user` on update — a schema migration that risks existing data rows and is not
safe to land blind within a hardening pass. **Recommended:** plan a `user`-as-
relation migration with a data backfill as a separate, tested change.

### F5 — `install.sh` self-host posture (Medium, PARTIAL)

`install.sh:9` promotes `curl -sSL .../install.sh | bash`.
`install.sh:47` downloads the PocketBase binary from GitHub releases with
**no checksum verification**:
```sh
PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_ZIP}"
curl -fL "$PB_URL" -o pocketbase.zip
```
`install.sh:89` starts PocketBase on plaintext HTTP `--http="0.0.0.0:${PB_PORT}"`,
exposing the admin UI `/_/` with no TLS and no `--origins`/`--publicUrl`
allow-list.

**Fix (partial):** add a `sha256sum` verification step for `pocketbase.zip`
with a printed hash the user checks against the official GitHub release page
(honest about not embedding the full arch-matrix of hashes), and a comment
guiding production users to put PocketBase behind TLS + set `--origins`/`--publicUrl`
and bind to `127.0.0.1` behind a reverse proxy. Full checksum pinning per-arch
and TLS termination are operational choices left to the deployer.

### F6 — Silent-skip in the verified-gate migration (Medium, FIXED)

`1780500000_require_verified_for_data.js`'s `applyRule`
(`:17-29`) does `try { c = app.findCollectionByNameOrId(name); } catch (_) { continue; }`
— if a collection is missing/renamed at migrate time, that one collection
**silently keeps the non-verified** initial `created_*` rules
(`1779676001983…:97-101`), which lack `@request.auth.verified = true`.

**Fix:** a new idempotent migration `1780700000_repin_verified_rules.js` that
re-applies `VERIFIED_RULE` to all 10 data collections. It only sets rules
already intended and changes no behavior on a healthy DB, but it **heals any
partial-fallback state** left by a silent skip in the earlier migration. No
destructive down-migration (the rollback re-applies `OWNER_RULE`, same as the
existing 1780500 down-path, keeping owner isolation intact).

### F7 — Bulk-create carries a server id on "create new" duplicate rows (Low, FIXED)

`ImportModal.tsx:207` grafts `id: existing.id` onto duplicate rows
(`duplicates.push({ ...newContact, id: existing.id })`); when a duplicate is
resolved "create", that row (still carrying a server id) is pushed into
`toCreate` and reaches `createContactsBulk`. PocketBase almost certainly ignores
a client-supplied id on create, but defense-in-depth: the sanitizer (and/or
`createContactsBulk` strip set) removes `id` before create, removing any
alias/clobber surface.

### F8 — CSP `connect-src` `https:` wildcard (Low, DOC-ONLY)

`serve.cjs:26` default `connect-src` is `'self' https: http://127.0.0.1:* http://localhost:*` — the bare `https:` allows the app to connect to any https origin. The `vite preview` CSP (`vite.config.ts:50`) is tighter (enumerated backend). **Recommended:** enumerate the production backend in `CSP_CONNECT_SRC` for served deployments; left DOC-ONLY because it needs the real prod endpoint list.

### F9 — CSP `style-src 'unsafe-inline'` + Google Fonts (Low, DOC-ONLY)

`serve.cjs:31` `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — a concession for React/jsPDF inline styles and Google Fonts. A style-based exfil/defacement vector remains. Folded into self-hosted fonts + nonce/hashed styles would close it; out of scope for a hardening pass.

### F10 — Unpinned dependencies + PocketBase client/server version gap (Low, DOC-ONLY)

All runtime deps use `^` caret ranges (`package.json:20-33`); the PocketBase JS
client SDK is `^0.21.5` while the server binary is `0.36.2`
(`install.sh:16`) — a ~15 minor-version gap whose API compatibility is assumed
but not verified. CI uses `npm ci` (lockfile-respecting), mitigating drift, but
a future `npm install` can pull bumps. **Recommended:** exact-pin runtime deps
and confirm 0.21.x SDK ↔ 0.36.2 server compatibility.

### F11 — CI has no `permissions:` block (Low, DOC-ONLY)

`.github/workflows/ci.yml:9-10` has no explicit `permissions:`; the `GITHUB_TOKEN`
inherits repo defaults. **Recommended:** add `permissions: { contents: read }`.

### F12 — Raw backend error messages surfaced to users (Low, DOC-ONLY)

`dataStore.tsx:114`, `ImportModal.tsx:224,262`, `pages/LoginPage.tsx`, `pages/VerifyGate.tsx` render raw `.message` strings (which can include PocketBase field/validation names and network internals) in error banners. `ErrorBoundary.tsx:21-23` logs the full stack + component stack to the console unconditionally. **Recommended:** map known errors to user-facing strings; gate `console.error` behind `import.meta.env.DEV`.

### F13 — No password-strength validation (Low, DOC-ONLY)

`src/lib/auth.ts:28` mirrors `password` into `passwordConfirm` with no length/complexity check; there is no `UserSchema` in `validation.ts`. Strength reliance is on PocketBase collection config. **Recommended:** add a client-side password policy.

### F14 — Import size cap on the compressed file (Low, DOC-ONLY)

`ImportModal.tsx:155,160-163` caps `file.size` (compressed) at 10MB; a crafted `.xlsx` could decompress to far more in memory. **Recommended:** cap decompressed output too (e.g. a row count limit on `sheet_to_json`).

### F15 — `xlsx` from a third-party fork scope (Low, DOC-ONLY)

`package.json:31` `"xlsx": "npm:@e965/xlsx@^0.20.3"` — the deprecated/compromised official `xlsx` is replaced by the community-trusted `@e965/xlsx` fork. Reasonable mitigation; flagged for audit awareness.

---

## Deployment Hardening Notes (operational, not code)

1. **TLS terminates upstream.** Wherever HTTPS terminates (reverse proxy), set
   HSTS, lock CSP `connect-src` to the real backend, and front PocketBase with
   TLS + `--origins <allowed-origins>` + `--publicUrl <url>`.
2. **Self-host:** do not expose PocketBase `0.0.0.0:8092` over plaintext. Bind
   to `127.0.0.1` behind the proxy, or put `--https` certs on it.
3. **Verify migrated rules on the running DB** match `pb_migrations/` — rule
   drift (a hand-edit in the Admin UI) silently strips tenant isolation. The new
   idempotent re-pin migration (F6) reduces this risk but cannot detect it; a
   periodic diff against the migrations is good practice.
4. **Admin password** is random 24-char and shown once (`install.sh:80`) — store
   it immediately; it is recoverable only via `pocketbase superuser` reset on the
   box.

---

## How the security graph maps to the fix surface

The graphify graph put `api.ts` (betweenness 0.214) as the second-highest
structural chokepoint after `dataStore.tsx`. This is why F2's defense layer was
placed in `api.ts create()` rather than scattered across `dataStore.tsx`'s 13
handlers: one insertion point covers every create, cannot miss a handler, and
cannot perturb the cascade-delete or optimistic-state logic that lives in
`dataStore.tsx` (the riskiest file to touch).