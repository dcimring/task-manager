import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

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
    urgency: v.string(),
    status: v.string(),
    deadline: v.union(v.string(), v.null()),
    recurrence: v.optional(v.union(v.string(), v.null())),
    dateType: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { _id, ...data } = args;

    // Ensure the project exists
    const projectName = data.project.trim() || "General";
    const existingProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("name"), projectName))
      .first();

    if (!existingProject) {
      await ctx.db.insert("projects", {
        name: projectName,
        description: "",
      });
    }

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
        project: projectName,
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
          project: projectName,
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
        project: projectName,
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
          project: projectName,
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
    await ctx.db.delete(args.id);
  },
});

export const moveStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
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
        project: existing.project,
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
