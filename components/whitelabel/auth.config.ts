// Tells Convex which JWTs to trust. The matching JWT template in your
// Clerk dashboard MUST be named "convex" — JWT Templates → New template →
// pick the Convex preset (or create a blank one and name it convex).
//
// CONVEX_AUTH_DOMAIN should be the value of NEXT_PUBLIC_CLERK_FRONTEND_API
// (the Clerk Frontend API URL — looks like https://your-app.clerk.accounts.dev).

export default {
  providers: [
    {
      domain: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API as string,
      applicationID: "convex",
    },
  ],
};
