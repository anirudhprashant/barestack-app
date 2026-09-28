<p align="center">
  <img src="docs/banner.png" alt="BareStackOS: run your agency on software you own" width="100%">
</p>

<p align="center">
  <a href="https://github.com/anirudhprashant/barestack-app/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/anirudhprashant/barestack-app/ci.yml?style=flat-square&label=CI&labelColor=141C11&color=C37624"></a>
  <img alt="v1.2.0" src="https://img.shields.io/badge/version-1.2.0-141C11?style=flat-square&labelColor=141C11&color=3B4834">
  <a href="LICENSE"><img alt="AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-C37624?style=flat-square&labelColor=141C11"></a>
  <img alt="React + PocketBase" src="https://img.shields.io/badge/React%20·%20TypeScript%20·%20PocketBase-141C11?style=flat-square&labelColor=141C11&color=3B4834">
</p>

<p align="center">
  <b>The business back office for agencies and freelancers, in one app you can own outright.</b><br>
  CRM, deal pipeline, projects, time tracking, invoicing, expenses and reports.<br>
  Self-host it for free, with no seat limits and no per-user pricing.
</p>

<p align="center">
  <a href="https://demo.barestack.org"><b>Try the live demo →</b></a><br>
  <sub>No sign-up. Resets every hour.</sub>
</p>

<table>
  <tr>
    <td width="33%"><img src="docs/screenshots/crm.png" alt="CRM contacts table with pipeline stages"></td>
    <td width="33%"><img src="docs/screenshots/projects.png" alt="Projects board with status, value and hours"></td>
    <td width="33%"><img src="docs/screenshots/invoicing.png" alt="Invoicing list with paid, sent, overdue and draft statuses"></td>
  </tr>
  <tr>
    <td align="center"><sub>Contacts and pipeline</sub></td>
    <td align="center"><sub>Projects</sub></td>
    <td align="center"><sub>Invoicing</sub></td>
  </tr>
</table>

## Why BareStackOS

| | |
|---|---|
| **Everything in one place** | A contact becomes a deal, the deal becomes a project, the project's hours become an invoice. No Zapier glue between five subscriptions. |
| **You own it** | Self-hosted on PocketBase, a single binary. Your data sits in one folder on your server. |
| **Leave any time** | Full JSON backup and restore, CSV exports everywhere. Move between the hosted cloud and your own server in either direction. |
| **Gets paid** | Recurring retainer invoices, client share links with PDF download, and unbilled time turned into invoice lines in one click. |
| **Fast to live in** | Command palette, keyboard shortcuts, dark mode, real-time sync across tabs and devices, installable as an app. |

## Install in one command

```bash
curl -sSL https://raw.githubusercontent.com/anirudhprashant/barestack-app/main/install.sh | bash
```

Or if you already have the repo:

```bash
./install.sh
```

By default this is a **fully self-hosted** install: the app talks to a PocketBase
instance running on your own machine. Your data lives in `./pb_data` and never
touches the BareStack cloud.

This will:
1. Install npm dependencies
2. Download PocketBase (the pinned, tested version)
3. Apply the database schema from `pb_migrations/` (collections + owner-only access rules)
4. Create a PocketBase admin with a randomly generated password (printed once)
5. Build the frontend pointed at your local PocketBase
6. Create a `start.sh` script

Then run `./start.sh` to launch.

> **Want to use the hosted BareStack cloud instead of your own backend?**
> Run `./install.sh --cloud`. This builds the frontend against `api.barestack.org`
> and skips the local PocketBase setup.

<details>
<summary><b>Manual setup</b></summary>

### 1. Install Dependencies

```bash
npm install
```

### 2. Download PocketBase

Download the **pinned** version (the installer uses the same one; newer majors
change the admin API and may not match these migrations):

```bash
PB_VERSION=0.36.2
# Linux amd64 (use linux_arm64 / darwin_arm64 / darwin_amd64 as appropriate):
curl -fL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -o pocketbase.zip
unzip -o pocketbase.zip pocketbase
chmod +x pocketbase
```

### 3. Apply the Schema

The collections and their owner-only access rules are version-controlled in
`pb_migrations/`. Apply them; no manual collection creation needed:

```bash
./pocketbase migrate up --dir ./pb_data --migrationsDir ./pb_migrations
```

Then create an admin (superuser):

```bash
./pocketbase superuser upsert admin@barestack.local "$(openssl rand -base64 18)" --dir ./pb_data
```

### 4. Configure Environment

Create a `.env` file pointing at your local PocketBase:

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8092
```

### 5. Build and Run

```bash
./pocketbase serve --dir ./pb_data --migrationsDir ./pb_migrations --hooksDir ./pb_hooks --http="0.0.0.0:8092" &
npm run build
PORT=8080 node serve.cjs
```

`serve.cjs` is a small dependency-free static server with security headers,
gzip, long-lived caching for fingerprinted assets and SPA routing. Put it (and
PocketBase) behind a TLS-terminating reverse proxy for anything public.

Open http://localhost:8080

</details>

## Everything it does

**CRM**
- Contacts with tags, inline editing, search, tag filters, sort, CSV export and bulk actions
- Contact profiles with deals, projects, invoices, lifetime value and editable notes
- Deal pipeline (Lead → Qualified → Proposal → Won/Lost) with drag and drop, titles, values, expected close dates, win rate and open pipeline value
- CSV / Excel import with duplicate handling (skip, update or create, per row or all at once) and one-click undo

**Projects & time**
- Projects with budget, estimated hours, hourly rate, due date and live progress (hours, budget used, tasks)
- Task boards with priorities, due dates, overdue flags, edit and delete
- Start/stop timer that survives reloads and syncs across tabs, plus manual entries (`1.5`, `1:30` or `90m`)
- Weekly hours chart with week navigation, billable vs non-billable, CSV export

**Money**
- Invoices with multiple line items, tax, notes, custom numbering (`INV-2026-001`) and automatic overdue detection
- **Recurring invoices** for retainers (weekly, monthly, quarterly, yearly), generated on the server as drafts
- **Client share links**: a private page where your client views the invoice and downloads the PDF, no account needed. Updates when you edit; turn it off any time
- **Bill unbilled time in one click**: billable hours become invoice lines at the project rate, and the entries are marked as billed
- Branded PDF invoices with your business details, payment instructions and currency; preview, download, ZIP of many, or email to the client
- Expenses with categories, projects, receipt links, period filters and CSV export
- Reports: revenue vs expenses by month, profit and margin, top clients, hours by project, expenses by category

**Workspace**
- Command palette (Ctrl/⌘ + K) to jump to any contact, project or invoice, or start a timer
- Keyboard shortcuts (`g i` invoices, `n c` new contact, `?` for the full list)
- **Dark mode** (light, dark or follow the system)
- **Real-time sync**: changes appear instantly in every open tab and device
- Installable as an app (PWA) on desktop and phones
- One-click **sample data** to explore, and one-click removal
- Notifications for overdue invoices, tasks due and deals past their close date
- Business profile: name, address, tax ID, currency, default tax rate, payment terms and invoice footer
- Getting-started checklist, activity log, responsive on phones
- **Your data is portable**: CSV export, full JSON backup, and restore into any BareStackOS instance (cloud → self-hosted and back)
- Account settings: name, email change, password change, and full account deletion

---

## Upgrading

Pull, rebuild, and restart PocketBase with `--migrationsDir ./pb_migrations`
(the bundled `start.sh` already does). New migrations apply automatically and
only *add* things; existing data is untouched.

```bash
git pull
npm ci
VITE_POCKETBASE_URL=<your PocketBase URL> npm run build
./start.sh
```

## Email and account verification

New accounts must verify their email before they can see any data. When
PocketBase has **no SMTP configured** (the default for a fresh self-hosted
install), there is no way to deliver that email, so new sign-ups are verified
automatically (`pb_hooks/auth.pb.js`). As soon as you enable SMTP in the
PocketBase dashboard (`/_/` → Settings → Mail settings), normal verification
emails are used. Set `BARESTACK_REQUIRE_EMAIL_VERIFICATION=true` in
PocketBase's environment to always require verification.

---

## Development

```bash
npm run dev          # Vite dev server (point VITE_POCKETBASE_URL at a PocketBase)
npm test             # unit tests (vitest)
npm run test:e2e     # browser tests: starts a throwaway PocketBase + production build
npm run typecheck
```

The end-to-end suite (`tests/e2e`) downloads the pinned PocketBase into
`.e2e/`, applies this repo's migrations and hooks to a fresh database, and
drives the real production build with Playwright. CI runs it on every pull
request.

---

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite 7, Tailwind CSS 4
- **Backend**: PocketBase (self-hosted, open-source)
- **Fonts**: Instrument Serif + Inter + Plus Jakarta Sans (Google Fonts)
- **PDF**: jsPDF with AutoTable

---

## Security

- **Filter Injection Prevention**: All user IDs are sanitized with regex validation
- **Input Validation**: Required fields enforced on all forms
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Auth**: JWT-based via PocketBase authStore
- **Data Isolation**: Server-side PocketBase rules: users can only read and write their own records, and can't move a record into someone else's account
- **Safe exports**: CSV exports neutralise spreadsheet formulas (CSV injection)
- **Secrets**: Environment-based, never committed to git

---

## Project Structure

```
├── components/      # React components (forms, command palette, UI kit)
├── pages/          # Page components
├── pb_migrations/  # PocketBase schema + access rules (applied automatically)
├── pb_hooks/       # Server-side hooks (activity integrity, verification)
├── src/
│   ├── context/   # Toasts, timer
│   ├── lib/       # API, dates, money, invoices, PDF, backup, CSV
│   └── style.css   # Tailwind styles
├── vite.config.ts  # Vite + security headers
├── index.html      # Entry + Google Fonts
├── types.ts        # TypeScript types
├── dataStore.tsx   # State management
├── install.sh      # One-line installer
└── start.sh        # Launcher script
```

---

## License

AGPL-3.0. Run it, modify it, self-host it, no charge and no seat limits.
If you distribute a modified version, or run one as a network service for
others, you have to publish your source under the same licence. See LICENSE
for the full text.

---

<p align="center"><img src="docs/logo.svg" width="32" alt=""><br><sub>made by <a href="https://github.com/anirudhprashant">Anirudh Prashant</a> · <a href="https://barestack.org">barestack.org</a></sub></p>
