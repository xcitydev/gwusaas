import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    onboardingCompleted: v.boolean(),
    profile: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
    })),
    companyDetails: v.optional(v.object({
      companyName: v.string(),
      industry: v.string(),
      website: v.string(),
      companySize: v.string(),
    })),
    location: v.optional(v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
    })),
    ghl: v.optional(v.object({
      subAccountId: v.string(),
      subAccountLocation: v.string(),
    })),
    // other user fields
  }).index("by_clerk_id", ["clerkUserId"]),
});
