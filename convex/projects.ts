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
