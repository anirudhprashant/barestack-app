# BareStack CRM

A modern, professional CRM for agencies and freelancers. Built with React, TypeScript, PocketBase, and Tailwind CSS.

## Quick Start (One Command)

```bash
curl -sSL https://raw.githubusercontent.com/anirudhprashant/BareStack-Google/main/install.sh | bash
```

Or if you already have the repo:

```bash
./install.sh
```

This will:
1. Install npm dependencies
2. Download PocketBase (backend)
3. Build the frontend
4. Create a `start.sh` script

Then run `./start.sh` to launch.

---

## Manual Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Download PocketBase

```bash
# Download the latest release for your platform
# Linux:
wget https://github.com/pocketbase/pocketbase/releases/latest/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip
chmod +x pocketbase

# macOS (Apple Silicon):
curl -L https://github.com/pocketbase/pocketbase/releases/latest/pocketbase_darwin_arm64.zip -o pocketbase.zip
unzip pocketbase.zip
chmod +x pocketbase
```

### 3. Set Up PocketBase

1. Start PocketBase: `./pocketbase serve --http="0.0.0.0:8092"`
2. Open http://localhost:8092/_/ in your browser
3. Create an admin account
4. Create these collections with the following fields:

**users** (built-in auth collection)
- email (required)
- password (required)

**contacts**
- name (text, required)
- email (email)
- phone (text)
- company (text)
- user (relation → users, required)

**deals**
- contact_id (relation → contacts, required)
- value (number, required)
- stage (select: Lead/Qualified/Proposal/Won/Lost, required)
- last_interaction (date)
- user (relation → users, required)

**projects**
- name (text, required)
- client_id (relation → contacts)
- status (select: Active/Completed/On Hold)
- budget (number)
- estimated_hours (number)
- user (relation → users, required)

**tasks**
- title (text, required)
- project_id (relation → projects)
- status (select: Todo/In Progress/Done)
- priority (select: Low/Medium/High)
- due_date (date)
- user (relation → users, required)

**invoices**
- invoice_number (text, required)
- client_id (relation → contacts, required)
- issue_date (date, required)
- due_date (date, required)
- line_items (json - array of {description, quantity, rate})
- tax_rate (number)
- status (select: Draft/Sent/Paid/Overdue)
- user (relation → users, required)

**time_entries**
- project_id (relation → projects)
- description (text)
- hours (number, required)
- date (date, required)
- user (relation → users, required)

**expenses**
- description (text, required)
- amount (number, required)
- category (select: Travel/Meals/Software/Office/Other)
- date (date, required)
- project_id (relation → projects)
- user (relation → users, required)

**notes**
- content (text, required)
- contact_id (relation → contacts)
- project_id (relation → projects)
- user (relation → users, required)

**recent_activity**
- type (text, required)
- description (text, required)
- timestamp (date, required)
- user (relation → users, required)

### 4. Configure Environment

Create a `.env` file:

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8092
```

### 5. Build and Run

```bash
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

MIT
