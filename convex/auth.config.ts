// Clerk + Convex Auth Configuration
// 
// IMPORTANT: You must create a JWT template named "convex" in your Clerk Dashboard:
// 1. Go to https://dashboard.clerk.com
// 2. Navigate to JWT Templates
// 3. Create a new template named "convex"
// 4. Set token lifetime and save
//
// Set CLERK_ISSUER_URL in Convex: npx convex env set CLERK_ISSUER_URL "https://your-domain.clerk.accounts.dev"

export default {
  providers: [
    {
      // Use CLERK_ISSUER_URL env var set in Convex, or fallback to your domain
      domain: process.env.CLERK_ISSUER_URL || "https://nearby-hawk-34.clerk.accounts.dev",
      applicationID: "convex", // Must match JWT template name in Clerk Dashboard
    },
  ],
};
