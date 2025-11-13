## Problem Summary
- Coolify’s Linux build runs `npm ci`, which hits a known npm optional dependency issue and fails to install Rollup’s platform package (`@rollup/rollup-linux-x64-gnu`). The build then crashes during `vite build`.
- The repo contains generated output (`dist/`) and Vercel config artifacts that aren’t used for Coolify and add noise.

## Minimal, Safe Fix
1) Stop `npm ci` in builds
- Remove `package-lock.json` from the repo so Nixpacks runs `npm i` instead of `npm ci`. This avoids the npm optional-deps bug and installs the correct Rollup binaries for Linux.
- Do not re-add a npm lockfile; if later you want a lockfile, we can adopt PNPM via Corepack (`"packageManager": "pnpm@8"`) which behaves correctly across platforms.

2) Clean repository bloat
- Delete generated `dist/` from the repo (keep it in `.gitignore` as already present).
- Remove unused deployment artifacts: `.vercel/`, `vercel.json`, `.vercelignore` since you deploy with Coolify.
- Keep all app source files; no functional pages/components will be removed.

3) Keep current deployment settings
- No changes to env vars: `NIXPACKS_NODE_VERSION=22`, `NIXPACKS_SPA_CADDY=false`, `NIXPACKS_SPA_OUT_DIR=dist`, and your `VITE_SUPABASE_*` keys are good.
- Start script remains `vite preview --port 3000 --host --strictPort`.

## Steps I Will Execute
- Delete `package-lock.json` and `dist/` from VCS.
- Delete `.vercel/`, `vercel.json`, `.vercelignore`.
- Commit and push.
- Trigger redeploy in Coolify (it will auto-pull the latest).

## Verification
- Coolify logs show `npm i` (not `npm ci`), then successful `vite build`.
- App loads on your domain with no MIME or module errors.

## Note on Alternative
- If you prefer a lockfile, I can switch to PNPM (`"packageManager": "pnpm@8"`) after the above succeeds; it’s optional and we’ll do it only if you want deterministic installs across OS.

I will keep your local port 3000 preview running and perform only the repo cleanup/build fix.