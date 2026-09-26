# Changelog

All notable changes to BareStackOS are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Self-hosters: anything that requires you to change configuration, re-run
`install.sh`, or migrate data will be called out under **Breaking** with the
steps needed. If a release has no **Breaking** section, upgrading is a pull and
a rebuild.

## [1.2.0] - 2026-09-26

Upgrading: pull, rebuild, and restart PocketBase with `--migrationsDir
./pb_migrations --hooksDir ./pb_hooks` (as `start.sh` does). One new migration
adds two optional invoice fields and the `invoice_shares` collection.

### Added

- **Recurring invoices**: weekly, monthly, quarterly or yearly. A server cron
  (`pb_hooks/recurring.pb.js`, hourly) creates each new invoice as a Draft with
  the same lines, tax, notes and payment window, numbered in your series.
  Missed periods are caught up; month-end dates stay on the month end.
- **Client share links**: a private, read-only invoice page with PDF download
  and print, no account needed. It refreshes when you edit the invoice and can
  be turned off at any time.
- **Dark mode**: light, dark or follow the system, in Settings, the header or
  `Shift+D`. Charts use colour pairs validated for both themes.
- **Real-time sync** across tabs and devices via PocketBase subscriptions.
- **Keyboard shortcuts**: `g` + letter to navigate, `n` + letter to create,
  `/` to search, `t` for the timer, `?` for the list.
- **Sample data**: load a demo agency from the dashboard or Settings, and
  remove it again in one click.
- **Installable app** (web manifest and icons).
- **End-to-end test suite** (Playwright) against a real PocketBase and the
  production build, run in CI on every pull request.

### Fixed

- Deletes are idempotent, so a cascade no longer fails half-way when a record
  was already removed (for example in another tab).

### Security

- CI workflow runs with read-only `permissions` (SECURITY_AUDIT F11).
- Share-link threat model documented in SECURITY_AUDIT.md.

## [1.1.0] - 2026-09-26

Upgrading is a pull and a rebuild: restart PocketBase with
`--migrationsDir ./pb_migrations` (as `start.sh` does) and the two new
migrations apply automatically. They only add fields, a collection and tighter
rules; no existing data is changed.

### Added

- **Business profile** in Settings: business name, address, email, phone,
  website, tax ID, currency, default tax rate, payment terms, invoice number
  prefix, payment instructions and invoice footer. All of it is used on
  invoices, and the currency is used across the app.
- **Invoices**: multiple line items, tax rate, notes, editable invoice number,
  per-year numbering with an optional prefix, automatic *Overdue* status for
  sent invoices past due, paid date tracking, quick "mark sent / mark paid",
  duplicate, email to client (downloads the PDF and opens a pre-filled email),
  bulk download as ZIP, CSV export, status filters and totals.
- **Bill unbilled time**: turn a project's billable hours into invoice lines at
  the project's hourly rate; the entries are marked as billed, and freed again
  if the invoice is deleted.
- **PDF invoices** now show your business details, client email and phone,
  notes, payment instructions, real payment terms, a paid date and a
  multi-page footer, and print non-Latin currencies safely.
- **Timer**: start/stop from Time Tracking, a project or a task; it survives
  reloads, syncs across tabs and shows in the header while running.
- **Time tracking**: edit and delete entries, billable toggle, optional task,
  `1:30` / `90m` input, week navigation, unbilled hours and value, project
  filter, CSV export.
- **Projects**: edit and delete, description, hourly rate, due date, progress
  on hours, budget and tasks, time and expense tabs, status filter.
- **Tasks**: edit and delete, description, priority, overdue flags.
- **Deal pipeline**: Lead column (deals at Lead were invisible before), deal
  titles, expected close dates, edit and delete, win rate, one-click advance.
- **Contacts**: contact profile with deals, projects, invoices, paid and
  outstanding totals, editable and deletable notes; tag filters, sorting,
  CSV export, bulk export.
- **Expenses**: edit, receipt links, period and category filters with totals,
  CSV export.
- **Reports** page: revenue vs expenses by month, profit and margin, top
  clients, hours by project, expenses by category, CSV export.
- **Command palette** (Ctrl/⌘ + K) to find any contact, project or invoice or
  run common actions.
- **Notifications** bell for overdue invoices, tasks due and deals past close.
- **Getting-started checklist** on the dashboard for new accounts.
- **Backup and restore**: full JSON backup, and restore into any BareStackOS
  instance with every reference remapped.
- Account settings: password change, email change via confirmation link, and
  account deletion that removes all data first.

### Fixed

- Contact **tags were silently discarded** on save (an array was sent to a
  text field), and editing a contact then crashed the page.
- **Invoice edits and deletions were never logged**: the server hook's
  activity-type allow-list was not updated when the field was widened.
- Only the **first 500 records** of each type were loaded; everything past
  that was invisible. All records now load.
- Lists were in **random order** (sorted by id) because most collections had
  no `created` timestamp. Added `created` / `updated` fields.
- **Dates shifted by a day** for anyone west of UTC (invoice, expense and
  time-entry dates, and the weekly time chart).
- Dates failed to parse on older Safari (PocketBase's `YYYY-MM-DD HH:MM:SS`).
- The **CRM tabs were missing** on the Contacts and Activity pages, so the
  pipeline and imports were unreachable from the UI.
- **Invoice PDF preview was blocked** by the self-hosted server's CSP.
- Fresh self-hosted installs without SMTP left new users stuck on "Verify your
  email" forever. New sign-ups are now verified automatically until SMTP is
  configured (set `BARESTACK_REQUIRE_EMAIL_VERIFICATION=true` to opt out).
- `start.sh` used `vite preview`, which rejects any hostname but the two
  barestack.org ones; it now uses `serve.cjs`.
- Changing your email in Settings silently failed; it now uses PocketBase's
  confirm-by-email flow.
- A failed activity log no longer turns a successful save into an error.
- Search on Contacts could leave you on an empty page; bulk deletes worked from
  stale data; nested dialogs all closed on one Escape; import ignored
  drag-and-drop and duplicate rows within the same file.
- Deleting an expense-linked project no longer deletes the expenses (they are
  unlinked instead).
- Sign-up and sign-in errors now show the real reason (for example "password:
  Must be at least 8 characters").

### Security

- **Ownership freeze (SECURITY_AUDIT F4)**: update rules now reject changing a
  record's `user`, so records can no longer be moved into another account.
- CSV exports neutralise spreadsheet formulas (CSV injection).
- Receipt links only render for `http(s)` URLs.
- Sessions are refreshed on load; revoked tokens sign out cleanly.

### Performance

- Pages are code-split and the spreadsheet parser loads only when importing:
  the initial JavaScript download dropped from about 1.3 MB to about 390 KB.
- `serve.cjs` now gzips responses and caches fingerprinted assets for a year.

## [1.0.0] - 2026-07-29

First tagged release. The app has been running in production since June 2026;
this tag marks the point where the backend, licence and security model settled
enough to pin a version to.

### Added

- CRM core: contacts, deals with a drag-and-drop kanban pipeline, and notes.
- Time tracking with a weekly bar-chart view.
- Invoicing with branded PDF export, including embedded fonts so invoices
  render identically wherever they are opened.
- Expense tracking.
- CSV import with per-batch history and an activity log.
- Email/password authentication with an email verification flow, including
  cross-device verification (prefilled email and a verified banner on sign-in).
- Self-host installer (`install.sh`) with a static server (`serve.cjs`).
- Opt-in demo auto-login, gated behind the `VITE_DEMO_EMAIL` and
  `VITE_DEMO_PASSWORD` environment variables. When they are unset the normal
  login flow is used, so this cannot weaken a real deployment.
- `SECURITY_AUDIT.md` documenting the threat model and the hardening work.

### Changed

- Backend settled on PocketBase, after earlier iterations on Convex and
  Supabase. PocketBase keeps the whole deployment to a single binary and a
  data directory, which is the point of self-hosting.
- Responsive across mobile and desktop.
- Design system pass: Instrument Serif headings, Inter body, brand palette.

### Security

- Server-side integrity hook for activity and import logs.
- `Strict-Transport-Security` emitted from the static server.
- Verified-owner data access rules, re-pinned idempotently on migration.
- Input bounds enforced at the `api.ts` `create()` chokepoint.
- `install.sh` prints and verifies a checksum, and documents TLS setup.
- TypeScript strict mode enabled; cascade deletes fixed.
- Upgraded to Vite 7, clearing all outstanding advisories.

### Breaking

- **Licence changed to AGPL-3.0.** Earlier revisions were MIT, then GPL-3.0,
  then GPL-3.0 with an added no-commercial-resale clause. That added clause
  contradicted GPL-3.0 section 7, which forbids further restrictions, so the
  result was not a valid open source licence and GitHub reported it as
  `NOASSERTION`. It is now plain AGPL-3.0 with no additional terms. If you run
  a modified version as a network service, AGPL-3.0 section 13 requires you to
  offer users the source of your modified version.

[1.2.0]: https://github.com/anirudhprashant/barestack-app/releases/tag/v1.2.0
[1.1.0]: https://github.com/anirudhprashant/barestack-app/releases/tag/v1.1.0
[1.0.0]: https://github.com/anirudhprashant/barestack-app/releases/tag/v1.0.0
