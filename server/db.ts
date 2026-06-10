import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";
import type {
  InsertUser, User,
  InsertClient,
  InsertCollaborator,
  InsertTask,
  InsertPayment,
  InsertExpense,
  InsertDocument,
  InsertEvent,
  InsertNotification,
  InsertProductionTracking,
  InsertInvestment,
  InsertCreditCardTransaction,
  InsertMonthlyPeriod,
  InsertMonthlyFinancialSummary,
  InsertMonthlyBudget,
  InsertFixedCost,
  InsertVariableCost,
  InsertPersonalExpense,
} from "../drizzle/schema";

type TableName =
  | "users"
  | "clients"
  | "collaborators"
  | "tasks"
  | "payments"
  | "expenses"
  | "documents"
  | "events"
  | "notifications"
  | "productionTracking"
  | "investments"
  | "creditCardTransactions"
  | "monthlyPeriods"
  | "monthlyFinancialSummary"
  | "monthlyBudgets"
  | "fixedCosts"
  | "variableCosts"
  | "personalExpenses"
  | "budgetCalculations"
  | "budgetLimits";

type LocalRecord = Record<string, any> & { id: number };
type LocalData = Record<TableName, LocalRecord[]>;

const DATA_DIR = ENV.dataDir ? path.resolve(ENV.dataDir) : path.resolve(process.cwd(), ".codex-data");
const DATA_FILE = path.join(DATA_DIR, "local-db.json");

const tableNames: TableName[] = [
  "users",
  "clients",
  "collaborators",
  "tasks",
  "payments",
  "expenses",
  "documents",
  "events",
  "notifications",
  "productionTracking",
  "investments",
  "creditCardTransactions",
  "monthlyPeriods",
  "monthlyFinancialSummary",
  "monthlyBudgets",
  "fixedCosts",
  "variableCosts",
  "personalExpenses",
  "budgetCalculations",
  "budgetLimits",
];

const emptyData = (): LocalData =>
  Object.fromEntries(tableNames.map(name => [name, []])) as unknown as LocalData;

let dataCache: LocalData | null = null;

export async function getDb() {
  return null;
}

async function loadData(): Promise<LocalData> {
  if (dataCache) return dataCache;

  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    dataCache = { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    dataCache = emptyData();
    await saveData();
  }

  return dataCache as LocalData;
}

async function saveData() {
  if (!dataCache) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(dataCache, null, 2), "utf-8");
}

const nowDate = () => new Date();
const nowMs = () => Date.now();
const asNumber = (value: unknown) => Number(value ?? 0) || 0;
const money = (value: unknown) => asNumber(value);

function nextId(rows: LocalRecord[]) {
  return rows.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1;
}

async function list<T extends LocalRecord = any>(table: TableName): Promise<T[]> {
  const data = await loadData();
  return data[table] as T[];
}

async function insert<T extends LocalRecord = any>(table: TableName, values: Record<string, any>): Promise<T> {
  const data = await loadData();
  const rows = data[table];
  const now = nowDate();
  const record = {
    id: nextId(rows),
    ...values,
    createdAt: values.createdAt ?? now,
    updatedAt: values.updatedAt ?? now,
  } as unknown as T;
  rows.push(record);
  await saveData();
  return record;
}

async function update(table: TableName, id: number, values: Record<string, any>) {
  const rows = await list(table);
  const row = rows.find(item => item.id === id);
  if (!row) return;
  Object.assign(row, values, { updatedAt: nowDate() });
  await saveData();
}

async function remove(table: TableName, id: number) {
  const data = await loadData();
  data[table] = data[table].filter(item => item.id !== id);
  await saveData();
}

const byNewest = (a: LocalRecord, b: LocalRecord) => asNumber(new Date(b.createdAt).getTime()) - asNumber(new Date(a.createdAt).getTime());
const byDateDesc = (field: string) => (a: LocalRecord, b: LocalRecord) => asNumber(b[field]) - asNumber(a[field]);

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const rows = await list<User & LocalRecord>("users");
  const existing = rows.find(row => row.openId === user.openId);
  if (existing) {
    Object.assign(existing, user, { updatedAt: nowDate(), lastSignedIn: user.lastSignedIn ?? nowDate() });
    await saveData();
    return;
  }
  await insert("users", {
    name: null,
    email: null,
    loginMethod: null,
    role: user.role ?? "user",
    lastSignedIn: nowDate(),
    ...user,
  });
}

export async function getUserByOpenId(openId: string) {
  return (await list<User & LocalRecord>("users")).find(user => user.openId === openId);
}

export async function listClients() {
  return (await list("clients")).sort(byNewest);
}

export async function getClientById(id: number) {
  return (await list("clients")).find(client => client.id === id);
}

export async function createClient(data: Omit<InsertClient, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("clients", {
    status: "active",
    metaAds: false,
    googleAds: false,
    socialMedia: false,
    videoQuantity: 0,
    imageQuantity: 0,
    monthlyValue: "0",
    ...data,
  });
  return { id: record.id };
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  await update("clients", id, data);
}

export async function deleteClient(id: number) {
  await remove("clients", id);
}

export async function getActiveClientsCount() {
  return (await listClients()).filter(client => client.status === "active").length;
}

export async function listCollaborators() {
  return (await list("collaborators")).sort(byNewest);
}

export async function getCollaboratorById(id: number) {
  return (await list("collaborators")).find(collaborator => collaborator.id === id);
}

export async function createCollaborator(data: Omit<InsertCollaborator, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("collaborators", {
    type: "fixed",
    monthlyCost: "0",
    status: "active",
    ...data,
  });
  return { id: record.id };
}

export async function updateCollaborator(id: number, data: Partial<InsertCollaborator>) {
  await update("collaborators", id, data);
}

export async function deleteCollaborator(id: number) {
  await remove("collaborators", id);
}

export async function listTasks() {
  return (await list("tasks")).sort((a, b) => asNumber(a.sortOrder) - asNumber(b.sortOrder));
}

export async function getTaskById(id: number) {
  return (await list("tasks")).find(task => task.id === id);
}

export async function createTask(data: Omit<InsertTask, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("tasks", {
    status: "todo",
    priority: "medium",
    sortOrder: 0,
    ...data,
  });
  return { id: record.id };
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  await update("tasks", id, data);
}

export async function deleteTask(id: number) {
  await remove("tasks", id);
}

export async function updateTasksOrder(updates: { id: number; status: string; sortOrder: number }[]) {
  for (const item of updates) {
    await update("tasks", item.id, { status: item.status, sortOrder: item.sortOrder });
  }
}

export async function listPayments(clientId?: number) {
  const rows = await list("payments");
  return rows.filter(payment => !clientId || payment.clientId === clientId).sort(byDateDesc("dueDate"));
}

export async function createPayment(data: Omit<InsertPayment, "id" | "createdAt">) {
  const record = await insert("payments", { status: "pending", ...data });
  return { id: record.id };
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  await update("payments", id, data);
}

export async function deletePayment(id: number) {
  await remove("payments", id);
}

export async function listExpenses() {
  return (await list("expenses")).sort(byDateDesc("date"));
}

export async function createExpense(data: Omit<InsertExpense, "id" | "createdAt">) {
  const record = await insert("expenses", data);
  return { id: record.id };
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  await update("expenses", id, data);
}

export async function deleteExpense(id: number) {
  await remove("expenses", id);
}

export async function listDocuments(clientId?: number) {
  const rows = await list("documents");
  return rows.filter(document => !clientId || document.clientId === clientId).sort((a, b) => asNumber(new Date(b.uploadedAt).getTime()) - asNumber(new Date(a.uploadedAt).getTime()));
}

export async function createDocument(data: Omit<InsertDocument, "id" | "uploadedAt">) {
  const record = await insert("documents", { category: "other", uploadedAt: nowDate(), ...data });
  return { id: record.id };
}

export async function deleteDocument(id: number) {
  await remove("documents", id);
}

export async function getDashboardStats() {
  const [clients, tasks, payments, expenses] = await Promise.all([
    listClients(),
    listTasks(),
    listPayments(),
    listExpenses(),
  ]);
  const now = nowMs();
  return {
    totalRevenue: payments.filter(p => p.status === "paid").reduce((sum, p) => sum + money(p.amount), 0),
    activeClients: clients.filter(c => c.status === "active").length,
    pendingTasks: tasks.filter(t => t.status === "todo" || t.status === "in_progress").length,
    totalExpenses: expenses.reduce((sum, expense) => sum + money(expense.amount), 0),
    overduePayments: payments.filter(p => p.status === "pending" && asNumber(p.dueDate) < now).length,
  };
}

function monthlyTotals(rows: LocalRecord[], field: string) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const date = new Date(asNumber(row[field]));
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    totals.set(key, (totals.get(key) ?? 0) + money(row.amount));
  }
  return Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, total]) => ({ month, total }));
}

export async function getMonthlyRevenue() {
  return monthlyTotals((await listPayments()).filter(payment => payment.status === "paid"), "dueDate");
}

export async function getMonthlyExpenses() {
  return monthlyTotals(await listExpenses(), "date");
}

export async function getTopServices() {
  const clients = await listClients();
  return [
    { name: "Meta Ads", count: clients.filter(client => client.metaAds).length },
    { name: "Google Ads", count: clients.filter(client => client.googleAds).length },
    { name: "Redes Sociais", count: clients.filter(client => client.socialMedia).length },
  ];
}

export async function listEvents(startRange?: number, endRange?: number) {
  const rows = await list("events");
  return rows
    .filter(event => !startRange || !endRange || (asNumber(event.startTime) >= startRange && asNumber(event.startTime) <= endRange))
    .sort((a, b) => asNumber(a.startTime) - asNumber(b.startTime));
}

export async function getEventById(id: number) {
  return (await list("events")).find(event => event.id === id);
}

export async function createEvent(data: Omit<InsertEvent, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("events", { type: "other", allDay: false, ...data });
  return { id: record.id };
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  await update("events", id, data);
}

export async function deleteEvent(id: number) {
  await remove("events", id);
}

export async function listNotifications(limit = 50) {
  return (await list("notifications")).sort(byNewest).slice(0, limit);
}

export async function getUnreadNotificationCount() {
  return (await listNotifications()).filter(notification => !notification.isRead).length;
}

export async function createNotification(data: Omit<InsertNotification, "id" | "createdAt">) {
  const record = await insert("notifications", { isRead: false, createdAt: nowDate(), ...data });
  return { id: record.id };
}

export async function markNotificationRead(id: number) {
  await update("notifications", id, { isRead: true });
}

export async function markAllNotificationsRead() {
  const rows = await list("notifications");
  rows.forEach(row => (row.isRead = true));
  await saveData();
}

export async function deleteNotification(id: number) {
  await remove("notifications", id);
}

export async function getMonthlyBillingForecast(year: number, month: number) {
  const [clients, payments] = await Promise.all([listClients(), listPayments()]);
  const monthStart = new Date(year, month - 1, 1).getTime();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  const activeClients = clients.filter(client => client.status === "active");
  const monthPayments = payments.filter(payment => asNumber(payment.dueDate) >= monthStart && asNumber(payment.dueDate) <= monthEnd);
  const details = activeClients.map(client => {
    const clientPayments = monthPayments.filter(payment => payment.clientId === client.id);
    const predicted = money(client.monthlyValue);
    const received = clientPayments.filter(payment => payment.status === "paid").reduce((sum, payment) => sum + money(payment.amount), 0);
    const pending = Math.max(predicted - received, 0);
    const status = received >= predicted && predicted > 0
      ? "paid"
      : clientPayments.some(payment => payment.status !== "paid" && asNumber(payment.dueDate) < nowMs())
        ? "overdue"
        : "pending";
    return { clientId: client.id, companyName: client.companyName, monthlyValue: predicted, received, pending, status, payments: clientPayments };
  });
  const predicted = details.reduce((sum, item) => sum + item.monthlyValue, 0);
  const received = details.reduce((sum, item) => sum + item.received, 0);
  return { predicted, received, pending: Math.max(predicted - received, 0), details };
}

export async function confirmPayment(paymentId: number) {
  await updatePayment(paymentId, { status: "paid", paidDate: nowMs() } as Partial<InsertPayment>);
}

export async function undoPayment(paymentId: number) {
  await updatePayment(paymentId, { status: "pending", paidDate: null } as Partial<InsertPayment>);
}

export async function deleteClientCascade(clientId: number) {
  for (const payment of await listPayments(clientId)) await deletePayment(payment.id);
  for (const document of await listDocuments(clientId)) await deleteDocument(document.id);
  for (const event of (await listEvents()).filter(item => item.clientId === clientId)) await deleteEvent(event.id);
  for (const task of (await listTasks()).filter(item => item.clientId === clientId)) await deleteTask(task.id);
  await deleteClient(clientId);
}

export async function getPaymentAlerts() {
  const payments = (await listPayments()).filter(payment => payment.status === "pending" || payment.status === "overdue");
  const clients = await listClients();
  const now = nowMs();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const enriched: any[] = payments.map(payment => {
    const client = clients.find(item => item.id === payment.clientId);
    return { ...payment, companyName: client?.companyName ?? "", logoUrl: client?.logoUrl ?? null };
  });
  return {
    overdue: enriched.filter(payment => asNumber(payment.dueDate) < now),
    dueSoon: enriched.filter(payment => asNumber(payment.dueDate) >= now && asNumber(payment.dueDate) - now <= threeDaysMs),
    ok: enriched.filter(payment => asNumber(payment.dueDate) - now > threeDaysMs),
  };
}

export async function getRevenueVsExpenses() {
  const revenue = await getMonthlyRevenue();
  const expenses = await getMonthlyExpenses();
  const months = Array.from(new Set([...revenue.map(item => item.month), ...expenses.map(item => item.month)])).sort().slice(-12);
  return months.map(month => ({
    month,
    revenue: revenue.find(item => item.month === month)?.total ?? 0,
    expenses: expenses.find(item => item.month === month)?.total ?? 0,
  }));
}

export async function getWeeklySummary() {
  const weekAgo = nowMs() - 7 * 24 * 60 * 60 * 1000;
  const [tasks, payments] = await Promise.all([listTasks(), listPayments()]);
  return {
    clientsServed: Array.from(new Set(tasks.filter(task => task.clientId && asNumber(new Date(task.updatedAt).getTime()) >= weekAgo).map(task => task.clientId))).length,
    tasksCompleted: tasks.filter(task => task.status === "done" && asNumber(new Date(task.updatedAt).getTime()) >= weekAgo).length,
    tasksPending: tasks.filter(task => task.status === "todo" || task.status === "in_progress").length,
    weeklyRevenue: payments.filter(payment => payment.status === "paid" && asNumber(payment.paidDate ?? payment.dueDate) >= weekAgo).reduce((sum, payment) => sum + money(payment.amount), 0),
  };
}

export async function getOrCreateProductionTracking(clientId: number, year: number, month: number) {
  const existing = (await list("productionTracking")).find(item => item.clientId === clientId && item.year === year && item.month === month);
  if (existing) return existing;
  return insert("productionTracking", { clientId, year, month, videosProduced: 0, imagesProduced: 0 } satisfies InsertProductionTracking as any);
}

export async function updateProductionTracking(clientId: number, year: number, month: number, videosProduced: number, imagesProduced: number) {
  const tracking = await getOrCreateProductionTracking(clientId, year, month);
  await update("productionTracking", tracking.id, { videosProduced, imagesProduced });
  return { ...tracking, videosProduced, imagesProduced };
}

export async function getProductionTrackingForClient(clientId: number, year: number, month: number) {
  const tracking = (await list("productionTracking")).find(item => item.clientId === clientId && item.year === year && item.month === month);
  const client = await getClientById(clientId);
  if (!tracking || !client) return null;
  const videoTarget = client.videoQuantity || 0;
  const imageTarget = client.imageQuantity || 0;
  return {
    ...tracking,
    videoTarget,
    imageTarget,
    videoProgress: ((tracking.videosProduced || 0) / (videoTarget || 1)) * 100,
    imageProgress: ((tracking.imagesProduced || 0) / (imageTarget || 1)) * 100,
  };
}

export async function deleteProductionTrackingForClient(clientId: number) {
  const data = await loadData();
  data.productionTracking = data.productionTracking.filter(item => item.clientId !== clientId);
  await saveData();
}

export async function listInvestments() {
  return (await list("investments")).sort(byDateDesc("date"));
}

export async function getInvestmentById(id: number) {
  return (await list("investments")).find(item => item.id === id);
}

export async function createInvestment(data: Omit<InsertInvestment, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("investments", data);
  return { id: record.id };
}

export async function updateInvestment(id: number, data: Partial<InsertInvestment>) {
  await update("investments", id, data);
}

export async function deleteInvestment(id: number) {
  await remove("investments", id);
}

export async function getInvestmentSummary() {
  const rows = await listInvestments();
  const fixed = rows.filter(item => item.type === "fixed").reduce((sum, item) => sum + money(item.amount), 0);
  const variable = rows.filter(item => item.type === "variable").reduce((sum, item) => sum + money(item.amount), 0);
  return { fixed, variable, total: fixed + variable };
}

export async function listCreditCardTransactions() {
  return (await list("creditCardTransactions")).sort(byDateDesc("transactionDate"));
}

export async function getCreditCardTransactionById(id: number) {
  return (await list("creditCardTransactions")).find(item => item.id === id);
}

export async function createCreditCardTransaction(data: Omit<InsertCreditCardTransaction, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("creditCardTransactions", { status: "pending", ...data });
  return { id: record.id };
}

export async function updateCreditCardTransaction(id: number, data: Partial<InsertCreditCardTransaction>) {
  await update("creditCardTransactions", id, data);
}

export async function deleteCreditCardTransaction(id: number) {
  await remove("creditCardTransactions", id);
}

export async function getCreditCardSummary() {
  const rows = await listCreditCardTransactions();
  const pending = rows.filter(item => item.status === "pending").reduce((sum, item) => sum + money(item.amount), 0);
  const paid = rows.filter(item => item.status === "paid").reduce((sum, item) => sum + money(item.amount), 0);
  return { pending, paid, total: pending + paid };
}

export async function markCreditCardAsPaid(id: number) {
  await updateCreditCardTransaction(id, { status: "paid", paidDate: nowMs() } as Partial<InsertCreditCardTransaction>);
}

export async function getCreditCardTransactionsByStatus(status: "pending" | "paid") {
  return (await listCreditCardTransactions()).filter(item => item.status === status);
}

export async function getOrCreateMonthlyPeriod(year: number, month: number) {
  const existing = (await list("monthlyPeriods")).find(item => item.year === year && item.month === month);
  if (existing) return existing;
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  return insert("monthlyPeriods", { year, month, startDate, endDate, status: "active" } satisfies InsertMonthlyPeriod as any);
}

export async function listMonthlyPeriods(limit = 24) {
  return (await list("monthlyPeriods")).sort((a, b) => b.year - a.year || b.month - a.month).slice(0, limit);
}

export async function getMonthlyPeriodById(id: number) {
  return (await list("monthlyPeriods")).find(item => item.id === id);
}

export async function updateMonthlyPeriodStatus(id: number, status: "active" | "closed" | "archived") {
  await update("monthlyPeriods", id, { status });
}

export async function getOrCreateMonthlyFinancialSummary(periodId: number) {
  const existing = (await list("monthlyFinancialSummary")).find(item => item.periodId === periodId);
  if (existing) return existing;
  return insert("monthlyFinancialSummary", {
    periodId,
    totalRevenue: "0",
    totalExpenses: "0",
    totalInvestments: "0",
    creditCardPending: "0",
    netProfit: "0",
  } satisfies InsertMonthlyFinancialSummary as any);
}

export async function updateMonthlyFinancialSummary(periodId: number, values: {
  totalRevenue?: number;
  totalExpenses?: number;
  totalInvestments?: number;
  creditCardPending?: number;
  netProfit?: number;
}) {
  const summary = await getOrCreateMonthlyFinancialSummary(periodId);
  const updateData = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value?.toString()]));
  await update("monthlyFinancialSummary", summary.id, updateData);
  return { ...summary, ...updateData };
}

export async function calculateMonthlyFinancialSummary(periodId: number) {
  const period = await getMonthlyPeriodById(periodId);
  if (!period) throw new Error("Period not found");
  const [payments, expenses, investments, creditCards] = await Promise.all([
    listPayments(),
    listExpenses(),
    listInvestments(),
    listCreditCardTransactions(),
  ]);
  const inPeriod = (field: string) => (item: LocalRecord) => asNumber(item[field]) >= period.startDate && asNumber(item[field]) <= period.endDate;
  const totalRevenue = payments.filter(payment => payment.status === "paid" && inPeriod("paidDate")(payment)).reduce((sum, payment) => sum + money(payment.amount), 0);
  const totalExpenses = expenses.filter(inPeriod("date")).reduce((sum, expense) => sum + money(expense.amount), 0);
  const totalInvestments = investments.filter(inPeriod("date")).reduce((sum, investment) => sum + money(investment.amount), 0);
  const creditCardPending = creditCards.filter(card => card.status === "pending" && inPeriod("transactionDate")(card)).reduce((sum, card) => sum + money(card.amount), 0);
  return updateMonthlyFinancialSummary(periodId, {
    totalRevenue,
    totalExpenses,
    totalInvestments,
    creditCardPending,
    netProfit: totalRevenue - totalExpenses - totalInvestments,
  });
}

export async function getOrCreateMonthlyBudget(periodId: number): Promise<any> {
  const existing = (await list("monthlyBudgets")).find(item => item.periodId === periodId);
  if (existing) return existing;
  return insert("monthlyBudgets", { periodId, forecastedRevenue: "0" } satisfies InsertMonthlyBudget as any);
}

export async function updateMonthlyBudget(budgetId: number, data: { forecastedRevenue?: number; profitTarget?: number; notes?: string }) {
  const updateData: Record<string, any> = {};
  if (data.forecastedRevenue !== undefined) updateData.forecastedRevenue = data.forecastedRevenue.toString();
  if (data.profitTarget !== undefined) updateData.profitTarget = data.profitTarget.toString();
  if (data.notes !== undefined) updateData.notes = data.notes;
  await update("monthlyBudgets", budgetId, updateData);
}

export async function createFixedCost(data: InsertFixedCost) {
  return insert("fixedCosts", data);
}

export async function getFixedCosts(budgetId: number) {
  return (await list("fixedCosts")).filter(item => item.budgetId === budgetId);
}

export async function updateFixedCost(id: number, data: Partial<InsertFixedCost>) {
  await update("fixedCosts", id, data);
}

export async function deleteFixedCost(id: number) {
  await remove("fixedCosts", id);
}

export async function createVariableCost(data: InsertVariableCost) {
  return insert("variableCosts", data);
}

export async function getVariableCosts(budgetId: number) {
  return (await list("variableCosts")).filter(item => item.budgetId === budgetId);
}

export async function updateVariableCost(id: number, data: Partial<InsertVariableCost>) {
  await update("variableCosts", id, data);
}

export async function deleteVariableCost(id: number) {
  await remove("variableCosts", id);
}

export async function createPersonalExpense(data: InsertPersonalExpense) {
  return insert("personalExpenses", data);
}

export async function getPersonalExpenses(budgetId: number) {
  return (await list("personalExpenses")).filter(item => item.budgetId === budgetId);
}

export async function updatePersonalExpense(id: number, data: Partial<InsertPersonalExpense>) {
  await update("personalExpenses", id, data);
}

export async function deletePersonalExpense(id: number) {
  await remove("personalExpenses", id);
}

export async function calculateBudgetMetrics(budgetId: number, collaboratorCosts = 0) {
  const budget = (await list("monthlyBudgets")).find(item => item.id === budgetId);
  if (!budget) throw new Error("Budget not found");
  const fixedCosts = await getFixedCosts(budgetId);
  const variableCosts = await getVariableCosts(budgetId);
  const personalExpenses = await getPersonalExpenses(budgetId);
  const forecastedRevenue = money(budget.forecastedRevenue);
  const totalFixedCosts = fixedCosts.reduce((sum, item) => sum + money(item.amount), 0);
  const totalVariableCosts = variableCosts.reduce((sum, item) => sum + money(item.amount), 0);
  const totalPersonalExpenses = personalExpenses.reduce((sum, item) => sum + money(item.amount), 0);
  const totalExpenses = totalFixedCosts + totalVariableCosts + totalPersonalExpenses + collaboratorCosts;
  const netProfitForecast = forecastedRevenue - totalExpenses;
  const profitMarginPercentage = forecastedRevenue > 0 ? Math.max(-999.99, Math.min(999.99, (netProfitForecast / forecastedRevenue) * 100)) : 0;
  const calcData = {
    budgetId,
    forecastedRevenue: forecastedRevenue.toString(),
    totalFixedCosts: totalFixedCosts.toString(),
    totalVariableCosts: totalVariableCosts.toString(),
    totalPersonalExpenses: totalPersonalExpenses.toString(),
    totalCollaboratorCosts: collaboratorCosts.toString(),
    totalExpenses: totalExpenses.toString(),
    netProfitForecast: netProfitForecast.toString(),
    breakEvenPoint: totalExpenses.toString(),
    safetyMargin: Math.max(forecastedRevenue - totalExpenses, 0).toString(),
    profitMarginPercentage: profitMarginPercentage.toString(),
    status: netProfitForecast > 0 ? "positive" : netProfitForecast > -1000 ? "warning" : "negative",
  };
  const existing = (await list("budgetCalculations")).find(item => item.budgetId === budgetId);
  if (existing) {
    await update("budgetCalculations", existing.id, calcData);
    return { ...existing, ...calcData };
  }
  return insert("budgetCalculations", calcData);
}

export async function getBudgetCalculations(budgetId: number) {
  return (await list("budgetCalculations")).filter(item => item.budgetId === budgetId);
}

export async function listBudgetLimits() {
  return (await list("budgetLimits")).filter(item => item.isActive !== false);
}

export async function upsertBudgetLimit(input: {
  category: string;
  costType: "fixed" | "variable" | "personal";
  limitAmount: number;
  description?: string | null;
}) {
  const existing = (await list("budgetLimits")).find(item => item.category === input.category && item.costType === input.costType);
  const values = {
    category: input.category,
    costType: input.costType,
    limitAmount: input.limitAmount.toString(),
    description: input.description ?? null,
    isActive: true,
  };
  if (existing) {
    await update("budgetLimits", existing.id, values);
    return existing.id;
  }
  const record = await insert("budgetLimits", values);
  return record.id;
}
