import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Users table definition representing engineering intelligence workspace users.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email'),
  role: text('role').notNull().default('engineer'),
  authProvider: text('auth_provider').notNull().default('local'),
  providerAccountId: text('provider_account_id'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Projects table definition representing local-first engineering workspace projects.
 */
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('org-default'),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('Active workspace'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`),
  targetPath: text('target_path'),
  ownerId: text('owner_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Workspace snapshots table for server-side backup and restore history.
 */
export const workspaceSnapshots = pgTable('workspace_snapshots', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  itemCount: text('item_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * System errors table definition for persistent application-level error logging.
 */
export const systemErrors = pgTable('system_errors', {
  id: text('id').primaryKey(),
  level: text('level').notNull().default('error'),
  category: text('category').notNull().default('app'),
  message: text('message').notNull(),
  stack: text('stack'),
  endpoint: text('endpoint'),
  resolved: boolean('resolved').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type WorkspaceSnapshot = typeof workspaceSnapshots.$inferSelect;
export type SystemError = typeof systemErrors.$inferSelect;
export type NewSystemError = typeof systemErrors.$inferInsert;
