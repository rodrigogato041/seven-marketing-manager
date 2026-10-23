import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instagramHandle: text("instagram_handle").notNull().unique(),
  instagramUserId: text("instagram_user_id").unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  segment: text("segment").notNull(),
  geography: text("geography"),
  score: integer("score").notNull().default(0),
  funnel: text("funnel").notNull().default("customer"),
  pipelineState: text("pipeline_state").notNull().default("discovered"),
  channelState: text("channel_state").notNull().default("browser_contact_pending"),
  channelOwner: text("channel_owner").notNull().default("browser"),
  nextActionAt: text("next_action_at"),
  doNotContact: integer("do_not_contact", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  externalId: text("external_id").unique(),
  direction: text("direction").notNull(),
  channel: text("channel").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  variant: text("variant"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  payload: text("payload").notNull().default("{}"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: text("available_at").notNull(),
  lockedAt: text("locked_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").references(() => leads.id),
  type: text("type").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const webhookEvents = sqliteTable("webhook_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").notNull().unique(),
  payload: text("payload").notNull(),
  processedAt: text("processed_at").notNull(),
});

export const aiCalls = sqliteTable("ai_calls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").references(() => leads.id),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type Job = typeof jobs.$inferSelect;
