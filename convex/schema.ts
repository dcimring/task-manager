import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    description: v.string(),
    project: v.string(),
    urgency: v.string(),
    status: v.string(),
    deadline: v.union(v.string(), v.null()),
    recurrence: v.optional(v.union(v.string(), v.null())),
    dateType: v.optional(v.union(v.string(), v.null())),
    dateAdded: v.string(),
    dateStarted: v.union(v.string(), v.null()),
    dateCompleted: v.union(v.string(), v.null()),
  }),
  projects: defineTable({
    name: v.string(),
    description: v.string(),
  }),
});
