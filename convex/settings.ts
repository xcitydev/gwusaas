import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyOrgAccess, hasAdminOrManagerRole } from "./lib/spec";
import { encrypt } from "./lib/encryption";

/**
 * Set Instagram credentials (tokens/handles)
 * Note: In production, encrypt these before storing
 */
export const setIgCreds = mutation({
  args: {
    organizationId: v.id("organizations"),
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
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const settings = (org.settings as Record<string, any>) || {};
    const igSettings = settings.ig || {};

    // Update IG credentials (encrypt in production)
    if (args.instagramHandle !== undefined) {
      igSettings.instagramHandle = args.instagramHandle;
    }
    if (args.accessToken !== undefined) {
      igSettings.accessToken = await encrypt(args.accessToken);
    }
    if (args.metaAppId !== undefined) {
      igSettings.metaAppId = await encrypt(args.metaAppId);
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
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyOrgAccess(ctx, args.organizationId);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      plan: org.plan,
      settings: (org.settings as Record<string, any>) || {},
    };
  },
});

