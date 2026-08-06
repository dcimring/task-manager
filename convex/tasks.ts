import { mutation, query, MutationCtx } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireUser } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import {
  urgencyValidator,
  statusValidator,
  recurrenceValidator,
  dateTypeValidator,
} from "./schema";

type Status = Infer<typeof statusValidator>;
type Recurrence = Infer<typeof recurrenceValidator>;
type DateType = Infer<typeof dateTypeValidator>;

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const [tasks, projects] = await Promise.all([
      ctx.db.query("tasks").collect(),
      ctx.db.query("projects").collect(),
    ]);
    const nameById = new Map(projects.map((p) => [p._id, p.name]));
    // Join the project name in so clients can keep working with names.
    return tasks.map((t) => ({
      ...t,
      project: (t.projectId && nameById.get(t.projectId)) || "General",
    }));
  },
});

// Finds a project by name, creating it if needed. Names are unique via by_name.
async function resolveProject(
  ctx: MutationCtx,
  rawName: string,
): Promise<Id<"projects">> {
  const name = rawName.trim() || "General";
  const existing = await ctx.db
    .query("projects")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert("projects", { name, description: "" });
}

// `intervals` occurrences after `baseDeadlineStr`. Always measured from the
// given base rather than by repeated single steps, so clamping can't
// accumulate: Jan 31 + 7 months is Aug 31, not Aug 28 (which is what stepping
// through February one month at a time would give).
function addRecurrenceIntervals(
  recurrence: string,
  baseDeadlineStr: string,
  intervals: number,
): string {
  const baseDate = new Date(baseDeadlineStr);
  if (recurrence === "weekly") {
    const nextDate = new Date(baseDate.getTime() + intervals * 7 * 24 * 60 * 60 * 1000);
    return nextDate.toISOString();
  } else if (recurrence === "monthly" || recurrence === "yearly") {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const day = baseDate.getUTCDate();
    const monthsToAdd = (recurrence === "yearly" ? 12 : 1) * intervals;

    const targetYear = year + Math.floor((month + monthsToAdd) / 12);
    const targetMonth = (month + monthsToAdd) % 12;

    // Clamp to the last valid day of the target month (Jan 31 -> Feb 28,
    // Feb 29 -> Feb 28 on a non-leap year).
    const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const finalDay = Math.min(day, maxDays);

    const nextDate = new Date(Date.UTC(
      targetYear,
      targetMonth,
      finalDay,
      baseDate.getUTCHours(),
      baseDate.getUTCMinutes(),
      baseDate.getUTCSeconds(),
      baseDate.getUTCMilliseconds()
    ));
    return nextDate.toISOString();
  }
  throw new Error(`Unsupported recurrence type: ${recurrence}`);
}

function calculateNextDeadline(recurrence: string, currentDeadlineStr: string): string {
  return addRecurrenceIntervals(recurrence, currentDeadlineStr, 1);
}

// A recurring task created with an already-past deadline should start at its
// next future occurrence rather than firing a reminder straight away — a
// yearly task added in August for "24 Jul" means next year's 24 Jul.
// Deliberately distinct from the catch-up semantics in `computeStatusUpdate`
// (see IMPROVEMENTS.md #3), which advances an existing *completed* task by
// exactly one interval even when that lands in the past.
function advanceToFutureOccurrence(
  recurrence: Recurrence,
  deadline: string,
  today: string,
): string {
  let next = deadline;
  // Bounded purely as a runaway guard; each step moves strictly forward, and
  // 1000 weekly intervals is ~19 years of backdating.
  for (let i = 1; i <= 1000 && next.slice(0, 10) < today; i++) {
    next = addRecurrenceIntervals(recurrence, deadline, i);
  }
  return next;
}

type RecurrenceClone = {
  deadline: string;
  recurrence: Recurrence;
  dateType: DateType | null;
  dateAdded: string;
  dateStarted: null;
  dateCompleted: null;
  status: "todo";
};

// Shared by `save` and `moveStatus`: derives dateStarted/dateCompleted for a
// status transition, and — if the transition just completed a recurring
// task — the next clone to insert. Computes (and validates) everything
// up front so a bad recurrence/deadline throws before any db writes happen,
// rather than after the task has already been patched to done.
function computeStatusUpdate(args: {
  previousStatus: Status | null;
  newStatus: Status;
  previousDateStarted: string | null;
  previousDateCompleted: string | null;
  recurrence: Recurrence | null;
  dateType: DateType | null;
  deadline: string | null;
  now: string;
}): {
  dateStarted: string | null;
  dateCompleted: string | null;
  recurrenceClone: RecurrenceClone | null;
} {
  let dateStarted = args.previousDateStarted;
  let dateCompleted = args.previousDateCompleted;

  if (args.newStatus === "doing" && !dateStarted) {
    dateStarted = args.now;
  }
  if (args.newStatus === "done") {
    if (!dateStarted) dateStarted = args.now;
    if (!dateCompleted) dateCompleted = args.now;
  }

  let recurrenceClone: RecurrenceClone | null = null;
  const justCompleted = args.newStatus === "done" && args.previousStatus !== "done";
  if (justCompleted && args.recurrence && args.deadline) {
    // Catch-up semantics: the next deadline is always the old deadline plus
    // one interval, even if that lands in the past for a task completed
    // long after it was due. (Deliberate choice — see IMPROVEMENTS.md #3.)
    const nextDeadline = calculateNextDeadline(args.recurrence, args.deadline);
    recurrenceClone = {
      deadline: nextDeadline,
      recurrence: args.recurrence,
      dateType: args.dateType,
      dateAdded: args.now,
      dateStarted: null,
      dateCompleted: null,
      status: "todo",
    };
  }

  return { dateStarted, dateCompleted, recurrenceClone };
}

export const save = mutation({
  args: {
    _id: v.optional(v.id("tasks")),
    description: v.string(),
    project: v.string(),
    urgency: urgencyValidator,
    status: statusValidator,
    deadline: v.union(v.string(), v.null()),
    recurrence: v.optional(v.union(recurrenceValidator, v.null())),
    dateType: v.optional(v.union(dateTypeValidator, v.null())),
    // The client's local date (YYYY-MM-DD). "Already passed" is judged
    // against the user's day, not the server's UTC day, so a task added
    // just after local midnight doesn't skip an occurrence.
    today: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const now = new Date().toISOString();
    const { _id, today, ...data } = args;
    const recurrence = data.recurrence || null;
    const dateType = data.dateType || null;

    const existing = _id ? await ctx.db.get(_id) : null;
    if (_id && !existing) throw new Error("Task not found");

    // Only on create — editing an existing task keeps the date as typed.
    const deadline =
      !existing && recurrence && data.deadline
        ? advanceToFutureOccurrence(recurrence, data.deadline, today || now.slice(0, 10))
        : data.deadline;

    // Validates recurrence/deadline (throws on a bad value) before any
    // write below happens.
    const { dateStarted, dateCompleted, recurrenceClone } = computeStatusUpdate({
      previousStatus: existing?.status ?? null,
      newStatus: data.status,
      previousDateStarted: existing?.dateStarted ?? null,
      previousDateCompleted: existing?.dateCompleted ?? null,
      recurrence,
      dateType,
      deadline,
      now,
    });

    const projectId = await resolveProject(ctx, data.project);

    let taskId: Id<"tasks">;
    if (_id) {
      await ctx.db.patch(_id, {
        description: data.description,
        projectId,
        urgency: data.urgency,
        status: data.status,
        deadline,
        recurrence,
        dateType,
        dateStarted,
        dateCompleted,
      });
      taskId = _id;
    } else {
      taskId = await ctx.db.insert("tasks", {
        description: data.description,
        projectId,
        urgency: data.urgency,
        status: data.status,
        deadline,
        recurrence,
        dateType,
        dateAdded: now,
        dateStarted,
        dateCompleted,
      });
    }

    if (recurrenceClone) {
      await ctx.db.insert("tasks", {
        description: data.description,
        projectId,
        urgency: data.urgency,
        ...recurrenceClone,
      });
    }

    return taskId;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    await ctx.db.delete(args.id);
  },
});

export const moveStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const now = new Date().toISOString();
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Task not found");

    // Validates recurrence/deadline (throws on a bad value) before the
    // patch below happens.
    const { dateStarted, dateCompleted, recurrenceClone } = computeStatusUpdate({
      previousStatus: existing.status,
      newStatus: args.status,
      previousDateStarted: existing.dateStarted,
      previousDateCompleted: existing.dateCompleted,
      recurrence: existing.recurrence || null,
      dateType: existing.dateType || null,
      deadline: existing.deadline,
      now,
    });

    await ctx.db.patch(args.id, {
      status: args.status,
      dateStarted,
      dateCompleted,
    });

    if (recurrenceClone) {
      await ctx.db.insert("tasks", {
        description: existing.description,
        projectId: existing.projectId,
        urgency: existing.urgency,
        ...recurrenceClone,
      });
    }
  },
});
