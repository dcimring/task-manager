import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const save = mutation({
  args: {
    _id: v.optional(v.id("tasks")),
    description: v.string(),
    project: v.string(),
    urgency: v.string(),
    status: v.string(),
    deadline: v.union(v.string(), v.null()),
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
        dateStarted,
        dateCompleted,
      });
      return _id;
    } else {
      const dateAdded = now;
      const dateStarted = data.status === "doing" || data.status === "done" ? now : null;
      const dateCompleted = data.status === "done" ? now : null;

      return await ctx.db.insert("tasks", {
        description: data.description,
        project: projectName,
        urgency: data.urgency,
        status: data.status,
        deadline: data.deadline,
        dateAdded,
        dateStarted,
        dateCompleted,
      });
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
  },
});
