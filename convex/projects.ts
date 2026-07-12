import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("projects").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Project name cannot be empty");

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();

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
    await requireUser(ctx);
    const newName = args.name.trim();
    if (!newName) throw new Error("Project name cannot be empty");

    const oldProject = await ctx.db.get(args.id);
    if (!oldProject) throw new Error("Project not found");

    // Check if new name already exists on another project
    if (newName !== oldProject.name) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_name", (q) => q.eq("name", newName))
        .unique();
      if (existing) {
        throw new Error("A project with that name already exists");
      }
    }

    // Tasks reference projects by id, so renaming is a single patch.
    await ctx.db.patch(args.id, {
      name: newName,
      description: args.description,
    });
  },
});
