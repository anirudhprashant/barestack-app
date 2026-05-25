# BareStack CRM - Deployment Guide

A modern, professional CRM for agencies and freelancers. Built with React, TypeScript, PocketBase, Tailwind CSS, and deployed via Cloudflare Tunnel.

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
- **Font**: Gabarito (Google Fonts)
- **Validation**: Zod
- **Deployment**: Cloudflare Tunnel, Vercel-compatible

---

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/anirudhprashant/BareStack-Google.git
cd BareStack-Google
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

Create `.env` (or `.env.local`):

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8092
```

### 4. Start Development

```bash
npm run dev
```

---

## Production Deployment

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │────▶│   Cloudflared   │────▶│   PocketBase    │
│   app.barestack │     │   Tunnel        │     │   :8092         │
│   api.barestack│     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1. Build the App

```bash
npm run build
```

Output: `dist/` folder

### 2. Deploy PocketBase Backend

```bash
# Install PocketBase
wget https://github.com/pocketbase/pocketbase/releases/latest/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip

# Run with proper bindings
./pocketbase serve --http="0.0.0.0:8092"
```

### 3. Deploy Frontend (Static)

**Option A: Vite Preview Server**

```bash
npm run preview -- --port 8084 --host 0.0.0.0
```

**Option B: Nginx**

```nginx
server {
    listen 8084;
    server_name app.barestack.org;
    root /var/www/barestack-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Option C: Vercel/Netlify/Cloudflare Pages**

1. Build: `npm run build`
2. Deploy `dist/` folder
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Set environment variable: `VITE_POCKETBASE_URL=https://api.barestack.org`

### 4. Configure Cloudflare Tunnel

Install cloudflared:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

Create `/etc/cloudflared/config.yml`:

```yaml
# api.barestack.org -> PocketBase backend
ingress:
  - hostname: api.barestack.org
    service: http://localhost:8092

  # app.barestack.org -> Vite preview on port 8084
  - hostname: app.barestack.org
    service: http://localhost:8084

  - service: http_status:404
```

Start the tunnel:

```bash
cloudflared service install
systemctl start cloudflared
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_POCKETBASE_URL` | PocketBase API URL | `http://127.0.0.1:8092` |

---

## Security

- **Filter Injection Prevention**: All user IDs are sanitized with regex validation
- **Input Validation**: Zod schemas for all entity types
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy (via Vite or reverse proxy)
- **Auth**: JWT-based via PocketBase authStore
- **Secrets**: Environment-based, never committed to git
- **CSP Audio Support**: `media-src 'self' data: blob:` allows base64 audio/sound features

---

## Project Structure

```
├── components/      # React components
├── pages/          # Page components
├── src/
│   ├── lib/        # API and validation
│   └── style.css   # Tailwind styles
├── dist/           # Built output
├── vite.config.ts  # Vite + security headers
├── index.html      # Entry + Gabarito font
├── types.ts        # TypeScript types
├── dataStore.tsx   # State management
└── package.json
```

---

## Troubleshooting

### "sort=-created returns 400" Error
PocketBase collections may not support sorting by `created` field in filter queries. Use `sort=-id` instead (IDs are time-based and sortable).

### Audio/Sound Feature Not Working
Ensure CSP includes `media-src 'self' data: blob:`. This is configured in `vite.config.ts`.

### Cloudflare Tunnel Connection Refused
- Ensure vite preview is running: `curl http://localhost:8084`
- Check cloudflared logs: `journalctl -u cloudflared -f`

---

## License

MIT
