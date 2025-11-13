## Why the White Screen Happened
- Server served source files instead of compiled `dist/`, so `<script type="module" src="/index.tsx">` returned HTML or empty content-type, causing strict MIME failures.
- Nixpacks SPA mode misnamed env var (`NIXPACKS_SPA_OUTPUT_DIR` instead of `NIXPACKS_SPA_OUT_DIR`) and Rollup optional-deps mismatch from cross‑OS lockfile broke builds.
- When falling back to `vite preview`, requests were blocked by `preview.allowedHosts` not including `test.barestack.org`.

## Current Environment Review
- `NIXPACKS_NODE_VERSION=22`: good; aligns with Vite 5.
- `NIXPACKS_SPA_CADDY=false`: good; you’re using `vite preview` to serve `dist`.
- `NIXPACKS_SPA_OUT_DIR=dist`: harmless even with Caddy disabled; we can keep it or remove it for clarity.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: good; present at build time; app reads them via `import.meta.env`.

## Minimal Hardening Plan
1) Vite Preview Reliability
- In `vite.config.ts`, keep:
  - `preview.host: true` and `preview.allowedHosts: ['test.barestack.org']` (already added).
- Add `preview.strictPort: true` to avoid silent port changes.
- Update `package.json` `start` script to `vite preview --port 3000 --host --strictPort` so Coolify’s start is deterministic.

2) Build Stability in Linux
- Do not reintroduce `package-lock.json`. If a lockfile is needed later, switch to PNPM via Corepack (`"packageManager": "pnpm@8"`) so Nixpacks installs cross‑platform binaries correctly.
- Optionally pin exact versions in `package.json` for `vite`, `@vitejs/plugin-react`, `rollup` (removes caret ranges). This reduces surprise upgrades.

3) Env Safety
- Keep Supabase envs in Coolify; they’re required at build time. Add a friendly UI fallback instead of throwing:
  - Replace the hard throw in `services/supabaseClient.ts` with a guard that renders a visible error component if envs are missing, so the page doesn’t blank out.

4) Static Asset Guarantees
- Confirm `index.html` only ships via compiled `dist/index.html`; no source `<script src="/index.tsx">` reaches production. This is handled by `vite build`; no action required beyond keeping the build step.

5) Operational Guidance
- Use `NIXPACKS_SPA_CADDY=false` consistently; don’t set `OUTPUT_DIR` (misspelled) ever again.
- Ensure Coolify deploy logs show `npm i` (not `npm ci`) and `vite build` succeeded; if Rollup ever errors with platform optional deps again, remove lockfile or adopt PNPM.

## Verification after Changes
- Redeploy and check:
  - `https://test.barestack.org` loads without MIME errors.
  - Console has no host-blocked messages.
  - `Network` panel shows `dist/assets/index-*.js` with `application/javascript`.
  - Supabase login flow redirects back to `https://test.barestack.org` and sets a session.

## Scope & Carefulness
- All changes are small, self-contained, and strictly aimed at preventing the previous class of failures without introducing new complexity.
- We will not touch the running local server on `localhost:3000` while implementing these updates.