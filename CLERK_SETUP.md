# Clerk + Convex Setup Guide

## Error: "No JWT template exists with name: convex"

This error occurs because Clerk needs a JWT template configured for Convex authentication.

## Quick Fix Steps:

### 1. Create JWT Template in Clerk Dashboard

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **JWT Templates** in the left sidebar
3. Click **"New template"** or **"Create template"**
4. Name the template: `convex` (must match the `applicationID` in `convex/auth.config.ts`)
5. Configure the template:
   - **Token lifetime**: Set to your preference (default: 1 hour)
   - **Signing algorithm**: RS256 (default)
   - **Claims**: Add any custom claims you need
6. Click **"Create"** or **"Save"**

### 2. Verify Environment Variables

Make sure you have these in your `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 3. Get Your Clerk Issuer URL

Your Clerk Issuer URL is typically:
- Format: `https://[your-clerk-domain].clerk.accounts.dev`
- You can find it in Clerk Dashboard > API Keys > Issuer URL

### 4. Update auth.config.ts (if needed)

If your Clerk domain is different, update `convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

### 5. Redeploy/Restart

After creating the JWT template:
- Restart your Next.js dev server
- If using Convex cloud, the changes should be picked up automatically

## Verification

After setup, you should be able to:
- Sign in with Clerk
- Access Convex queries/mutations
- See user identity in Convex functions

## Troubleshooting

- **Still getting 404?** Make sure the template name exactly matches `applicationID` in auth.config.ts
- **Can't find JWT Templates?** Make sure you're on a Clerk plan that supports JWT templates (all paid plans do)
- **Issuer URL wrong?** Check Clerk Dashboard > API Keys for the correct URL


