import { pgTable, serial, varchar, timestamp, integer, boolean, text, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users (Extended with OAuth2 Provider Mapping)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  salt: varchar("salt", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  authProvider: varchar("auth_provider", { length: 50 }).default("local").notNull(), // local, github, google
  providerAccountId: varchar("provider_account_id", { length: 255 }),
  avatarUrl: text("avatar_url"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. User Profiles
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 10 }).default("th").notNull(),
  theme: varchar("theme", { length: 50 }).default("midnight-teal").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Bangkok").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Sessions
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Organizations (Tenants)
export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 50 }).default("FREE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Organization Members
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id", { length: 64 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(), // OWNER, ADMIN, DEVELOPER, MEMBER, VIEWER
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Workspaces
export const workspaces = pgTable("workspaces", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orgId: varchar("org_id", { length: 64 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Plans
export const plans = pgTable("plans", {
  id: varchar("id", { length: 50 }).primaryKey(), // FREE, PRO, TEAM, ENTERPRISE
  name: varchar("name", { length: 100 }).notNull(),
  priceThbMonthly: integer("price_thb_monthly").default(0).notNull(),
  monthlyAiRequests: integer("monthly_ai_requests").notNull(),
  maxTokensPerRequest: integer("max_tokens_per_request").notNull(),
  maxWorkspaces: integer("max_workspaces").notNull(),
  maxMembers: integer("max_members").notNull(),
  features: jsonb("features").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Entitlements
export const entitlements = pgTable("entitlements", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  planId: varchar("plan_id", { length: 50 }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

// 9. Usage Records
export const usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  userId: integer("user_id").notNull(),
  workspaceId: varchar("workspace_id", { length: 64 }).notNull(),
  metric: varchar("metric", { length: 100 }).notNull(), // ai_requests, input_tokens, output_tokens, tool_execution
  amount: integer("amount").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// 10. Audit Events
export const auditEvents = pgTable("audit_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  userId: integer("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  detail: text("detail").notNull(),
  nanoAt: varchar("nano_at", { length: 30 }).notNull(),
  prevHash: varchar("prev_hash", { length: 64 }).notNull(),
  hash: varchar("hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- P5: SUBSCRIPTION & BILLING ENTITIES ---

// 12. Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  planId: varchar("plan_id", { length: 50 }).notNull(), // FREE, PRO, TEAM, ENTERPRISE
  status: varchar("status", { length: 50 }).notNull(), // FREE, PENDING, ACTIVE, CANCEL_AT_PERIOD_END, PAST_DUE, GRACE_PERIOD, SUSPENDED, EXPIRED
  provider: varchar("provider", { length: 50 }).default("stripe").notNull(), // stripe, promptpay, bank_transfer
  providerSubscriptionId: varchar("provider_subscription_id", { length: 128 }),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  canceledAt: timestamp("canceled_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 13. Subscription Events
export const subscriptionEvents = pgTable("subscription_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  subscriptionId: varchar("subscription_id", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  fromState: varchar("from_state", { length: 50 }).notNull(),
  toState: varchar("to_state", { length: 50 }).notNull(),
  reason: text("reason").notNull(),
  actorId: varchar("actor_id", { length: 64 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Billing Customers
export const billingCustomers = pgTable("billing_customers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 128 }),
  taxId: varchar("tax_id", { length: 100 }),
  billingAddress: jsonb("billing_address").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 15. Payment Transactions
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  amount: integer("amount").notNull(), // amount in satang / cents
  currency: varchar("currency", { length: 10 }).default("THB").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // stripe, promptpay, bank_transfer
  providerTransactionId: varchar("provider_transaction_id", { length: 128 }),
  status: varchar("status", { length: 50 }).notNull(), // pending, verified, failed, refunded
  paymentMethodDetails: jsonb("payment_method_details").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 16. Payment Webhook Events
export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: varchar("id", { length: 128 }).primaryKey(), // unique provider event ID
  provider: varchar("provider", { length: 50 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  processed: boolean("processed").default(false).notNull(),
  signatureVerified: boolean("signature_verified").default(false).notNull(),
  payload: jsonb("payload").notNull(),
  error: text("error"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

// 17. Invoices
export const invoices = pgTable("invoices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull().unique(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  subscriptionId: varchar("subscription_id", { length: 64 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("THB").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // draft, open, paid, void, uncollectible
  paidAt: timestamp("paid_at"),
  receiptUrl: text("receipt_url"),
  pdfData: text("pdf_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 18. Refunds
export const refunds = pgTable("refunds", {
  id: varchar("id", { length: 64 }).primaryKey(),
  transactionId: varchar("transaction_id", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, processed, failed
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 19. Reconciliation Records
export const reconciliationRecords = pgTable("reconciliation_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull(),
  reference: varchar("reference", { length: 128 }).notNull(),
  amount: integer("amount").notNull(),
  matched: boolean("matched").default(false).notNull(),
  matchedTransactionId: varchar("matched_transaction_id", { length: 64 }),
  reconciledBy: varchar("reconciled_by", { length: 64 }),
  reconciledAt: timestamp("reconciled_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  tasks: many(tasks),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
}));

