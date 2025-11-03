# Deployment Checklist: Google OAuth Fix

## Problem Summary
The application was experiencing a "Server Error" when clicking "Sign in with Google" because:
1. Frontend was pointing to the old self-hosted Convex URL (`https://backendconvex.barestack.org`)
2. Environment variables were not set on the new Convex Cloud deployment
3. Google OAuth redirect URIs needed to be updated for the new cloud deployment

## ✅ Code Changes Made

The following files have been updated to use the new Convex Cloud deployment:

1. **`.env`** - Updated `VITE_CONVEX_URL` to `https://trustworthy-cat-479.convex.cloud`
2. **`.env.example`** - Updated example URL to match
3. **`index.tsx`** - Updated fallback Convex URL
4. **`convex.json`** - Fixed JSON formatting
5. **Documentation Updated**:
   - `GOOGLE_AUTH_SETUP.md` - Updated with cloud deployment instructions
   - `IMPLEMENTATION_SUMMARY.md` - Updated deployment commands
   - `OAUTH_FIX_SUMMARY.md` - Updated URLs and flow diagram
   - `README.md` - Updated all references to use cloud deployment
   - **NEW**: `CLOUD_DEPLOYMENT_SETUP.md` - Comprehensive deployment guide

## 🚨 REQUIRED ACTIONS (Must be done by deployment owner)

### 1. Set Environment Variables on Convex Cloud ⚠️ CRITICAL

You **MUST** set these environment variables on the Convex Cloud deployment for authentication to work:

**Option A: Via Convex Dashboard (Recommended)**
1. Go to: https://dashboard.convex.dev
2. Select your deployment: `trustworthy-cat-479`
3. Navigate to Settings → Environment Variables
4. Add these variables:
   ```
   AUTH_GOOGLE_ID=738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=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
   SITE_URL=https://crm.barestack.org
   ```

**Option B: Via CLI**
```bash
npx convex env set AUTH_GOOGLE_ID "738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com" --prod
npx convex env set AUTH_GOOGLE_SECRET "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" --prod
npx convex env set SITE_URL "https://crm.barestack.org" --prod
```

### 2. Update Google OAuth Redirect URIs ⚠️ CRITICAL

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth 2.0 Client: `738445027256-sjpha7ge93guf3c8cnhm9i7g7lobr0a9.apps.googleusercontent.com`
3. Click Edit
4. Under "Authorized redirect URIs", add:
   ```
   https://trustworthy-cat-479.convex.site/api/auth/callback/google
   ```
   **Note**: Use `.convex.site` (for HTTP actions), NOT `.convex.cloud`

5. Keep existing URIs if needed:
   - `https://crm.barestack.org/auth/callback` (optional)

6. Click Save

### 3. Deploy Convex Functions

Deploy the backend functions to Convex Cloud:

```bash
cd /home/engine/project
npx convex deploy --prod
```

### 4. Test the OAuth Flow

1. Open: https://crm.barestack.org
2. Click "Sign in with Google"
3. Expected flow:
   - Redirects to Google OAuth consent screen
   - After consent, redirects back to app
   - User is authenticated and sees dashboard

## 🔍 Verification Steps

### Check Environment Variables
```bash
# List all environment variables on the deployment
npx convex env list --prod
```

Expected output should include:
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `SITE_URL`

### Check Convex Logs
If sign-in fails, check the logs:
1. Go to: https://dashboard.convex.dev/deployment/trustworthy-cat-479/logs
2. Filter for "auth:signIn" or "Server Error"
3. Look for specific error messages about missing environment variables

### Check Browser Network Tab
1. Open browser DevTools → Network tab
2. Click "Sign in with Google"
3. Look for:
   - Initial request to Convex
   - Redirect to Google
   - Callback to `.convex.site`
   - Final redirect back to app

## 🐛 Troubleshooting

### Error: "Server Error" from auth:signIn
**Cause**: Missing environment variables on Convex deployment
**Fix**: Complete Step 1 above

### Error: "redirect_uri_mismatch" from Google
**Cause**: Redirect URI not registered in Google Cloud Console
**Fix**: Complete Step 2 above

### Error: "Provider google is not configured"
**Cause**: Convex functions not deployed or auth.config.ts has issues
**Fix**: Run `npx convex deploy --prod` and check `convex/auth.config.ts`

### Error: Missing JWT_PRIVATE_KEY
**Cause**: Convex generates this automatically, but may need manual configuration
**Fix**: Check Convex documentation for JWT key generation

## 📋 File Changes Summary

```
Modified:
  .env                           - Updated Convex URL
  .env.example                   - Updated Convex URL
  index.tsx                      - Updated fallback URL
  convex.json                    - Fixed JSON syntax
  GOOGLE_AUTH_SETUP.md          - Updated for cloud deployment
  IMPLEMENTATION_SUMMARY.md     - Updated deployment commands
  OAUTH_FIX_SUMMARY.md          - Updated URLs and flow
  README.md                      - Updated all deployment references

Added:
  CLOUD_DEPLOYMENT_SETUP.md     - Comprehensive deployment guide
  DEPLOYMENT_CHECKLIST.md       - This file
```

## ✅ Acceptance Criteria Status

- ✅ Identified root cause: Old Convex URL + missing env vars
- ✅ Updated frontend to point to new cloud deployment
- ✅ Updated all documentation
- ✅ TypeScript compilation passes
- ⏳ Environment variables need to be set (Step 1)
- ⏳ Google OAuth redirect URIs need to be updated (Step 2)
- ⏳ Convex deployment needed (Step 3)
- ⏳ OAuth flow testing needed (Step 4)

## 🎯 Next Steps

1. **CRITICAL**: Set environment variables on Convex Cloud (see Step 1)
2. **CRITICAL**: Update Google OAuth redirect URIs (see Step 2)
3. Deploy Convex functions (see Step 3)
4. Test the sign-in flow (see Step 4)
5. Monitor logs for any errors

After completing these steps, Google OAuth sign-in should work correctly!
