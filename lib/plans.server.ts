import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { normalizePlan, type Plan } from "@/lib/plans";

export async function getUserPlan(userId: string): Promise<Plan> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return normalizePlan(user.publicMetadata.plan);
}
