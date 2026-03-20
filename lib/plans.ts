export type Plan = "free" | "starter" | "growth" | "elite" | "white_label";

export const PLAN_ORDER: Plan[] = [
  "free",
  "starter",
  "growth",
  "elite",
  "white_label",
];

const PLAN_SET = new Set<Plan>(PLAN_ORDER);

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  elite: "Elite",
  white_label: "White Label",
};

const PLAN_SERVICE_IDS: Record<Plan, string[]> = {
  free: [],
  starter: [
    "ig-account-outreach",
    "cold-email-outreach",
    "email-sms-flows",
    "seo-audit-report",
    "keyword-research",
    "content-distribution",
    "social-tiktok",
    "social-linkedin",
    "social-twitter",
    "social-instagram",
    "social-facebook",
    "social-youtube",
    "social-discord",
    "social-spotify",
    "social-telegram",
    "social-reddit",
    "social-clubhouse",
    "social-threads",
    "social-twitch",
    "social-truth-social",
    "social-pinterest",
    "social-quora",
    "gwu-agency-full-course",
  ],
  growth: [
    "targeted-mass-dm",
    "digital-ads",
    "technical-seo",
    "onpage-offpage-backlinks",
    "competitor-analysis",
    "content-creation",
    "graphic-design",
    "targeted-data-scraping",
    "ai-services",
    "dfy-podcast-launch",
  ],
  elite: ["web-app-development", "community-dfy-buildout", "consulting"],
  white_label: ["dfy-white-label-agency"],
};

export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: PLAN_SERVICE_IDS.free,
  starter: [...PLAN_SERVICE_IDS.free, ...PLAN_SERVICE_IDS.starter],
  growth: [
    ...PLAN_SERVICE_IDS.free,
    ...PLAN_SERVICE_IDS.starter,
    ...PLAN_SERVICE_IDS.growth,
  ],
  elite: [
    ...PLAN_SERVICE_IDS.free,
    ...PLAN_SERVICE_IDS.starter,
    ...PLAN_SERVICE_IDS.growth,
    ...PLAN_SERVICE_IDS.elite,
  ],
  white_label: [
    ...PLAN_SERVICE_IDS.free,
    ...PLAN_SERVICE_IDS.starter,
    ...PLAN_SERVICE_IDS.growth,
    ...PLAN_SERVICE_IDS.elite,
    ...PLAN_SERVICE_IDS.white_label,
  ],
};

export function normalizePlan(plan: unknown): Plan {
  if (typeof plan !== "string") {
    return "free";
  }
  return PLAN_SET.has(plan as Plan) ? (plan as Plan) : "free";
}

export function hasAccess(userPlan: Plan, requiredPlan: Plan): boolean {
  return (
    PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan)
  );
}

export function hasAiAccess(userPlan: Plan): boolean {
  // AI features begin at starter (SEO audit / keywords).
  return hasAccess(userPlan, "starter");
}
