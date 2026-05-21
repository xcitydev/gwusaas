import { query } from "./_generated/server";

/**
 * What the dashboard's "Needs Attention" panel renders. Each alert has a
 * stable id (so the UI can key by it), a short user-facing message, an
 * optional href to send the user where the issue lives, and a severity
 * for color coding.
 */
export type DashboardAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  href?: string;
  cta?: string;
};

/**
 * Real-time signals the dashboard cares about. All read from the current
 * authenticated user's data — no client-id arg needed. Returns an empty
 * array when everything's healthy so the panel can render the "all clear"
 * state.
 */
export const get = query({
  args: {},
  handler: async (ctx): Promise<DashboardAlert[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const clerkUserId = identity.subject;
    const alerts: DashboardAlert[] = [];

    // 1) Onboarding incomplete — block on this first since it gates other
    // features.
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
    if (profile && profile.onboardingCompleted === false) {
      alerts.push({
        id: "onboarding-incomplete",
        severity: "critical",
        title: "Finish setting up your account",
        href: "/onboarding",
        cta: "Finish setup",
      });
    }

    // 2) No active GoHighLevel connection. Without this, inbox, voice
    // replies, and automations can't read or send messages.
    const ghl = await ctx.db
      .query("ghlConnections")
      .withIndex("by_clerk_user_id_active", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("isActive", true),
      )
      .first();
    if (!ghl) {
      alerts.push({
        id: "ghl-not-connected",
        severity: "warning",
        title: "Connect GoHighLevel to power your inbox and replies",
        href: "/dashboard/settings",
        cta: "Connect now",
      });
    } else if (!ghl.encryptedApiKey) {
      // Connected but no API key stored — older row that needs migration.
      alerts.push({
        id: "ghl-missing-api-key",
        severity: "warning",
        title: "Add your GoHighLevel API key to enable AI replies",
        href: "/dashboard/settings",
        cta: "Add key",
      });
    }

    // 3) Pending AI drafts in approval mode — surface so the user knows
    // there are replies waiting for their tap.
    const pendingDrafts = await ctx.db
      .query("automationDrafts")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const pendingCount = pendingDrafts.filter(
      (d) => d.status === "pending",
    ).length;
    if (pendingCount > 0) {
      alerts.push({
        id: "automation-drafts-pending",
        severity: "info",
        title:
          pendingCount === 1
            ? "1 AI draft is waiting for your review"
            : `${pendingCount} AI drafts are waiting for your review`,
        href: "/dashboard/conversations",
        cta: "Review",
      });
    }

    // 4) Outreach campaigns currently paused. Often paused for a reason
    // (account flagged, account info needed, ops paused), so we surface
    // them as something to look at.
    const outreachCampaigns = await ctx.db
      .query("outreachCampaign")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const pausedCampaigns = outreachCampaigns.filter(
      (c) => c.status === "paused",
    );
    if (pausedCampaigns.length > 0) {
      alerts.push({
        id: "outreach-paused",
        severity: "warning",
        title:
          pausedCampaigns.length === 1
            ? `Outreach campaign "${pausedCampaigns[0].instagramUsername || pausedCampaigns[0].campaignType || "—"}" is paused`
            : `${pausedCampaigns.length} outreach campaigns are paused`,
        href: "/dashboard/outreach",
        cta: "View",
      });
    }

    // 5) Outreach campaigns still in "setup" status. Means the user has
    // launched a campaign but our team hasn't activated it yet — not
    // really an error, but worth surfacing.
    const inSetupCampaigns = outreachCampaigns.filter(
      (c) => c.status === "setup",
    );
    if (inSetupCampaigns.length > 0 && outreachCampaigns.length > 0) {
      // Only show this if NOTHING is currently active — otherwise it's
      // noise (they're already running outreach, the setup ones are
      // queued).
      const hasActive = outreachCampaigns.some(
        (c) => c.status === "active" || c.status === "running",
      );
      if (!hasActive) {
        alerts.push({
          id: "outreach-setup-pending",
          severity: "info",
          title:
            inSetupCampaigns.length === 1
              ? "Your outreach campaign is being set up by our team"
              : `${inSetupCampaigns.length} outreach campaigns are being set up`,
          href: "/dashboard/outreach",
          cta: "View",
        });
      }
    }

    // 6) Automation runs that hit their reply cap. The AI stopped sending,
    // so the lead may be stalled waiting for a human reply.
    const cappedRuns = await ctx.db
      .query("automationRuns")
      .withIndex("by_clerk_user_id_status", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("status", "running"),
      )
      .collect();
    const rules = await ctx.db
      .query("automations")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const rulesById = new Map(rules.map((r) => [r._id, r]));
    const stalled = cappedRuns.filter((run) => {
      const rule = rulesById.get(run.automationId);
      return rule && run.replyCount >= rule.maxRepliesPerThread;
    });
    if (stalled.length > 0) {
      alerts.push({
        id: "automation-runs-capped",
        severity: "warning",
        title:
          stalled.length === 1
            ? "1 automated conversation hit its reply cap — needs a human"
            : `${stalled.length} automated conversations hit their reply cap`,
        href: "/dashboard/conversations",
        cta: "Open inbox",
      });
    }

    return alerts;
  },
});
