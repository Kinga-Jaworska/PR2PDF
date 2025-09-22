import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fullName: text("full_name").notNull().unique(),
  githubToken: text("github_token").notNull(),
  defaultBranch: text("default_branch").default("main"),
  autoGenerate: boolean("auto_generate").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pullRequests = pgTable("pull_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").notNull().references(() => repositories.id),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  status: text("status").notNull(), // "open", "closed", "merged"
  reviewStatus: text("review_status"), // "pending", "approved", "changes_requested"
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  mergedAt: timestamp("merged_at"),
  changes: jsonb("changes"), // Store diff/changes data
  githubId: integer("github_id").notNull().unique(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pullRequestId: varchar("pull_request_id").notNull().references(() => pullRequests.id),
  audienceType: text("audience_type").notNull(), // "pm", "qa", "client"
  content: jsonb("content").notNull(), // Generated content from AI
  pdfPath: text("pdf_path"),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const insights = pgTable("insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").notNull().references(() => repositories.id),
  type: text("type").notNull(), // "test_coverage", "performance", "breaking_changes"
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // "info", "warning", "error"
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const repositoriesRelations = relations(repositories, ({ many }) => ({
  pullRequests: many(pullRequests),
  insights: many(insights),
}));

export const pullRequestsRelations = relations(pullRequests, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [pullRequests.repositoryId],
    references: [repositories.id],
  }),
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  pullRequest: one(pullRequests, {
    fields: [reports.pullRequestId],
    references: [pullRequests.id],
  }),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  repository: one(repositories, {
    fields: [insights.repositoryId],
    references: [repositories.id],
  }),
}));

// Schemas
export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPullRequestSchema = createInsertSchema(pullRequests).omit({
  id: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  generatedAt: true,
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

// Types
export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type PullRequest = typeof pullRequests.$inferSelect;
export type InsertPullRequest = z.infer<typeof insertPullRequestSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;
