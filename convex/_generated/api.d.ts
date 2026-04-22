/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiHistory from "../aiHistory.js";
import type * as analytics from "../analytics.js";
import type * as approvals from "../approvals.js";
import type * as audit from "../audit.js";
import type * as ceo from "../ceo.js";
import type * as clientWorkspace from "../clientWorkspace.js";
import type * as contentDrafts from "../contentDrafts.js";
import type * as contentPipeline from "../contentPipeline.js";
import type * as dealsWorkspace from "../dealsWorkspace.js";
import type * as ghl from "../ghl.js";
import type * as graphics from "../graphics.js";
import type * as leads from "../leads.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_spec from "../lib/spec.js";
import type * as mediaGenerations from "../mediaGenerations.js";
import type * as metrics from "../metrics.js";
import type * as onboarding from "../onboarding.js";
import type * as organization from "../organization.js";
import type * as outreachCampaigns from "../outreachCampaigns.js";
import type * as profile from "../profile.js";
import type * as projects from "../projects.js";
import type * as referrals from "../referrals.js";
import type * as scheduled from "../scheduled.js";
import type * as scheduledFunctions from "../scheduledFunctions.js";
import type * as settings from "../settings.js";
import type * as support from "../support.js";
import type * as usage from "../usage.js";
import type * as userApiKeys from "../userApiKeys.js";
import type * as users from "../users.js";
import type * as videoProjects from "../videoProjects.js";
import type * as viralWorkspace from "../viralWorkspace.js";
import type * as waitlist from "../waitlist.js";
import type * as webhook from "../webhook.js";
import type * as websiteProjects from "../websiteProjects.js";
import type * as whitelabel from "../whitelabel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiHistory: typeof aiHistory;
  analytics: typeof analytics;
  approvals: typeof approvals;
  audit: typeof audit;
  ceo: typeof ceo;
  clientWorkspace: typeof clientWorkspace;
  contentDrafts: typeof contentDrafts;
  contentPipeline: typeof contentPipeline;
  dealsWorkspace: typeof dealsWorkspace;
  ghl: typeof ghl;
  graphics: typeof graphics;
  leads: typeof leads;
  "lib/encryption": typeof lib_encryption;
  "lib/spec": typeof lib_spec;
  mediaGenerations: typeof mediaGenerations;
  metrics: typeof metrics;
  onboarding: typeof onboarding;
  organization: typeof organization;
  outreachCampaigns: typeof outreachCampaigns;
  profile: typeof profile;
  projects: typeof projects;
  referrals: typeof referrals;
  scheduled: typeof scheduled;
  scheduledFunctions: typeof scheduledFunctions;
  settings: typeof settings;
  support: typeof support;
  usage: typeof usage;
  userApiKeys: typeof userApiKeys;
  users: typeof users;
  videoProjects: typeof videoProjects;
  viralWorkspace: typeof viralWorkspace;
  waitlist: typeof waitlist;
  webhook: typeof webhook;
  websiteProjects: typeof websiteProjects;
  whitelabel: typeof whitelabel;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
