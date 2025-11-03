# Cloud Deployment Setup Guide

## New Convex Cloud Configuration

The application has been updated to use the new Convex Cloud deployment:

- **Deployment URL**: `https://trustworthy-cat-479.convex.cloud`
- **HTTP Actions URL**: `https://trustworthy-cat-479.convex.site`

## Critical Setup Steps

### 1. Set Environment Variables on Convex Cloud

You **MUST** set the following environment variables on your Convex Cloud deployment for Google OAuth to work:

```bash
# Using Convex Dashboard (Recommended)
# Go to: https://dashboard.convex.dev/deployment/trustworthy-cat-479/settings
# Navigate to "Environment Variables" section
# Add the following variables:

AUTH_GOOGLE_ID=738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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
SITE_URL=https://crm.barestack.org
```

Alternatively, if you have the admin key, you can use the CLI:

```bash
npx convex env set AUTH_GOOGLE_ID "738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com" --prod
npx convex env set AUTH_GOOGLE_SECRET "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" --prod
npx convex env set SITE_URL "https://crm.barestack.org" --prod
```

### 2. Update Google Cloud Console OAuth Settings

**CRITICAL**: Update the authorized redirect URIs in Google Cloud Console:

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Find OAuth 2.0 Client ID: `738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com`
3. Click "Edit"
4. Update "Authorized redirect URIs" to include:
   - **Required**: `https://trustworthy-cat-479.convex.site/api/auth/callback/google`
   - **Optional (for frontend)**: `https://crm.barestack.org/auth/callback`

**Note**: Use `.convex.site` (not `.convex.cloud`) for the OAuth callback URL as this is the HTTP Actions domain.

### 3. Deploy to Convex Cloud

Deploy your Convex functions to the cloud:

```bash
# Deploy to production
npx convex deploy --prod

# Or if using specific deployment
npx convex deploy
```

### 4. Test the OAuth Flow

1. Visit `https://crm.barestack.org`
2. Click "Sign in with Google"
3. You should be redirected to Google's OAuth consent screen
4. After authorization, you should be redirected back to the app and authenticated

## Troubleshooting

### Error: "Server Error" when signing in

**Possible causes**:
1. Environment variables not set on Convex Cloud deployment
2. Google OAuth redirect URI not updated in Google Cloud Console
3. Convex functions not deployed to cloud

**Solution**:
- Check Convex Dashboard logs: https://dashboard.convex.dev/deployment/trustworthy-cat-479/logs
- Verify environment variables are set
- Ensure you've deployed with `npx convex deploy --prod`
- Verify Google OAuth redirect URIs include the new `.convex.site` URL

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI configured in Google Cloud Console doesn't match what Convex is using.

**Solution**: 
Add `https://trustworthy-cat-479.convex.site/api/auth/callback/google` to authorized redirect URIs in Google Cloud Console.

### Error: "Missing environment variable AUTH_GOOGLE_ID"

**Cause**: Environment variables not set on Convex deployment.

**Solution**: Set the environment variables as described in Step 1 above.

## OAuth Flow Diagram

```
User clicks "Sign in with Google"
    ↓
Frontend calls signIn("google")
    ↓
Convex generates OAuth URL and redirects to Google
    ↓
User authorizes on Google consent screen
    ↓
Google redirects to: https://trustworthy-cat-479.convex.site/api/auth/callback/google
    ↓
Convex processes OAuth callback, creates session
    ↓
Convex redirects back to: https://crm.barestack.org?code=<verification_code>
    ↓
Frontend completes sign-in with verification code
    ↓
User is authenticated and sees the dashboard
```

## Important Notes

- **Environment Variables**: Must be set on the Convex Cloud deployment, not in the frontend `.env` file
- **Redirect URI Domain**: Always use `.convex.site` for HTTP actions (OAuth callbacks), not `.convex.cloud`
- **SITE_URL**: Should match your frontend URL (`https://crm.barestack.org`)
- **Deployment**: Always deploy after making changes to Convex functions

## Files Updated

- `.env` - Updated `VITE_CONVEX_URL` to point to new cloud deployment
- `.env.example` - Updated example URL
- `index.tsx` - Updated fallback Convex URL
- `convex.json` - Fixed JSON formatting
- `convex/auth.config.ts` - Already correctly configured
- `convex/http.ts` - Already correctly configured
- `convex/schema.ts` - Already includes authTables

## Next Steps

1. ✅ Set environment variables on Convex Cloud (see Step 1)
2. ✅ Update Google OAuth redirect URIs (see Step 2)
3. ✅ Deploy to Convex Cloud (see Step 3)
4. ✅ Test sign-in flow (see Step 4)
