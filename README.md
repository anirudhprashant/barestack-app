# BareStack - Minimalist Business Dashboard

A fast, no-bullshit business dashboard for solopreneurs, powered by Convex backend.

## Features

- **CRM**: Manage contacts and deal pipeline
- **Projects**: Track projects and tasks
- **Dashboard**: Real-time business metrics
- **Time Tracking**: Log hours (coming soon)
- **Invoicing**: Generate invoices (coming soon)
- **Expenses**: Track business expenses (coming soon)
- **Reports**: Visualize your data (coming soon)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Convex Dev (serverless functions + real-time database)
- **Styling**: Tailwind CSS (via CDN)
- **Routing**: React Router (HashRouter)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your Convex deployment URL:
   ```
   VITE_CONVEX_URL=https://trustworthy-cat-479.convex.cloud
   ```

### Development

```bash
# Start the Vite dev server
npm run dev

# In another terminal, start Convex dev (or deploy to production)
npx convex dev
```

### Production Build

```bash
npm run build
```

## Convex Backend

This project uses Convex Cloud for its backend. The Convex functions are located in the `convex/` directory.

### Deploying Convex Functions

```bash
# Deploy to production
npx convex deploy --prod
```

### Seeding the Database

```bash
# Run the seeding function (after deploying)
npx convex run seedData:seedDatabase --prod
```

## Project Structure

```
├── convex/              # Convex backend functions
│   ├── schema.ts        # Database schema
│   ├── dashboard.ts     # Dashboard queries
│   ├── crm.ts           # CRM functions
│   ├── projects.ts      # Project management
│   ├── invoices.ts      # Invoice handling
│   ├── timeTracking.ts  # Time tracking
│   └── expenses.ts      # Expense tracking
├── pages/               # React pages/routes
├── components/          # Reusable UI components
├── types.ts             # TypeScript type definitions
└── App.tsx              # Main app component
```

## Philosophy

BareStack is about doing **less, better**. Every feature is:
- **Fast**: Sub-100ms queries
- **Minimal**: No unnecessary complexity
- **Readable**: Clean, obvious code
- **Type-safe**: Full TypeScript coverage

If you're unsure whether to add a feature, **don't add it**. We can always add more later.

## License

MIT
