import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("contentPlanUploads", {
      clerkUserId: identity.subject,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      note: args.note,
      createdAt: Date.now(),
    });
    return { uploadId: id };
  },
});

export const listMyUploads = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = await ctx.db
      .query("contentPlanUploads")
      .withIndex("by_clerk_user_id_created_at", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .order("desc")
      .take(100);

    return await Promise.all(
      rows.map(async (r) => ({
        _id: r._id,
        filename: r.filename,
        mimeType: r.mimeType,
        size: r.size,
        note: r.note,
        createdAt: r.createdAt,
        url: await ctx.storage.getUrl(r.storageId),
      }))
    );
  },
});

export const deleteUpload = mutation({
  args: { uploadId: v.id("contentPlanUploads") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const row = await ctx.db.get(args.uploadId);
    if (!row || row.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(args.uploadId);
    return { success: true };
  },
});

export const savePlan = mutation({
  args: {
    weekStartDate: v.string(),
    brandName: v.optional(v.string()),
    niche: v.optional(v.string()),
    brandVoice: v.optional(v.string()),
    uploadIds: v.array(v.id("contentPlanUploads")),
    plan: v.any(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const planId = await ctx.db.insert("contentPlans", {
      clerkUserId: identity.subject,
      weekStartDate: args.weekStartDate,
      brandName: args.brandName,
      niche: args.niche,
      brandVoice: args.brandVoice,
      uploadIds: args.uploadIds,
      plan: args.plan,
      status: args.status,
      createdAt: Date.now(),
    });
    return { planId };
  },
});

export const listMyPlans = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = await ctx.db
      .query("contentPlans")
      .withIndex("by_clerk_user_id_created_at", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .order("desc")
      .take(args.limit ?? 25);

    return rows.map((r) => ({
      _id: r._id,
      weekStartDate: r.weekStartDate,
      brandName: r.brandName,
      uploadIds: r.uploadIds,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },
});

export const getPlan = query({
  args: { planId: v.id("contentPlans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.clerkUserId !== identity.subject) return null;

    const uploads = await Promise.all(
      plan.uploadIds.map(async (id) => {
        const u = await ctx.db.get(id);
        if (!u) return null;
        return {
          _id: u._id,
          filename: u.filename,
          mimeType: u.mimeType,
          note: u.note,
          url: await ctx.storage.getUrl(u.storageId),
        };
      })
    );

    return { ...plan, uploads: uploads.filter(Boolean) };
  },
});

export const deletePlan = mutation({
  args: { planId: v.id("contentPlans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.planId);
    return { success: true };
  },
});
