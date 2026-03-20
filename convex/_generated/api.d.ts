/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as aiHistory from "../aiHistory.js";
import type * as audit from "../audit.js";
import type * as ceo from "../ceo.js";
import type * as clientWorkspace from "../clientWorkspace.js";
import type * as contentPipeline from "../contentPipeline.js";
import type * as ghl from "../ghl.js";
import type * as graphics from "../graphics.js";
import type * as leads from "../leads.js";
import type * as lib_spec from "../lib/spec.js";
import type * as metrics from "../metrics.js";
import type * as onboarding from "../onboarding.js";
import type * as outreachCampaigns from "../outreachCampaigns.js";
import type * as outreachWorkspace from "../outreachWorkspace.js";
import type * as profile from "../profile.js";
import type * as projects from "../projects.js";
import type * as scheduled from "../scheduled.js";
import type * as scheduledFunctions from "../scheduledFunctions.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as viralIdeas from "../viralIdeas.js";
import type * as waitlist from "../waitlist.js";
import type * as webhook from "../webhook.js";
import type * as websiteProjects from "../websiteProjects.js";
import type * as whitelabel from "../whitelabel.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiHistory: typeof aiHistory;
  audit: typeof audit;
  ceo: typeof ceo;
  clientWorkspace: typeof clientWorkspace;
  contentPipeline: typeof contentPipeline;
  ghl: typeof ghl;
  graphics: typeof graphics;
  leads: typeof leads;
  "lib/spec": typeof lib_spec;
  metrics: typeof metrics;
  onboarding: typeof onboarding;
  outreachCampaigns: typeof outreachCampaigns;
  outreachWorkspace: typeof outreachWorkspace;
  profile: typeof profile;
  projects: typeof projects;
  scheduled: typeof scheduled;
  scheduledFunctions: typeof scheduledFunctions;
  settings: typeof settings;
  users: typeof users;
  viralIdeas: typeof viralIdeas;
  waitlist: typeof waitlist;
  webhook: typeof webhook;
  websiteProjects: typeof websiteProjects;
  whitelabel: typeof whitelabel;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
