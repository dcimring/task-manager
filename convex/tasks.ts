import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import {
  urgencyValidator,
  statusValidator,
  recurrenceValidator,
  dateTypeValidator,
} from "./schema";

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

function calculateNextDeadline(recurrence: string, currentDeadlineStr: string): string {
  const baseDate = new Date(currentDeadlineStr);
  if (recurrence === "weekly") {
    const nextDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextDate.toISOString();
  } else if (recurrence === "monthly") {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const day = baseDate.getUTCDate();

    let targetYear = year;
    let targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

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
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const now = new Date().toISOString();
    const { _id, ...data } = args;

    const projectId = await resolveProject(ctx, data.project);

    if (_id) {
      const existing = await ctx.db.get(_id);
      if (!existing) throw new Error("Task not found");

      let dateStarted = existing.dateStarted;
      let dateCompleted = existing.dateCompleted;

      if (data.status === "doing" && !existing.dateStarted) {
        dateStarted = now;
      }
      if (data.status === "done") {
        if (!existing.dateStarted) dateStarted = now;
        if (!existing.dateCompleted) dateCompleted = now;
      }

      await ctx.db.patch(_id, {
        description: data.description,
        projectId,
        urgency: data.urgency,
        status: data.status,
        deadline: data.deadline,
        recurrence: data.recurrence || null,
        dateType: data.dateType || null,
        dateStarted,
        dateCompleted,
      });

      // Clone task if completed and recurrence is configured with a deadline
      if (data.status === "done" && existing.status !== "done" && data.recurrence && data.deadline) {
        const nextDeadline = calculateNextDeadline(data.recurrence, data.deadline);
        await ctx.db.insert("tasks", {
          description: data.description,
          projectId,
          urgency: data.urgency,
          status: "todo",
          deadline: nextDeadline,
          recurrence: data.recurrence,
          dateType: existing.dateType || null,
          dateAdded: now,
          dateStarted: null,
          dateCompleted: null,
        });
      }

      return _id;
    } else {
      const dateAdded = now;
      const dateStarted = data.status === "doing" || data.status === "done" ? now : null;
      const dateCompleted = data.status === "done" ? now : null;

      const newTaskId = await ctx.db.insert("tasks", {
        description: data.description,
        projectId,
        urgency: data.urgency,
        status: data.status,
        deadline: data.deadline,
        recurrence: data.recurrence || null,
        dateType: data.dateType || null,
        dateAdded,
        dateStarted,
        dateCompleted,
      });

      if (data.status === "done" && data.recurrence && data.deadline) {
        const nextDeadline = calculateNextDeadline(data.recurrence, data.deadline);
        await ctx.db.insert("tasks", {
          description: data.description,
          projectId,
          urgency: data.urgency,
          status: "todo",
          deadline: nextDeadline,
          recurrence: data.recurrence,
          dateType: data.dateType || null,
          dateAdded: now,
          dateStarted: null,
          dateCompleted: null,
        });
      }

      return newTaskId;
    }
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

    let dateStarted = existing.dateStarted;
    let dateCompleted = existing.dateCompleted;

    if (args.status === "doing" && !dateStarted) {
      dateStarted = now;
    }
    if (args.status === "done") {
      if (!dateStarted) dateStarted = now;
      if (!dateCompleted) dateCompleted = now;
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      dateStarted,
      dateCompleted,
    });

    // Check recurrence and generate next task
    if (args.status === "done" && existing.status !== "done" && existing.recurrence && existing.deadline) {
      const nextDeadline = calculateNextDeadline(existing.recurrence, existing.deadline);
      await ctx.db.insert("tasks", {
        description: existing.description,
        projectId: existing.projectId,
        urgency: existing.urgency,
        status: "todo",
        deadline: nextDeadline,
        recurrence: existing.recurrence,
        dateType: existing.dateType || null,
        dateAdded: now,
        dateStarted: null,
        dateCompleted: null,
      });
    }
  },
});
