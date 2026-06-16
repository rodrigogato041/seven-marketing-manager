import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod/v4";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { notifyOwner } from "./_core/notification";
import { monthlyPeriodsRouter } from "./monthlyPeriodsRouter";
import { budgetPlanningRouter } from "./budgetPlanningRouter";
import { pdfExportRouter } from "./pdfExportRouter";
import { budgetAlertsRouter } from "./budgetAlertsRouter";
import { googleCalendarRouter } from "./googleCalendarRouter";

const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const taskRecurrenceSchema = z.enum(["none", "daily", "weekly", "biweekly", "monthly", "custom"]);
const taskTypeSchema = z.enum([
  "art",
  "video",
  "editing",
  "script",
  "copy",
  "traffic",
  "service",
  "meeting",
  "financial",
  "administrative",
  "publishing",
  "report",
  "capture",
  "planning",
]);
const editorialStatusSchema = z.enum(["idea", "script", "production", "editing", "approval", "changes", "approved", "scheduled", "published", "archived"]);
const approvalStatusSchema = z.enum(["not_sent", "sent", "waiting", "approved", "changes_requested", "rejected", "published"]);

// ─── Client Router ───
const clientRouter = router({
  list: protectedProcedure.query(() => db.listClients()),
  intelligence: protectedProcedure.query(() => db.getClientIntelligence()),
  health: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getClientHealth(input.id)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getClientById(input.id)),
  create: protectedProcedure.input(z.object({
    companyName: z.string().min(1),
    contactName: z.string().min(1),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    email: z.string().optional(),
    monthlyValue: z.string().optional(),
    startDate: z.number().optional(),
    contractRenewalDate: z.number().optional().nullable(),
    contractEndDate: z.number().optional().nullable(),
    contractPaymentMethod: z.string().optional().nullable(),
    contractDueDay: z.number().min(1).max(31).optional().nullable(),
    contractAdjustment: z.string().optional().nullable(),
    contractNotes: z.string().optional().nullable(),
    contractStatus: z.enum(["active", "pending", "expired", "cancelled"]).optional(),
    status: z.enum(["active", "paused", "cancelled"]).optional(),
    metaAds: z.boolean().optional(),
    googleAds: z.boolean().optional(),
    socialMedia: z.boolean().optional(),
    videoQuantity: z.number().optional(),
    imageQuantity: z.number().optional(),
    otherServices: z.string().optional(),
    notes: z.string().optional(),
    logoUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await db.createClient(input);
    // Notify owner about new client
    await notifyOwner({ title: "Novo Cliente", content: `O cliente "${input.companyName}" foi cadastrado no sistema.` }).catch(() => {});
    return result;
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    companyName: z.string().min(1).optional(),
    contactName: z.string().min(1).optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    email: z.string().optional(),
    monthlyValue: z.string().optional(),
    startDate: z.number().optional(),
    contractRenewalDate: z.number().optional().nullable(),
    contractEndDate: z.number().optional().nullable(),
    contractPaymentMethod: z.string().optional().nullable(),
    contractDueDay: z.number().min(1).max(31).optional().nullable(),
    contractAdjustment: z.string().optional().nullable(),
    contractNotes: z.string().optional().nullable(),
    contractStatus: z.enum(["active", "pending", "expired", "cancelled"]).optional(),
    status: z.enum(["active", "paused", "cancelled"]).optional(),
    metaAds: z.boolean().optional(),
    googleAds: z.boolean().optional(),
    socialMedia: z.boolean().optional(),
    videoQuantity: z.number().optional(),
    imageQuantity: z.number().optional(),
    otherServices: z.string().optional(),
    notes: z.string().optional(),
    logoUrl: z.string().optional().nullable(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateClient(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteClientCascade(input.id)),
  uploadLogo: protectedProcedure.input(z.object({
    id: z.number(),
    fileBase64: z.string(),
    fileName: z.string(),
    mimeType: z.string().optional(),
  })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.fileBase64, "base64");
    const fileKey = `logos/client-${input.id}/${nanoid()}-${input.fileName}`;
    const { url } = await storagePut(fileKey, buffer, input.mimeType || "image/png");
    await db.updateClient(input.id, { logoUrl: url });
    return { url };
  }),
});

// ─── Collaborator Router ───
const collaboratorRouter = router({
  list: protectedProcedure.query(() => db.listCollaborators()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getCollaboratorById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().optional(),
    type: z.enum(["freelancer", "fixed"]).optional(),
    monthlyCost: z.string().optional(),
    paymentDay: z.number().min(1).max(31).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    photoUrl: z.string().optional(),
  })).mutation(({ input }) => db.createCollaborator(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    type: z.enum(["freelancer", "fixed"]).optional(),
    monthlyCost: z.string().optional(),
    paymentDay: z.number().min(1).max(31).optional().nullable(),
    status: z.enum(["active", "inactive"]).optional(),
    photoUrl: z.string().optional().nullable(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateCollaborator(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteCollaborator(input.id)),
  uploadPhoto: protectedProcedure.input(z.object({
    id: z.number(),
    fileBase64: z.string(),
    fileName: z.string(),
    mimeType: z.string().optional(),
  })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.fileBase64, "base64");
    const fileKey = `photos/collaborator-${input.id}/${nanoid()}-${input.fileName}`;
    const { url } = await storagePut(fileKey, buffer, input.mimeType || "image/png");
    await db.updateCollaborator(input.id, { photoUrl: url });
    return { url };
  }),
});

// ─── Task Router ───
const taskRouter = router({
  list: protectedProcedure.query(() => db.listTasks()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getTaskById(input.id)),
  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: taskPrioritySchema.optional(),
    taskType: taskTypeSchema.optional(),
    checklist: z.string().optional(),
    recurrence: taskRecurrenceSchema.optional(),
    recurrenceEvery: z.number().min(1).optional(),
    recurrenceUntil: z.number().optional().nullable(),
    recurrenceParentId: z.number().optional().nullable(),
    comments: z.string().optional(),
    history: z.string().optional(),
    relatedLinks: z.string().optional(),
    attachmentLinks: z.string().optional(),
    clientId: z.number().optional().nullable(),
    collaboratorId: z.number().optional().nullable(),
    dueDate: z.number().optional().nullable(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const result = await db.createTask(input);
    if (input.priority === "high" || input.priority === "urgent") {
      await notifyOwner({ title: "Tarefa Urgente Criada", content: `A tarefa "${input.title}" com prioridade alta foi criada.` }).catch(() => {});
    }
    return result;
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: taskPrioritySchema.optional(),
    taskType: taskTypeSchema.optional(),
    checklist: z.string().optional(),
    recurrence: taskRecurrenceSchema.optional(),
    recurrenceEvery: z.number().min(1).optional().nullable(),
    recurrenceUntil: z.number().optional().nullable(),
    recurrenceParentId: z.number().optional().nullable(),
    comments: z.string().optional(),
    history: z.string().optional(),
    relatedLinks: z.string().optional(),
    attachmentLinks: z.string().optional(),
    clientId: z.number().optional().nullable(),
    collaboratorId: z.number().optional().nullable(),
    dueDate: z.number().optional().nullable(),
    sortOrder: z.number().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateTask(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteTask(input.id)),
  addComment: protectedProcedure.input(z.object({
    id: z.number(),
    text: z.string().min(1),
  })).mutation(({ input, ctx }) => db.addTaskComment(input.id, input.text, ctx.user?.name || ctx.user?.email || "Seven Admin")),
  reorder: protectedProcedure.input(z.object({
    updates: z.array(z.object({ id: z.number(), status: z.string(), sortOrder: z.number() })),
  })).mutation(({ input }) => db.updateTasksOrder(input.updates)),
});

// ─── Payment Router ───
const paymentRouter = router({
  list: protectedProcedure.input(z.object({ clientId: z.number().optional() }).optional()).query(({ input }) => db.listPayments(input?.clientId)),
  create: protectedProcedure.input(z.object({
    clientId: z.number(),
    amount: z.string(),
    dueDate: z.number(),
    paidDate: z.number().optional(),
    status: z.enum(["paid", "pending", "overdue"]).optional(),
    description: z.string().optional(),
  })).mutation(({ input }) => db.createPayment(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    amount: z.string().optional(),
    dueDate: z.number().optional(),
    paidDate: z.number().optional(),
    status: z.enum(["paid", "pending", "overdue"]).optional(),
    description: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updatePayment(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deletePayment(input.id)),
  confirm: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.confirmPayment(input.id)),
  undo: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.undoPayment(input.id)),
  billingForecast: protectedProcedure.input(z.object({
    year: z.number(),
    month: z.number().min(1).max(12),
  })).query(({ input }) => db.getMonthlyBillingForecast(input.year, input.month)),
});

// ─── Expense Router ───
const expenseRouter = router({
  list: protectedProcedure.query(() => db.listExpenses()),
  create: protectedProcedure.input(z.object({
    collaboratorId: z.number().optional(),
    amount: z.string(),
    category: z.string().min(1),
    description: z.string().optional(),
    date: z.number(),
  })).mutation(({ input }) => db.createExpense(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    collaboratorId: z.number().optional(),
    amount: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    date: z.number().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateExpense(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteExpense(input.id)),
});

// ─── Document Router ───
const documentRouter = router({
  list: protectedProcedure.input(z.object({ clientId: z.number().optional() }).optional()).query(({ input }) => db.listDocuments(input?.clientId)),
  upload: protectedProcedure.input(z.object({
    clientId: z.number(),
    fileName: z.string(),
    fileBase64: z.string(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
    category: z.enum(["contract", "proposal", "report", "other"]).optional(),
  })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.fileBase64, "base64");
    const fileKey = `documents/client-${input.clientId}/${nanoid()}-${input.fileName}`;
    const { url } = await storagePut(fileKey, buffer, input.mimeType || "application/octet-stream");
    return db.createDocument({
      clientId: input.clientId,
      fileName: input.fileName,
      fileKey,
      url,
      mimeType: input.mimeType || null,
      fileSize: input.fileSize || null,
      category: input.category || "other",
    });
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteDocument(input.id)),
});

// ─── Event Router (Calendar) ───
const eventRouter = router({
  list: protectedProcedure.input(z.object({
    startRange: z.number().optional(),
    endRange: z.number().optional(),
  }).optional()).query(({ input }) => db.listEvents(input?.startRange, input?.endRange)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getEventById(input.id)),
  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["meeting", "delivery", "recording", "campaign", "task", "other"]).optional(),
    startTime: z.number(),
    endTime: z.number().optional(),
    allDay: z.boolean().optional(),
    clientId: z.number().optional(),
    collaboratorId: z.number().optional(),
    taskId: z.number().optional(),
    color: z.string().optional(),
  })).mutation(({ input }) => db.createEvent(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.enum(["meeting", "delivery", "recording", "campaign", "task", "other"]).optional(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    allDay: z.boolean().optional(),
    clientId: z.number().optional(),
    collaboratorId: z.number().optional(),
    taskId: z.number().optional(),
    color: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateEvent(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteEvent(input.id)),
});

// ─── Notification Router ───
const notificationRouter = router({
  list: protectedProcedure.query(() => db.listNotifications()),
  unreadCount: protectedProcedure.query(() => db.getUnreadNotificationCount()),
  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.markNotificationRead(input.id)),
  markAllRead: protectedProcedure.mutation(() => db.markAllNotificationsRead()),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteNotification(input.id)),
});

// ─── Dashboard Router ───
const dashboardRouter = router({
  stats: protectedProcedure.query(() => db.getDashboardStats()),
  today: protectedProcedure.query(() => db.getTodayCommandCenter()),
  globalSearch: protectedProcedure.input(z.object({ query: z.string().min(1) })).query(({ input }) => db.globalSearch(input.query)),
  monthlyRevenue: protectedProcedure.query(() => db.getMonthlyRevenue()),
  monthlyExpenses: protectedProcedure.query(() => db.getMonthlyExpenses()),
  topServices: protectedProcedure.query(() => db.getTopServices()),
  paymentAlerts: protectedProcedure.query(() => db.getPaymentAlerts()),
  weeklySummary: protectedProcedure.query(() => db.getWeeklySummary()),
  revenueVsExpenses: protectedProcedure.query(() => db.getRevenueVsExpenses()),
  exportData: protectedProcedure.input(z.object({
    year: z.number().optional(),
    month: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    const allClients = await db.listClients();
    const allPayments = await db.listPayments();
    const allExpenses = await db.listExpenses();
    const allCollaborators = await db.listCollaborators();
    return { clients: allClients, payments: allPayments, expenses: allExpenses, collaborators: allCollaborators };
  }),
});

// ─── Content Production Router ───
const strategicFinanceRouter = router({
  summary: protectedProcedure.input(z.object({
    year: z.number(),
    month: z.number().min(1).max(12),
  })).query(({ input }) => db.getStrategicFinance(input.year, input.month)),
});

const contentProductionRouter = router({
  get: protectedProcedure.input(z.object({ clientId: z.number(), month: z.string() }))
    .query(async ({ input }) => {
      const [year, monthStr] = input.month.split('-');
      return db.getProductionTrackingForClient(parseInt(input.clientId.toString()), parseInt(year), parseInt(monthStr));
    }),
  upsert: protectedProcedure.input(z.object({
    clientId: z.number(),
    month: z.string(),
    videosProduced: z.number(),
    imagesProduced: z.number(),
  })).mutation(async ({ input }) => {
    const [year, monthStr] = input.month.split('-');
    return db.updateProductionTracking(input.clientId, parseInt(year), parseInt(monthStr), input.videosProduced, input.imagesProduced);
  }),
  listContent: protectedProcedure.input(z.object({
    clientId: z.number().optional(),
    year: z.number().optional(),
    month: z.number().min(1).max(12).optional(),
    status: editorialStatusSchema.optional(),
    approvalStatus: approvalStatusSchema.optional(),
    contentType: z.string().optional(),
    campaign: z.string().optional(),
  }).optional()).query(({ input }) => db.listContentItems(input ?? {})),
  createContent: protectedProcedure.input(z.object({
    clientId: z.number(),
    collaboratorId: z.number().optional(),
    contentType: z.string().min(1),
    theme: z.string().min(1),
    campaign: z.string().optional(),
    scheduledDate: z.number().optional(),
    publishedAt: z.number().optional(),
    status: editorialStatusSchema.optional(),
    approvalStatus: approvalStatusSchema.optional(),
    sentAt: z.number().optional(),
    approvedAt: z.number().optional(),
    caption: z.string().optional(),
    notes: z.string().optional(),
    fileUrl: z.string().optional(),
    publishedUrl: z.string().optional(),
    clientComment: z.string().optional(),
    internalComment: z.string().optional(),
    revisionOwnerId: z.number().optional(),
  })).mutation(({ input }) => db.createContentItem(input)),
  updateContent: protectedProcedure.input(z.object({
    id: z.number(),
    clientId: z.number().optional(),
    collaboratorId: z.number().optional().nullable(),
    contentType: z.string().optional(),
    theme: z.string().optional(),
    campaign: z.string().optional().nullable(),
    scheduledDate: z.number().optional().nullable(),
    publishedAt: z.number().optional().nullable(),
    status: editorialStatusSchema.optional(),
    approvalStatus: approvalStatusSchema.optional(),
    sentAt: z.number().optional().nullable(),
    approvedAt: z.number().optional().nullable(),
    caption: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    fileUrl: z.string().optional().nullable(),
    publishedUrl: z.string().optional().nullable(),
    clientComment: z.string().optional().nullable(),
    internalComment: z.string().optional().nullable(),
    revisionOwnerId: z.number().optional().nullable(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateContentItem(id, data);
  }),
  deleteContent: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteContentItem(input.id)),
  summary: protectedProcedure.input(z.object({
    year: z.number(),
    month: z.number().min(1).max(12),
    clientId: z.number().optional(),
  })).query(({ input }) => db.getContentStudioSummary(input.year, input.month, input.clientId)),
  clientReport: protectedProcedure.input(z.object({
    clientId: z.number(),
    year: z.number(),
    month: z.number().min(1).max(12),
  })).query(({ input }) => db.getClientContentReport(input.clientId, input.year, input.month)),
});

// ─── Investments Router ───
const investmentRouter = router({
  list: protectedProcedure.query(() => db.listInvestments()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getInvestmentById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    type: z.enum(["fixed", "variable"]),
    amount: z.string(),
    description: z.string().optional(),
    date: z.number(),
  })).mutation(({ input }) => db.createInvestment(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.enum(["fixed", "variable"]).optional(),
    amount: z.string().optional(),
    description: z.string().optional(),
    date: z.number().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateInvestment(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteInvestment(input.id)),
  getSummary: protectedProcedure.query(() => db.getInvestmentSummary()),
});

// ─── Credit Card Router ───
const creditCardRouter = router({
  list: protectedProcedure.query(() => db.listCreditCardTransactions()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getCreditCardTransactionById(input.id)),
  create: protectedProcedure.input(z.object({
    description: z.string().min(1),
    amount: z.string(),
    category: z.string().min(1),
    transactionDate: z.number(),
    status: z.enum(["pending", "paid"]).optional(),
    paidDate: z.number().optional(),
  })).mutation(({ input }) => db.createCreditCardTransaction(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    description: z.string().optional(),
    amount: z.string().optional(),
    category: z.string().optional(),
    transactionDate: z.number().optional(),
    status: z.enum(["pending", "paid"]).optional(),
    paidDate: z.number().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return db.updateCreditCardTransaction(id, data);
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteCreditCardTransaction(input.id)),
  markAsPaid: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.markCreditCardAsPaid(input.id)),
  getSummary: protectedProcedure.query(() => db.getCreditCardSummary()),
  getByStatus: protectedProcedure.input(z.object({ status: z.enum(["pending", "paid"]) })).query(({ input }) => db.getCreditCardTransactionsByStatus(input.status)),
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      if (!ENV.adminEmail || !ENV.adminPassword || !ENV.cookieSecret || !ENV.appId) {
        throw new Error("Login local nao configurado. Defina ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET e VITE_APP_ID.");
      }

      if (
        input.email.trim().toLowerCase() !== ENV.adminEmail.trim().toLowerCase() ||
        input.password !== ENV.adminPassword
      ) {
        throw new Error("Email ou senha invalidos.");
      }

      await db.upsertUser({
        openId: "local-admin",
        name: "Seven Admin",
        email: ENV.adminEmail,
        loginMethod: "password",
        role: "admin",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken("local-admin", {
        name: "Seven Admin",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  clients: clientRouter,
  collaborators: collaboratorRouter,
  tasks: taskRouter,
  payments: paymentRouter,
  expenses: expenseRouter,
  documents: documentRouter,
  events: eventRouter,
  notifications: notificationRouter,
  dashboard: dashboardRouter,
  strategicFinance: strategicFinanceRouter,
  contentProduction: contentProductionRouter,
  investments: investmentRouter,
  creditCard: creditCardRouter,
  monthlyPeriods: monthlyPeriodsRouter,
  budgetPlanning: budgetPlanningRouter,
  pdfExport: pdfExportRouter,
  budgetAlerts: budgetAlertsRouter,
  googleCalendar: googleCalendarRouter,
});

export type AppRouter = typeof appRouter;
