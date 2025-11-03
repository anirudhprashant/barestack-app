# Google OAuth Setup Instructions

Google authentication has been fully implemented with @convex-dev/auth.

## Current Configuration

The application is now properly configured with `ConvexAuthProvider` wrapping the entire app, which enables:
- Google OAuth authentication
- `useAuthActions` hook for sign in/out
- `Authenticated` and `Unauthenticated` components for conditional rendering

## OAuth Setup Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the "Google+ API" for your project
4. Go to "Credentials" and create an OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `https://backendconvex.barestack.org/api/auth/callback/google`
5. Copy the Client ID and Client Secret

## Environment Variables

The following environment variables have been configured in Convex:

```bash
AUTH_GOOGLE_ID=738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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
JWT_PRIVATE_KEY=(configured)
SITE_URL=https://crm.barestack.org/
```

To update these values, use:

```bash
npx convex env set AUTH_GOOGLE_ID <your-google-client-id> --url https://backendconvex.barestack.org --admin-key "self-hosted-convex|01bd2c2d7b12d4d6604f183ad599e90673df251275eed514ece2c12a01a6205bac2b95b964"

npx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret> --url https://backendconvex.barestack.org --admin-key "self-hosted-convex|01bd2c2d7b12d4d6604f183ad599e90673df251275eed514ece2c12a01a6205bac2b95b964"
```

## Deploy

After making changes, deploy with:

```bash
npx convex deploy --url https://backendconvex.barestack.org --admin-key "self-hosted-convex|01bd2c2d7b12d4d6604f183ad599e90673df251275eed514ece2c12a01a6205bac2b95b964"
```

## OAuth Flow

1. User visits https://crm.barestack.org
2. Unauthenticated users see the Auth page
3. Click "Sign in with Google"
4. Redirect to Google OAuth consent screen
5. After consent, Google redirects to: `https://backendconvex.barestack.org/api/auth/callback/google`
6. Convex Auth processes the callback and authenticates the user
7. User is redirected back to the app with authenticated session
