import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, bigint } from "drizzle-orm/mysql-core";

// ─── Users ───
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clients ───
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  email: varchar("email", { length: 320 }),
  monthlyValue: decimal("monthlyValue", { precision: 12, scale: 2 }).default("0"),
  startDate: bigint("startDate", { mode: "number" }),
  status: mysqlEnum("status", ["active", "paused", "cancelled"]).default("active").notNull(),
  // Services
  metaAds: boolean("metaAds").default(false).notNull(),
  googleAds: boolean("googleAds").default(false).notNull(),
  socialMedia: boolean("socialMedia").default(false).notNull(),
  // Monthly deliveries
  videoQuantity: int("videoQuantity").default(0),
  imageQuantity: int("imageQuantity").default(0),
  otherServices: text("otherServices"),
  // Notes
  notes: text("notes"),
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Collaborators ───
export const collaborators = mysqlTable("collaborators", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  type: mysqlEnum("type", ["freelancer", "fixed"]).default("fixed").notNull(),
  monthlyCost: decimal("monthlyCost", { precision: 12, scale: 2 }).default("0"),
  paymentDay: int("paymentDay"),
  status: mysqlEnum("collabStatus", ["active", "inactive"]).default("active").notNull(),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;

// ─── Tasks (Kanban) ───
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("taskStatus", ["todo", "in_progress", "done"]).default("todo").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  clientId: int("clientId"),
  collaboratorId: int("collaboratorId"),
  dueDate: bigint("dueDate", { mode: "number" }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Payments (Client Financial) ───
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: bigint("dueDate", { mode: "number" }).notNull(),
  paidDate: bigint("paidDate", { mode: "number" }),
  status: mysqlEnum("paymentStatus", ["paid", "pending", "overdue"]).default("pending").notNull(),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── Expenses (Collaborator costs, operational) ───
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  collaboratorId: int("collaboratorId"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  date: bigint("date", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Documents (S3 stored) ───
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 1000 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  category: mysqlEnum("docCategory", ["contract", "proposal", "report", "other"]).default("other").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Production Tracking (Videos/Images) ───
export const productionTracking = mysqlTable("productionTracking", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  videosProduced: int("videosProduced").default(0).notNull(),
  imagesProduced: int("imagesProduced").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionTracking = typeof productionTracking.$inferSelect;
export type InsertProductionTracking = typeof productionTracking.$inferInsert;

// ─── Events (Calendar) ───
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  type: mysqlEnum("eventType", ["meeting", "delivery", "recording", "campaign", "task", "other"]).default("other").notNull(),
  startTime: bigint("startTime", { mode: "number" }).notNull(),
  endTime: bigint("endTime", { mode: "number" }),
  allDay: boolean("allDay").default(false).notNull(),
  clientId: int("clientId"),
  collaboratorId: int("collaboratorId"),
  taskId: int("taskId"),
  color: varchar("color", { length: 30 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEvent = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Notifications (In-App) ───
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("notifType", ["payment_due", "payment_overdue", "task_assigned", "task_due", "task_overdue", "new_client", "weekly_summary", "general"]).default("general").notNull(),
  title: varchar("notifTitle", { length: 500 }).notNull(),
  message: text("notifMessage"),
  isRead: boolean("isRead").default(false).notNull(),
  link: varchar("link", { length: 500 }),
  createdAt: timestamp("notifCreatedAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Investments (Fixed and Variable Income) ───
export const investments = mysqlTable("investments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("investmentType", ["fixed", "variable"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  date: bigint("date", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = typeof investments.$inferInsert;

// ─── Credit Card Transactions ───
export const creditCardTransactions = mysqlTable("creditCardTransactions", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  transactionDate: bigint("transactionDate", { mode: "number" }).notNull(),
  status: mysqlEnum("ccStatus", ["pending", "paid"]).default("pending").notNull(),
  paidDate: bigint("paidDate", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditCardTransaction = typeof creditCardTransactions.$inferSelect;
export type InsertCreditCardTransaction = typeof creditCardTransactions.$inferInsert;


// ─── Monthly Periods ───
export const monthlyPeriods = mysqlTable("monthlyPeriods", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  startDate: bigint("startDate", { mode: "number" }).notNull(), // Unix timestamp
  endDate: bigint("endDate", { mode: "number" }).notNull(), // Unix timestamp
  status: mysqlEnum("periodStatus", ["active", "closed", "archived"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyPeriod = typeof monthlyPeriods.$inferSelect;
export type InsertMonthlyPeriod = typeof monthlyPeriods.$inferInsert;

// ─── Monthly Financial Summary ───
export const monthlyFinancialSummary = mysqlTable("monthlyFinancialSummary", {
  id: int("id").autoincrement().primaryKey(),
  periodId: int("periodId").notNull().references(() => monthlyPeriods.id, { onDelete: "cascade" }),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0").notNull(),
  totalExpenses: decimal("totalExpenses", { precision: 12, scale: 2 }).default("0").notNull(),
  totalInvestments: decimal("totalInvestments", { precision: 12, scale: 2 }).default("0").notNull(),
  creditCardPending: decimal("creditCardPending", { precision: 12, scale: 2 }).default("0").notNull(),
  netProfit: decimal("netProfit", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyFinancialSummary = typeof monthlyFinancialSummary.$inferSelect;
export type InsertMonthlyFinancialSummary = typeof monthlyFinancialSummary.$inferInsert;


// ─── Budget Planning ───
export const monthlyBudgets = mysqlTable("monthlyBudgets", {
  id: int("id").autoincrement().primaryKey(),
  periodId: int("periodId").notNull().references(() => monthlyPeriods.id, { onDelete: "cascade" }),
  forecastedRevenue: decimal("forecastedRevenue", { precision: 12, scale: 2 }).default("0").notNull(),
  profitTarget: decimal("profitTarget", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type InsertMonthlyBudget = typeof monthlyBudgets.$inferInsert;

// ─── Fixed Costs ───
export const fixedCosts = mysqlTable("fixedCosts", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull().references(() => monthlyBudgets.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // Aluguel, Internet, Energia, Água, Software, Assinatura, Empréstimo, Outro
  isRecurring: boolean("isRecurring").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FixedCost = typeof fixedCosts.$inferSelect;
export type InsertFixedCost = typeof fixedCosts.$inferInsert;

// ─── Variable Costs ───
export const variableCosts = mysqlTable("variableCosts", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull().references(() => monthlyBudgets.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // Tráfego, Combustível, Alimentação, Materiais, Terceirização, Comissão, Outro
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VariableCost = typeof variableCosts.$inferSelect;
export type InsertVariableCost = typeof variableCosts.$inferInsert;

// ─── Personal Expenses ───
export const personalExpenses = mysqlTable("personalExpenses", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull().references(() => monthlyBudgets.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // Cartão, Celular, Moradia, Mercado, Dízimo, Lazer, Outro
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PersonalExpense = typeof personalExpenses.$inferSelect;
export type InsertPersonalExpense = typeof personalExpenses.$inferInsert;

// ─── Budget Calculations (Cached) ───
export const budgetCalculations = mysqlTable("budgetCalculations", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull().unique().references(() => monthlyBudgets.id, { onDelete: "cascade" }),
  forecastedRevenue: decimal("forecastedRevenue", { precision: 12, scale: 2 }).default("0").notNull(),
  totalFixedCosts: decimal("totalFixedCosts", { precision: 12, scale: 2 }).default("0").notNull(),
  totalVariableCosts: decimal("totalVariableCosts", { precision: 12, scale: 2 }).default("0").notNull(),
  totalPersonalExpenses: decimal("totalPersonalExpenses", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCollaboratorCosts: decimal("totalCollaboratorCosts", { precision: 12, scale: 2 }).default("0").notNull(),
  totalExpenses: decimal("totalExpenses", { precision: 12, scale: 2 }).default("0").notNull(),
  netProfitForecast: decimal("netProfitForecast", { precision: 12, scale: 2 }).default("0").notNull(),
  breakEvenPoint: decimal("breakEvenPoint", { precision: 12, scale: 2 }).default("0").notNull(),
  safetyMargin: decimal("safetyMargin", { precision: 12, scale: 2 }).default("0").notNull(),
  profitMarginPercentage: decimal("profitMarginPercentage", { precision: 5, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("budgetStatus", ["positive", "warning", "negative"]).default("positive").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BudgetCalculation = typeof budgetCalculations.$inferSelect;
export type InsertBudgetCalculation = typeof budgetCalculations.$inferInsert;

// ─── Budget Limits (Configurable per category) ───
export const budgetLimits = mysqlTable("budgetLimits", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  costType: mysqlEnum("costType", ["fixed", "variable", "personal"]).notNull(),
  limitAmount: decimal("limitAmount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BudgetLimit = typeof budgetLimits.$inferSelect;
export type InsertBudgetLimit = typeof budgetLimits.$inferInsert;
