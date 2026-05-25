# BareStack CRM

A modern, professional CRM for agencies and freelancers. Built with React, TypeScript, PocketBase, and Tailwind CSS.

## Features

- **Contacts** - Manage client and prospect information
- **Deals** - Track sales pipeline with stages (Lead → Qualified → Proposal → Won/Lost)
- **Projects** - Project management with budget tracking
- **Tasks** - Task management with priorities and due dates
- **Invoices** - Create and manage invoices with line items
- **Time Tracking** - Log billable hours
- **Expenses** - Track business expenses by category
- **Notes** - Attach notes to contacts or projects
- **Recent Activity** - Track all changes with activity log

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 4
- **Backend**: PocketBase (self-hosted, open-source)
- **Validation**: Zod
- **Deployment**: Cloudflare Tunnel, Vercel-compatible

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up PocketBase

Download PocketBase from https://pocketbase.io/docs/

```bash
# Run PocketBase
./pocketbase serve

# Create admin account at http://127.0.0.1:8092/_/
```

### 3. Configure Environment

Create `.env.local`:

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8092
```

### 4. Start Development

```bash
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_POCKETBASE_URL` | PocketBase API URL | `http://127.0.0.1:8092` |

## Production Deployment

### Frontend (Vercel, Netlify, Cloudflare Pages)

1. Build: `npm run build`
2. Deploy `dist/` folder
3. Set `VITE_POCKETBASE_URL` to your production PocketBase URL
4. Configure SPA rewrite to `index.html`

### PocketBase Backend

```bash
# Install PocketBase
wget https://github.com/pocketbase/pocketbase/releases/latest/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip

# Run
./pocketbase serve --http="0.0.0.0:8092"
```

### Cloudflare Tunnel (Recommended)

```yaml
# /etc/cloudflared/config.yml
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8092
  - hostname: crm.yourdomain.com
    service: http://localhost:5173
  - service: http_status:404
```

## Security

- **Filter Injection Prevention**: All user IDs are sanitized with regex validation
- **Input Validation**: Zod schemas for all entity types
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Auth**: JWT-based via PocketBase authStore
- **Secrets**: Environment-based, never committed to git

## Project Structure

```
├── components/     # React components
├── pages/         # Page components
├── src/
│   └── lib/       # API and validation
├── types.ts       # TypeScript types
├── dataStore.tsx  # State management
└── vite.config.ts # Vite configuration
```

## License

MIT
