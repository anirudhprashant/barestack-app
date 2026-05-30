# BareStack CRM

A modern, professional CRM for agencies and freelancers. Built with React, TypeScript, PocketBase, and Tailwind CSS.

## Quick Start (One Command)

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

---

## Manual Setup

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
`pb_migrations/`. Apply them — no manual collection creation needed:

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
./pocketbase serve --dir ./pb_data --migrationsDir ./pb_migrations --http="0.0.0.0:8092" &
npm run build
npm run preview -- --port 8080 --host 0.0.0.0
```

Open http://localhost:8080

---

## Features

- **Contacts** - Manage client and prospect information
- **Deals** - Track sales pipeline with stages (Lead → Qualified → Proposal → Won/Lost)
- **Projects** - Project management with budget tracking
- **Tasks** - Task management with priorities and due dates
- **Invoices** - Create and manage invoices with PDF download
- **Time Tracking** - Log billable hours
- **Expenses** - Track business expenses by category
- **Notes** - Attach notes to contacts or projects
- **Recent Activity** - Track all changes with activity log

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 4
- **Backend**: PocketBase (self-hosted, open-source)
- **Font**: Gabarito (Google Fonts)
- **PDF**: jsPDF with AutoTable

---

## Security

- **Filter Injection Prevention**: All user IDs are sanitized with regex validation
- **Input Validation**: Required fields enforced on all forms
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Auth**: JWT-based via PocketBase authStore
- **Data Isolation**: All data filtered by user ID - users can only see their own data
- **Secrets**: Environment-based, never committed to git

---

## Project Structure

```
├── components/      # React components
├── pages/          # Page components
├── src/
│   ├── lib/       # API and validation
│   └── style.css   # Tailwind styles
├── vite.config.ts  # Vite + security headers
├── index.html      # Entry + Gabarito font
├── types.ts        # TypeScript types
├── dataStore.tsx   # State management
├── install.sh      # One-line installer
└── start.sh        # Launcher script
```

---

## License

GPL-3.0
