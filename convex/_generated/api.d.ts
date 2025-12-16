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
import type * as audit from "../audit.js";
import type * as ceo from "../ceo.js";
import type * as contentDrafts from "../contentDrafts.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as lib_spec from "../lib/spec.js";
import type * as metrics from "../metrics.js";
import type * as onboarding from "../onboarding.js";
import type * as outreachCampaigns from "../outreachCampaigns.js";
import type * as profile from "../profile.js";
import type * as projects from "../projects.js";
import type * as scheduled from "../scheduled.js";
import type * as scheduledFunctions from "../scheduledFunctions.js";
import type * as settings from "../settings.js";
import type * as testIG from "../testIG.js";
import type * as users from "../users.js";
import type * as webhook from "../webhook.js";
import type * as websiteProjects from "../websiteProjects.js";

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
  audit: typeof audit;
  ceo: typeof ceo;
  contentDrafts: typeof contentDrafts;
  http: typeof http;
  leads: typeof leads;
  "lib/spec": typeof lib_spec;
  metrics: typeof metrics;
  onboarding: typeof onboarding;
  outreachCampaigns: typeof outreachCampaigns;
  profile: typeof profile;
  projects: typeof projects;
  scheduled: typeof scheduled;
  scheduledFunctions: typeof scheduledFunctions;
  settings: typeof settings;
  testIG: typeof testIG;
  users: typeof users;
  webhook: typeof webhook;
  websiteProjects: typeof websiteProjects;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
