import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { encrypt, decrypt } from "./lib/encryption";

/**
 * Inserts or updates a cached GHL contact using ghlContactId as the unique key.
 */
export const upsertGHLContact = mutation({
  args: {
    ghlContactId: v.string(),
    locationId: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    tags: v.array(v.string()),
    stage: v.optional(v.string()),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ghlContacts")
      .withIndex("by_ghl_contact_id", (q) => q.eq("ghlContactId", args.ghlContactId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        locationId: args.locationId,
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        tags: args.tags,
        stage: args.stage,
        lastSyncedAt: args.lastSyncedAt,
      });
      return existing._id;
    }

    return ctx.db.insert("ghlContacts", args);
  },
});

/**
 * Fetches cached GHL contacts for a location.
 */
export const getGHLContacts = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("ghlContacts")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .collect();
    return rows.sort((a, b) => b.lastSyncedAt - a.lastSyncedAt);
  },
});

/**
 * Adds an outreach activity record for a location/contact.
 */
export const logOutreachAction = mutation({
  args: {
    locationId: v.string(),
    contactId: v.string(),
    action: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("ghlOutreachLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Returns outreach activity records for a location ordered by latest first.
 */
export const getOutreachLog = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("ghlOutreachLog")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Saves a GHL location connection for a Clerk user.
 * Stores the API key encrypted at rest.
 */
export const saveGHLConnection = mutation({
  args: {
    clerkUserId: v.string(),
    locationId: v.string(),
    locationName: v.string(),
    apiKey: v.optional(v.string()),
    signupSource: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isActive = args.isActive ?? true;

    if (isActive) {
      const activeConnections = await ctx.db
        .query("ghlConnections")
        .withIndex("by_clerk_user_id_active", (q) =>
          q.eq("clerkUserId", args.clerkUserId).eq("isActive", true),
        )
        .collect();

      await Promise.all(
        activeConnections.map((connection) =>
          ctx.db.patch(connection._id, { isActive: false }),
        ),
      );
    }

    const encryptedApiKey = args.apiKey ? await encrypt(args.apiKey) : undefined;

    return ctx.db.insert("ghlConnections", {
      clerkUserId: args.clerkUserId,
      locationId: args.locationId,
      locationName: args.locationName,
      isActive,
      encryptedApiKey,
      signupSource: args.signupSource,
      createdAt: Date.now(),
    });
  },
});

/**
 * Gets the active GHL connection for a Clerk user.
 * NOTE: Returns the row including encryptedApiKey. Do not expose this directly to
 * client UIs — use getMyGHLConnectionPublic for client-safe data, or
 * getDecryptedGHLApiKey from server-only contexts that need to call GHL.
 */
export const getGHLConnection = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("ghlConnections")
      .withIndex("by_clerk_user_id_active", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("isActive", true),
      )
      .first();
  },
});

/**
 * Client-safe view of the active GHL connection (omits the encrypted API key).
 */
export const getMyGHLConnectionPublic = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("ghlConnections")
      .withIndex("by_clerk_user_id_active", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("isActive", true),
      )
      .first();

    if (!row) return null;

    return {
      _id: row._id,
      locationId: row.locationId,
      locationName: row.locationName,
      isActive: row.isActive,
      signupSource: row.signupSource,
      createdAt: row.createdAt,
      hasApiKey: Boolean(row.encryptedApiKey),
    };
  },
});

/**
 * Decrypts and returns the GHL API key for a user's active connection.
 * Server-only — call from API routes that need to talk to GHL on the user's behalf.
 */
export const getDecryptedGHLApiKey = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("ghlConnections")
      .withIndex("by_clerk_user_id_active", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("isActive", true),
      )
      .first();

    if (!row || !row.encryptedApiKey) return null;

    const apiKey = await decrypt(row.encryptedApiKey);
    return {
      apiKey,
      locationId: row.locationId,
      locationName: row.locationName,
    };
  },
});

/**
 * Disconnects (deactivates) all active GHL connections for a Clerk user.
 */
export const disconnectGHL = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const activeConnections = await ctx.db
      .query("ghlConnections")
      .withIndex("by_clerk_user_id_active", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("isActive", true),
      )
      .collect();

    await Promise.all(
      activeConnections.map((connection) =>
        ctx.db.patch(connection._id, { isActive: false }),
      ),
    );

    return { disconnected: activeConnections.length };
  },
});
