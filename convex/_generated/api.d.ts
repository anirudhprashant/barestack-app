/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crm from "../crm.js";
import type * as dashboard from "../dashboard.js";
import type * as expenses from "../expenses.js";
import type * as invoices from "../invoices.js";
import type * as projects from "../projects.js";
import type * as seedData from "../seedData.js";
import type * as timeTracking from "../timeTracking.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crm: typeof crm;
  dashboard: typeof dashboard;
  expenses: typeof expenses;
  invoices: typeof invoices;
  projects: typeof projects;
  seedData: typeof seedData;
  timeTracking: typeof timeTracking;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
