import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { getAuth } from "@clerk/nextjs/server";

/**
 * Get the current user's Clerk ID from the auth context
 */
export async function getCurrentUserId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Get the user's profile from Convex by Clerk user ID
 */
export async function getCurrentUserProfile(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ _id: string; clerkUserId: string; role: string } | null> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) return null;

  const profile = await ctx.db
    .query("profile")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
    .first();

  if (!profile) return null;

  return {
    _id: profile._id,
    clerkUserId: profile.clerkUserId,
    role: profile.role || "client",
  };
}

/**
 * Verify user is authenticated
 */
export async function verifyUserAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ profile: { _id: string; clerkUserId: string; role: string } }> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: No user session");
  }

  const profile = await ctx.db
    .query("profile")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
    .first();

  if (!profile) {
    throw new Error("Unauthorized: User profile not found");
  }

  return {
    profile: {
      _id: profile._id,
      clerkUserId: profile.clerkUserId,
      role: profile.role || "client",
    },
  };
}

/**
 * Verify user has access to a project (must be the owner)
 */
export async function verifyProjectAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  projectId: string
): Promise<{ profile: { _id: string; clerkUserId: string; role: string }; project: { _id: string; clerkUserId: string } }> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: No user session");
  }

  const project = await ctx.db.get(projectId as any);
  if (!project) {
    throw new Error("Project not found");
  }

  // Verify user owns this project
  if (project.clerkUserId !== userId) {
    throw new Error("Unauthorized: You don't have access to this project");
  }

  const profile = await ctx.db
    .query("profile")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
    .first();

  if (!profile) {
    throw new Error("Unauthorized: User profile not found");
  }

  return {
    profile: {
      _id: profile._id,
      clerkUserId: profile.clerkUserId,
      role: profile.role || "client",
    },
    project: {
      _id: project._id,
      clerkUserId: project.clerkUserId,
    },
  };
}

/**
 * Verify user has access to a website project (must be the owner)
 */
export async function verifyWebsiteProjectAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  projectId: string
): Promise<{ profile: { _id: string; clerkUserId: string; role: string }; project: { _id: string; clerkUserId: string } }> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: No user session");
  }

  const project = await ctx.db.get(projectId as any);
  if (!project) {
    throw new Error("Website project not found");
  }

  // Verify user owns this project
  if (project.clerkUserId !== userId) {
    throw new Error("Unauthorized: You don't have access to this project");
  }

  const profile = await ctx.db
    .query("profile")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
    .first();

  if (!profile) {
    throw new Error("Unauthorized: User profile not found");
  }

  return {
    profile: {
      _id: profile._id,
      clerkUserId: profile.clerkUserId,
      role: profile.role || "client",
    },
    project: {
      _id: project._id,
      clerkUserId: project.clerkUserId,
    },
  };
}

/**
 * Check if user has admin or manager role
 */
export function hasAdminOrManagerRole(role: string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if user has admin role
 */
export function hasAdminRole(role: string): boolean {
  return role === "admin";
}

