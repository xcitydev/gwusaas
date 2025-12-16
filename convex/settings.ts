import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyOrgAccess, hasAdminOrManagerRole } from "./lib/spec";

/**
 * Set Instagram credentials (tokens/handles)
 * Note: In production, encrypt these before storing
 */
export const setIgCreds = mutation({
  args: {
    organizationId: v.id("organization"),
    instagramHandle: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    metaAppId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify access (admin or manager)
    const access = await verifyOrgAccess(ctx, args.organizationId);
    
    if (!hasAdminOrManagerRole(access.profile.role)) {
      throw new Error("Unauthorized: Admin or manager role required");
    }

    // Get or create settings
    const org = await ctx.db.get(args.organizationId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    const settings = org.settings || {};
    const igSettings = settings.ig || {};

    // Update IG credentials
    if (args.instagramHandle !== undefined) {
      igSettings.instagramHandle = args.instagramHandle;
    }
    if (args.accessToken !== undefined) {
      igSettings.accessToken = args.accessToken;
    }
    if (args.metaAppId !== undefined) {
      igSettings.metaAppId = args.metaAppId;
    }

    settings.ig = igSettings;

    await ctx.db.patch(args.organizationId as any, {
      settings,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get organization settings
 */
export const get = query({
  args: {
    organizationId: v.id("organization"),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyOrgAccess(ctx, args.organizationId);

    const org = await ctx.db.get(args.organizationId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      plan: org.plan,
      settings: org.settings || {},
    };
  },
});

