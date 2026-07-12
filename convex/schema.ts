import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const urgencyValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

export const statusValidator = v.union(
  v.literal("todo"),
  v.literal("doing"),
  v.literal("blocked"),
  v.literal("done"),
);

export const recurrenceValidator = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
);

export const dateTypeValidator = v.union(
  v.literal("deadline"),
  v.literal("reminder"),
);

export default defineSchema({
  tasks: defineTable({
    description: v.string(),
    projectId: v.id("projects"),
    urgency: urgencyValidator,
    status: statusValidator,
    deadline: v.union(v.string(), v.null()),
    recurrence: v.optional(v.union(recurrenceValidator, v.null())),
    dateType: v.optional(v.union(dateTypeValidator, v.null())),
    dateAdded: v.string(),
    dateStarted: v.union(v.string(), v.null()),
    dateCompleted: v.union(v.string(), v.null()),
  }).index("by_projectId", ["projectId"]),
  projects: defineTable({
    name: v.string(),
    description: v.string(),
  }).index("by_name", ["name"]),
});
