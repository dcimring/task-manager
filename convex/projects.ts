import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw new Error("Project name cannot be empty");

    const existing = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("name"), name))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("projects", {
      name,
      description: args.description,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const newName = args.name.trim();
    if (!newName) throw new Error("Project name cannot be empty");

    const oldProject = await ctx.db.get(args.id);
    if (!oldProject) throw new Error("Project not found");

    const oldName = oldProject.name;

    // Check if new name already exists on another project
    if (newName !== oldName) {
      const existing = await ctx.db
        .query("projects")
        .filter((q) => q.eq(q.field("name"), newName))
        .first();
      if (existing) {
        throw new Error("A project with that name already exists");
      }
    }

    // Update the project details
    await ctx.db.patch(args.id, {
      name: newName,
      description: args.description,
    });

    // If the name changed, update all tasks associated with this project
    if (newName !== oldName) {
      const tasksToUpdate = await ctx.db
        .query("tasks")
        .filter((q) => q.eq(q.field("project"), oldName))
        .collect();

      for (const task of tasksToUpdate) {
        await ctx.db.patch(task._id, {
          project: newName,
        });
      }
    }
  },
});
