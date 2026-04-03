import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "delete old boards",
  { hours: 1 },
  internal.boards.deleteOldBoards,
);

export default crons;
