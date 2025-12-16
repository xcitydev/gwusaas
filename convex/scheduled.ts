import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly metrics fetch (02:00 UTC)
crons.interval(
  "nightly-metrics",
  { hours: 24 },
  internal.scheduledFunctions.fetchNightlyMetrics
);

// Weekly insights (Monday 07:00 UTC)
crons.weekly(
  "weekly-insights",
  { dayOfWeek: "monday", hourUTC: 7, minuteUTC: 0 },
  internal.scheduledFunctions.generateWeeklyInsights
);

// Monthly reports (1st of month, 08:00 UTC)
crons.monthly(
  "monthly-reports",
  { day: 1, hourUTC: 8, minuteUTC: 0 },
  internal.scheduledFunctions.generateMonthlyReports
);

export default crons;

