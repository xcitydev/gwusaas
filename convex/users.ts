import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUser = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    return {
      user: {
        onboardingCompleted: user?.onboardingCompleted || false,
      },
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    companyName: v.string(),
    industry: v.string(),
    website: v.string(),
    companySize: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      onboardingCompleted: true,
      profile: {
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
      },
      companyDetails: {
        companyName: args.companyName,
        industry: args.industry,
        website: args.website,
        companySize: args.companySize,
      },
      location: {
        address: args.address,
        city: args.city,
        state: args.state,
        zipCode: args.zipCode,
      },
    });

    return {
      success: true,
    };
  },
});
