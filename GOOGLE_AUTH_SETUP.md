# Google OAuth Setup Instructions

Google authentication has been implemented but requires configuration of OAuth credentials.

## Setup Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the "Google+ API" for your project
4. Go to "Credentials" and create an OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `https://backendconvex.barestack.org/api/auth/callback/google`
5. Copy the Client ID and Client Secret

## Set Environment Variables

Use the Convex CLI to set the required environment variables:

```bash
npx convex env set AUTH_GOOGLE_ID <your-google-client-id> --url https://backendconvex.barestack.org --admin-key "self-hosted-convex|01bd2c2d7b12d4d6604f183ad599e90673df251275eed514ece2c12a01a6205bac2b95b964"

npx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret> --url https://backendconvex.barestack.org --admin-key "self-hosted-convex|01bd2c2d7b12d4d6604f183ad599e90673df251275eed514ece2c12a01a6205bac2b95b964"
```

## Deploy

After setting the environment variables, deploy:

```bash
npx convex deploy --url https://backendconvex.barestack.org --admin-key "self-hosted-convex|01bd2c2d7b12d4d6604f183ad599e90673df251275eed514ece2c12a01a6205bac2b95b964"
```

## Note

The app currently has temporary placeholder values set for the Google OAuth credentials. Until real credentials are configured, Google sign-in will not work properly.

However, CSV import functionality for contacts is fully operational and doesn't require Google OAuth to be configured.
