# Google OAuth Setup Instructions

Google authentication has been fully implemented with @convex-dev/auth and is now configured for the Convex Cloud deployment at `https://trustworthy-cat-479.convex.cloud`.

## Current Configuration

The application wraps the entire React tree with `ConvexAuthProvider`, enabling:
- Google OAuth authentication via Convex
- `useAuthActions` hook for sign in/out
- `Authenticated` and `Unauthenticated` components to gate routes

## Required Setup

1. **Google Cloud Console**
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Locate the OAuth 2.0 Client ID: `738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com`
   - Edit the client and ensure the following redirect URIs are listed:
     - `https://trustworthy-cat-479.convex.site/api/auth/callback/google` *(required)*
     - `https://crm.barestack.org/auth/callback` *(optional: frontend callback handler)*
   - Save the client ID and secret. You'll need both for Convex environment variables.

2. **Convex Cloud Environment Variables**
   Set the following variables on the Convex deployment (`https://trustworthy-cat-479.convex.cloud`). You can do this via the Convex dashboard or the CLI:

   ```bash
   # Using the CLI (production deployment)
   npx convex env set AUTH_GOOGLE_ID "738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com" --prod
   npx convex env set AUTH_GOOGLE_SECRET "<your-google-client-secret>" --prod
   npx convex env set SITE_URL "https://crm.barestack.org" --prod
   ```

   Additional variables such as `JWT_PRIVATE_KEY` should already be provisioned. If not, generate and set them as required by your security policies.

3. **Deploy Convex Functions**
   After updating configuration or backend code, deploy to Convex Cloud:

   ```bash
   npx convex deploy --prod
   ```

## OAuth Flow Overview

1. User visits `https://crm.barestack.org`
2. Unauthenticated users see the Auth page
3. Clicking "Sign in with Google" triggers `signIn("google")`
4. Convex redirects the user to the Google OAuth consent screen
5. Google redirects back to `https://trustworthy-cat-479.convex.site/api/auth/callback/google`
6. Convex processes the callback, creates a session, and redirects the browser back to `https://crm.barestack.org`
7. The user is now authenticated and gains access to the dashboard

## Troubleshooting Tips

- **Server Error from `auth:signIn`**: Ensure all required environment variables are set on the Convex deployment.
- **`redirect_uri_mismatch` from Google**: Verify the `.convex.site` callback URL is registered in Google Cloud Console.
- **Still having issues?** See `CLOUD_DEPLOYMENT_SETUP.md` for a detailed troubleshooting guide.
