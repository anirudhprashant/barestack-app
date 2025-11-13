## Changes to Make
- Add `app.barestack.org` to Vite preview allowlist so `vite preview` accepts the new domain.
- Keep the running local server; do not stop port 3000.
- Commit and push the change so Coolify redeploys.

## Ops Updates (outside code)
- In Coolify: change the app’s FQDN to `app.barestack.org` and redeploy.
- In Supabase Auth: set Site URL to `https://app.barestack.org` and add redirect URLs: `https://app.barestack.org` and `https://app.barestack.org/auth/callback`.
- In Google OAuth client: add authorized redirect URIs matching `https://app.barestack.org/auth/callback` (and `/exchange` if used).

## Verification
- After redeploy, visit `https://app.barestack.org` and confirm there are no host-block messages.
- Confirm Google sign-in completes and returns to `https://app.barestack.org`.

## Notes
- No other env changes required; existing variables remain valid.