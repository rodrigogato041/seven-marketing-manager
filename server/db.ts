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
  InsertContentItem,
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
  | "contentItems"
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

if (ENV.isProduction && !ENV.dataDir) {
  throw new Error("DATA_DIR must be configured in production. Attach a persistent disk and set DATA_DIR to a path inside it.");
}

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
  "contentItems",
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
const roundMoney = (value: number) => Math.round(value * 100) / 100;

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
const DAY_MS = 24 * 60 * 60 * 1000;

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
    contractStatus: "pending",
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
    taskType: "administrative",
    checklist: "[]",
    recurrence: "none",
    recurrenceEvery: 1,
    comments: "[]",
    history: "[]",
    relatedLinks: "[]",
    attachmentLinks: "[]",
    sortOrder: 0,
    ...data,
  });
  return { id: record.id };
}

function parseJsonArray(value: unknown) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function taskHistoryEntry(action: string, details: Record<string, unknown> = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    details,
    createdAt: new Date().toISOString(),
  };
}

function addDaysTimestamp(value: number, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function nextRecurringDueDate(task: LocalRecord) {
  const base = asNumber(task.dueDate || nowMs());
  const every = Math.max(1, asNumber(task.recurrenceEvery) || 1);
  if (task.recurrence === "daily") return addDaysTimestamp(base, every);
  if (task.recurrence === "weekly") return addDaysTimestamp(base, 7 * every);
  if (task.recurrence === "biweekly") return addDaysTimestamp(base, 14 * every);
  if (task.recurrence === "monthly") {
    const date = new Date(base);
    date.setMonth(date.getMonth() + every);
    return date.getTime();
  }
  if (task.recurrence === "custom") return addDaysTimestamp(base, every);
  return null;
}

function resetChecklistForRecurrence(value: unknown) {
  return JSON.stringify(parseJsonArray(value).map(item => ({ ...item, done: false })));
}

async function createNextRecurringTask(task: LocalRecord) {
  if (!task.recurrence || task.recurrence === "none") return;
  const dueDate = nextRecurringDueDate(task);
  if (!dueDate) return;
  if (task.recurrenceUntil && dueDate > asNumber(task.recurrenceUntil)) return;
  await createTask({
    title: task.title,
    description: task.description,
    status: "todo",
    priority: task.priority,
    taskType: task.taskType,
    checklist: resetChecklistForRecurrence(task.checklist),
    recurrence: task.recurrence,
    recurrenceEvery: task.recurrenceEvery,
    recurrenceUntil: task.recurrenceUntil,
    recurrenceParentId: task.recurrenceParentId || task.id,
    comments: "[]",
    history: JSON.stringify([taskHistoryEntry("Tarefa criada automaticamente pela recorrência", { sourceTaskId: task.id })]),
    relatedLinks: task.relatedLinks || "[]",
    attachmentLinks: task.attachmentLinks || "[]",
    clientId: task.clientId,
    collaboratorId: task.collaboratorId,
    dueDate,
    sortOrder: task.sortOrder,
  } as any);
  await update("tasks", task.id, { recurrenceLastGeneratedAt: nowMs() });
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const existing = await getTaskById(id);
  if (!existing) return;
  const previousTask = { ...existing };
  const history = parseJsonArray(existing.history);
  const trackedFields: { key: keyof InsertTask; label: string }[] = [
    { key: "status", label: "Status alterado" },
    { key: "collaboratorId", label: "Responsável alterado" },
    { key: "dueDate", label: "Prazo alterado" },
    { key: "priority", label: "Prioridade alterada" },
  ];
  for (const field of trackedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field.key) && (data as any)[field.key] !== (existing as any)[field.key]) {
      history.push(taskHistoryEntry(field.label, { from: (existing as any)[field.key] ?? null, to: (data as any)[field.key] ?? null }));
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, "checklist") && data.checklist !== existing.checklist) {
    history.push(taskHistoryEntry("Checklist atualizado"));
  }
  await update("tasks", id, {
    ...data,
    history: history.length ? JSON.stringify(history.slice(-50)) : existing.history,
  });
  if (previousTask.status !== "done" && data.status === "done") {
    await createNextRecurringTask({ ...previousTask, ...data });
  }
}

export async function deleteTask(id: number) {
  await remove("tasks", id);
}

export async function updateTasksOrder(updates: { id: number; status: string; sortOrder: number }[]) {
  for (const item of updates) {
    await updateTask(item.id, { status: item.status as any, sortOrder: item.sortOrder });
  }
}

export async function addTaskComment(id: number, text: string, author = "Seven Admin") {
  const task = await getTaskById(id);
  if (!task) return null;
  const comments = parseJsonArray(task.comments);
  const history = parseJsonArray(task.history);
  comments.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    author,
    createdAt: new Date().toISOString(),
  });
  history.push(taskHistoryEntry("Comentário adicionado"));
  await update("tasks", id, {
    comments: JSON.stringify(comments.slice(-100)),
    history: JSON.stringify(history.slice(-50)),
  });
  return { success: true };
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

type CollectionStatus = "pending" | "sent" | "responded" | "paid" | "overdue" | "negotiated";

const collectionStatusLabels: Record<CollectionStatus, string> = {
  pending: "Pendente",
  sent: "Cobrança enviada",
  responded: "Cliente respondeu",
  paid: "Pago",
  overdue: "Atrasado",
  negotiated: "Negociado",
};

function defaultCollectionStatus(payment: LocalRecord, referenceDate = nowMs()): CollectionStatus {
  if (payment.status === "paid") return "paid";
  if (payment.collectionStatus && collectionStatusLabels[payment.collectionStatus as CollectionStatus]) return payment.collectionStatus as CollectionStatus;
  return asNumber(payment.dueDate) < referenceDate ? "overdue" : "pending";
}

function collectionHistoryEntry(action: string, details: Record<string, unknown> = {}, author = "Seven Admin") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    details,
    author,
    createdAt: new Date().toISOString(),
  };
}

function buildCollectionRecord(payment: LocalRecord, client?: LocalRecord, referenceDate = nowMs()) {
  const amount = money(payment.amount);
  const daysLate = Math.floor((referenceDate - asNumber(payment.dueDate)) / DAY_MS);
  const status = defaultCollectionStatus(payment, referenceDate);
  const history = parseJsonArray(payment.collectionHistory);
  const notes = parseJsonArray(payment.collectionNotes);
  return {
    paymentId: payment.id,
    clientId: payment.clientId,
    companyName: client?.companyName ?? "Cliente sem nome",
    contactName: client?.contactName ?? "",
    whatsapp: client?.whatsapp ?? client?.phone ?? "",
    email: client?.email ?? "",
    description: payment.description ?? "",
    amount: roundMoney(amount),
    dueDate: payment.dueDate,
    paidDate: payment.paidDate ?? null,
    paymentStatus: payment.status,
    collectionStatus: status,
    collectionStatusLabel: collectionStatusLabels[status],
    daysLate: Math.max(daysLate, 0),
    priority: daysLate > 7 || amount >= 2000 ? "Alta" : daysLate > 0 ? "Média" : "Normal",
    lastContactAt: payment.collectionLastContactAt ?? null,
    nextFollowUpAt: payment.collectionNextFollowUpAt ?? null,
    history,
    notes,
    message: paymentMessage(client?.companyName ?? "sua empresa", amount),
  };
}

export async function getCollectionsCenter() {
  const [payments, clients] = await Promise.all([listPayments(), listClients()]);
  const clientsById = new Map(clients.map(client => [client.id, client]));
  const now = nowMs();
  const collections = payments
    .filter(payment => payment.status !== "paid" || payment.collectionStatus === "paid")
    .map(payment => buildCollectionRecord(payment, clientsById.get(payment.clientId), now))
    .filter(item => item.paymentStatus !== "paid" || item.collectionStatus === "paid")
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { Alta: 0, Média: 1, Normal: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || asNumber(a.dueDate) - asNumber(b.dueDate);
    });
  const openCollections = collections.filter(item => item.collectionStatus !== "paid");
  return {
    summary: {
      totalOpen: openCollections.length,
      overdue: openCollections.filter(item => item.collectionStatus === "overdue").length,
      sent: openCollections.filter(item => item.collectionStatus === "sent").length,
      responded: openCollections.filter(item => item.collectionStatus === "responded").length,
      negotiated: openCollections.filter(item => item.collectionStatus === "negotiated").length,
      totalAmount: roundMoney(openCollections.reduce((sum, item) => sum + item.amount, 0)),
      overdueAmount: roundMoney(openCollections.filter(item => item.collectionStatus === "overdue").reduce((sum, item) => sum + item.amount, 0)),
    },
    collections,
  };
}

export async function updateCollectionStatus(paymentId: number, status: CollectionStatus, author = "Seven Admin") {
  const payment = (await listPayments()).find(item => item.id === paymentId);
  if (!payment) return null;
  const history = parseJsonArray(payment.collectionHistory);
  history.push(collectionHistoryEntry("Status da cobrança alterado", {
    from: defaultCollectionStatus(payment),
    to: status,
  }, author));
  const updateData: Record<string, any> = {
    collectionStatus: status,
    collectionHistory: JSON.stringify(history.slice(-100)),
  };
  if (status === "sent") updateData.collectionLastContactAt = nowMs();
  if (status === "paid") {
    updateData.status = "paid";
    updateData.paidDate = nowMs();
  } else if (payment.status === "paid") {
    updateData.status = asNumber(payment.dueDate) < nowMs() ? "overdue" : "pending";
    updateData.paidDate = null;
  }
  await update("payments", paymentId, updateData);
  return { success: true };
}

export async function addCollectionNote(paymentId: number, note: string, author = "Seven Admin", nextFollowUpAt?: number | null) {
  const payment = (await listPayments()).find(item => item.id === paymentId);
  if (!payment) return null;
  const notes = parseJsonArray(payment.collectionNotes);
  const history = parseJsonArray(payment.collectionHistory);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    note,
    author,
    createdAt: new Date().toISOString(),
    nextFollowUpAt: nextFollowUpAt ?? null,
  };
  notes.push(entry);
  history.push(collectionHistoryEntry("Observação de cobrança adicionada", { note, nextFollowUpAt: nextFollowUpAt ?? null }, author));
  await update("payments", paymentId, {
    collectionNotes: JSON.stringify(notes.slice(-100)),
    collectionHistory: JSON.stringify(history.slice(-100)),
    collectionNextFollowUpAt: nextFollowUpAt ?? payment.collectionNextFollowUpAt ?? null,
  } as any);
  return { success: true };
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function companyHealthStatus(score: number) {
  if (score <= 39) return { key: "critical", label: "Crítico", tone: "critical" };
  if (score <= 59) return { key: "attention", label: "Atenção", tone: "warning" };
  if (score <= 79) return { key: "healthy", label: "Saudável", tone: "good" };
  return { key: "excellent", label: "Excelente", tone: "excellent" };
}

function recommendation(severity: string, title: string, description: string, href: string, action: string) {
  return { severity, title, description, href, action };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return roundMoney(((current - previous) / previous) * 100);
}

function sumPaymentsInRange(payments: LocalRecord[], start: number, end: number, mode: "predicted" | "received") {
  return payments
    .filter(payment => {
      const field = mode === "received" ? payment.paidDate ?? payment.dueDate : payment.dueDate;
      return asNumber(field) >= start && asNumber(field) <= end && (mode === "predicted" || payment.status === "paid");
    })
    .reduce((sum, payment) => sum + money(payment.amount), 0);
}

function sumExpensesInRange(expenses: LocalRecord[], start: number, end: number) {
  return expenses
    .filter(expense => asNumber(expense.date) >= start && asNumber(expense.date) <= end)
    .reduce((sum, expense) => sum + money(expense.amount), 0);
}

function periodLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function buildComparison(label: string, current: number, previous: number) {
  return {
    label,
    current: roundMoney(current),
    previous: roundMoney(previous),
    difference: roundMoney(current - previous),
    changePercent: percentChange(current, previous),
    trend: current > previous ? "up" : current < previous ? "down" : "stable",
  };
}

export async function getExecutiveDashboard() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const previousMonthDate = new Date(year, month - 2, 1);
  const [finance, commandCenter, clientIntelligence, contentSummary, previousForecast] = await Promise.all([
    getStrategicFinance(year, month),
    getTodayCommandCenter(),
    getClientIntelligence(),
    getContentStudioSummary(year, month),
    getMonthlyBillingForecast(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1),
  ]);

  const grossRevenue = money(finance.dre.grossRevenue);
  const receivedRevenue = money(finance.dre.receivedRevenue);
  const pendingRevenue = money(finance.dre.pendingRevenue);
  const netProfit = money(finance.dre.netProfit);
  const netMargin = money(finance.dre.netMargin);
  const fixedCostRate = grossRevenue > 0 ? money(finance.dre.fixedCosts) / grossRevenue : 0;
  const pendingRate = grossRevenue > 0 ? pendingRevenue / grossRevenue : 0;
  const previousRevenue = money(previousForecast.predicted);
  const revenueGrowth = previousRevenue > 0 ? roundMoney(((grossRevenue - previousRevenue) / previousRevenue) * 100) : grossRevenue > 0 ? 100 : 0;
  const cashWindows = finance.cashflow ?? [];
  const hasNegativeCashWindow = cashWindows.some((item: any) => money(item.projectedBalance) < 0);
  const worstCashWindow = [...cashWindows].sort((a: any, b: any) => money(a.projectedBalance) - money(b.projectedBalance))[0] ?? null;
  const riskClients = clientIntelligence.summary.risk + clientIntelligence.summary.delinquent;
  const contentPending = contentSummary.summary.awaitingApproval + contentSummary.summary.overdue;

  const financeScore = clampScore(
    100
    - (netProfit < 0 ? 30 : netMargin < 15 ? 18 : netMargin < 25 ? 8 : 0)
    - (pendingRate > 0.5 ? 20 : pendingRate > 0.35 ? 12 : pendingRate > 0.2 ? 6 : 0)
    - (fixedCostRate > 0.65 ? 18 : fixedCostRate > 0.5 ? 10 : 0)
    - (finance.concentration.topTwoShare >= 60 ? 8 : 0)
  );
  const clientScore = clampScore(
    clientIntelligence.summary.averageScore
    - Math.min(18, riskClients * 5)
    - Math.min(12, clientIntelligence.summary.contractAlerts * 2)
  );
  const operationScore = clampScore(
    100
    - Math.min(30, commandCenter.counts.overdueTasks * 6)
    - Math.min(22, commandCenter.counts.productionPending * 4)
    - Math.min(12, contentPending * 2)
  );
  const cashScore = clampScore(
    100
    - (hasNegativeCashWindow ? 35 : 0)
    - (pendingRate > 0.35 ? 15 : pendingRate > 0.2 ? 8 : 0)
    - (finance.dre.finalBalance < 0 ? 20 : finance.dre.finalBalance < grossRevenue * 0.1 ? 8 : 0)
  );
  const growthScore = clampScore(revenueGrowth < -10 ? 45 : revenueGrowth < 0 ? 65 : revenueGrowth < 8 ? 78 : 90);
  const score = clampScore(
    financeScore * 0.35
    + clientScore * 0.25
    + operationScore * 0.2
    + cashScore * 0.1
    + growthScore * 0.1
  );
  const status = companyHealthStatus(score);

  const recommendations = [
    commandCenter.counts.overduePayments > 0 ? recommendation(
      "critical",
      "Priorizar cobranças atrasadas",
      `${commandCenter.counts.overduePayments} pagamento(s) estão vencidos e afetam o caixa do mês.`,
      "/financeiro",
      "Ver financeiro"
    ) : null,
    commandCenter.counts.overdueTasks > 0 ? recommendation(
      "high",
      "Destravar tarefas atrasadas",
      `${commandCenter.counts.overdueTasks} tarefa(s) atrasada(s) podem comprometer entrega e retenção.`,
      "/tarefas",
      "Abrir tarefas"
    ) : null,
    commandCenter.counts.productionPending > 0 ? recommendation(
      "medium",
      "Revisar produção pendente",
      `${commandCenter.counts.productionPending} cliente(s) têm produção do mês ainda em aberto.`,
      "/producao",
      "Ver produção"
    ) : null,
    riskClients > 0 ? recommendation(
      "high",
      "Cuidar de clientes em risco",
      `${riskClients} cliente(s) aparecem em risco ou inadimplência no radar de relacionamento.`,
      "/clientes",
      "Ver clientes"
    ) : null,
    clientIntelligence.summary.contractAlerts > 0 ? recommendation(
      "medium",
      "Atualizar contratos",
      `${clientIntelligence.summary.contractAlerts} contrato(s) precisam de conferência ou renovação.`,
      "/clientes",
      "Ver contratos"
    ) : null,
    hasNegativeCashWindow ? recommendation(
      "critical",
      "Proteger o caixa projetado",
      `A janela ${worstCashWindow?.label ?? "projetada"} indica saldo negativo se nada mudar.`,
      "/financeiro",
      "Ver fluxo"
    ) : null,
    finance.concentration.topTwoShare >= 60 ? recommendation(
      "medium",
      "Reduzir concentração de receita",
      `Os dois maiores clientes concentram ${finance.concentration.topTwoShare}% da receita prevista.`,
      "/clientes",
      "Analisar carteira"
    ) : null,
  ].filter(Boolean);

  const primaryInsight = score >= 80
    ? "A empresa está saudável. O foco agora é manter cadência de entrega, proteger margem e buscar crescimento controlado."
    : score >= 60
      ? "A empresa está em boa condição, mas existem pontos que merecem ação antes que virem gargalo."
      : score >= 40
        ? "A operação exige atenção. O melhor movimento é reduzir pendências, controlar custos e priorizar caixa."
        : "A empresa está em zona crítica. A prioridade deve ser caixa, cobrança, tarefas atrasadas e revisão imediata de custos.";

  return {
    period: { year, month },
    health: {
      score,
      status,
      insight: primaryInsight,
      components: [
        { key: "finance", label: "Financeiro", score: financeScore },
        { key: "clients", label: "Clientes", score: clientScore },
        { key: "operations", label: "Operação", score: operationScore },
        { key: "cash", label: "Caixa", score: cashScore },
        { key: "growth", label: "Crescimento", score: growthScore },
      ],
    },
    metrics: {
      grossRevenue: roundMoney(grossRevenue),
      receivedRevenue: roundMoney(receivedRevenue),
      pendingRevenue: roundMoney(pendingRevenue),
      expenses: roundMoney(money(finance.dre.operationalExpenses) + money(finance.dre.personalExpenses) + money(finance.dre.creditCardPending)),
      netProfit: roundMoney(netProfit),
      netMargin: roundMoney(netMargin),
      activeClients: clientIntelligence.summary.activeClients,
      clientsAtRisk: riskClients,
      pendingTasks: commandCenter.counts.tasksDueToday + commandCenter.counts.overdueTasks,
      overdueTasks: commandCenter.counts.overdueTasks,
      pendingProduction: commandCenter.counts.productionPending,
      paymentsDueSoon: commandCenter.counts.paymentsDueToday + commandCenter.counts.paymentsDueSoon,
      overduePayments: commandCenter.counts.overduePayments,
      contentPending,
      revenueGrowth,
      topTwoRevenueShare: finance.concentration.topTwoShare,
      projectedCash30Days: cashWindows.find((item: any) => item.days === 30)?.projectedBalance ?? null,
    },
    alerts: [
      ...finance.riskAlerts.slice(0, 4).map((alert: any) => ({
        level: alert.level,
        title: alert.title,
        description: alert.description,
      })),
      ...commandCenter.criticalAlerts.filter(Boolean).slice(0, 3).map((alert) => ({
        level: "high",
        title: "Alerta operacional",
        description: alert,
      })),
    ].slice(0, 6),
    recommendations: recommendations.slice(0, 5),
  };
}

export async function getReportsCenter(year: number, month: number) {
  const { start, end } = getMonthRange(year, month);
  const previousDate = new Date(year, month - 2, 1);
  const previousRange = getMonthRange(previousDate.getFullYear(), previousDate.getMonth() + 1);
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const quarterStart = new Date(year, quarterStartMonth - 1, 1).getTime();
  const quarterEnd = new Date(year, quarterStartMonth + 2, 0, 23, 59, 59, 999).getTime();
  const previousQuarterEndDate = new Date(year, quarterStartMonth - 1, 0, 23, 59, 59, 999);
  const previousQuarterStartDate = new Date(previousQuarterEndDate.getFullYear(), previousQuarterEndDate.getMonth() - 2, 1);
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  const previousYearStart = new Date(year - 1, 0, 1).getTime();
  const previousYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999).getTime();

  const [clients, payments, expenses, tasks, collaborators, production, finance, contentSummary] = await Promise.all([
    listClients(),
    listPayments(),
    listExpenses(),
    listTasks(),
    listCollaborators(),
    list("productionTracking"),
    getStrategicFinance(year, month),
    getContentStudioSummary(year, month),
  ]);

  const activeClients = clients.filter(client => client.status === "active");
  const clientsById = new Map(clients.map(client => [client.id, client]));
  const collaboratorsById = new Map(collaborators.map(collaborator => [collaborator.id, collaborator]));
  const monthPayments = payments.filter(payment => isInRange(payment.dueDate, start, end) || isInRange(payment.paidDate, start, end));
  const monthExpenses = expenses.filter(expense => isInRange(expense.date, start, end));
  const monthTasks = tasks.filter(task => {
    const created = asNumber(new Date(task.createdAt).getTime());
    const due = asNumber(task.dueDate);
    const updated = asNumber(new Date(task.updatedAt).getTime());
    return isInRange(created, start, end) || isInRange(due, start, end) || isInRange(updated, start, end);
  });
  const monthProduction = production.filter(item => item.year === year && item.month === month);
  const receivedRevenue = monthPayments.filter(payment => payment.status === "paid").reduce((sum, payment) => sum + money(payment.amount), 0);
  const predictedRevenue = activeClients.reduce((sum, client) => sum + money(client.monthlyValue), 0);
  const pendingPayments = payments
    .filter(payment => payment.status !== "paid")
    .map(payment => ({
      id: payment.id,
      clientId: payment.clientId,
      companyName: clientsById.get(payment.clientId)?.companyName ?? "Cliente sem nome",
      description: payment.description ?? "",
      amount: roundMoney(money(payment.amount)),
      dueDate: payment.dueDate,
      status: asNumber(payment.dueDate) < nowMs() ? "overdue" : payment.status,
    }))
    .sort((a, b) => asNumber(a.dueDate) - asNumber(b.dueDate));

  const revenueByClient = activeClients
    .map(client => {
      const clientPayments = monthPayments.filter(payment => payment.clientId === client.id);
      const received = clientPayments.filter(payment => payment.status === "paid").reduce((sum, payment) => sum + money(payment.amount), 0);
      const predicted = money(client.monthlyValue);
      return {
        clientId: client.id,
        companyName: client.companyName,
        predicted: roundMoney(predicted),
        received: roundMoney(received),
        pending: roundMoney(Math.max(predicted - received, 0)),
      };
    })
    .sort((a, b) => b.predicted - a.predicted);

  const expensesByCategoryMap: Record<string, { category: string; total: number; count: number }> = {};
  for (const expense of monthExpenses) {
    const category = expense.category || "Sem categoria";
    expensesByCategoryMap[category] ??= { category, total: 0, count: 0 };
    expensesByCategoryMap[category].total += money(expense.amount);
    expensesByCategoryMap[category].count += 1;
  }
  const expensesByCategory = Object.values(expensesByCategoryMap)
    .map(item => ({
      category: item.category,
      count: item.count,
      total: roundMoney(item.total),
      percentage: monthExpenses.length > 0 ? roundMoney((item.total / Math.max(1, sumExpensesInRange(monthExpenses, start, end))) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const delinquentClients = revenueByClient
    .filter(client => pendingPayments.some(payment => payment.clientId === client.clientId && payment.status === "overdue"))
    .map(client => ({
      ...client,
      overdueAmount: roundMoney(pendingPayments.filter(payment => payment.clientId === client.clientId && payment.status === "overdue").reduce((sum, payment) => sum + payment.amount, 0)),
    }));

  const productionByClient = activeClients
    .map(client => {
      const tracking = monthProduction.find(item => item.clientId === client.id);
      const contractedVideos = asNumber(client.videoQuantity);
      const contractedImages = asNumber(client.imageQuantity);
      const deliveredVideos = asNumber(tracking?.videosProduced);
      const deliveredImages = asNumber(tracking?.imagesProduced);
      const contracted = contractedVideos + contractedImages;
      const delivered = deliveredVideos + deliveredImages;
      return {
        clientId: client.id,
        companyName: client.companyName,
        contractedVideos,
        deliveredVideos,
        contractedImages,
        deliveredImages,
        contracted,
        delivered,
        pending: Math.max(contracted - delivered, 0),
        completionRate: contracted > 0 ? roundMoney((delivered / contracted) * 100) : 100,
      };
    })
    .sort((a, b) => b.pending - a.pending || a.companyName.localeCompare(b.companyName));

  const tasksByCollaboratorMap: Record<number, { collaboratorId: number; name: string; total: number; completed: number; open: number; overdue: number }> = {};
  for (const task of monthTasks) {
    const collaboratorId = task.collaboratorId ?? 0;
    const name = collaboratorId ? collaboratorsById.get(collaboratorId)?.name ?? "Colaborador" : "Sem responsavel";
    tasksByCollaboratorMap[collaboratorId] ??= { collaboratorId, name, total: 0, completed: 0, open: 0, overdue: 0 };
    tasksByCollaboratorMap[collaboratorId].total += 1;
    if (task.status === "done") tasksByCollaboratorMap[collaboratorId].completed += 1;
    else tasksByCollaboratorMap[collaboratorId].open += 1;
    if (task.status !== "done" && task.dueDate && asNumber(task.dueDate) < nowMs()) tasksByCollaboratorMap[collaboratorId].overdue += 1;
  }
  const tasksByCollaborator = Object.values(tasksByCollaboratorMap)
    .sort((a, b) => b.open - a.open || b.total - a.total);

  const clientMonthlyReports = activeClients.map(client => ({
    clientId: client.id,
    companyName: client.companyName,
    services: serviceListForClient(client),
    monthlyValue: roundMoney(money(client.monthlyValue)),
    production: productionByClient.find(item => item.clientId === client.id),
    revenue: revenueByClient.find(item => item.clientId === client.id),
    tasks: {
      total: monthTasks.filter(task => task.clientId === client.id).length,
      completed: monthTasks.filter(task => task.clientId === client.id && task.status === "done").length,
      open: monthTasks.filter(task => task.clientId === client.id && task.status !== "done").length,
    },
  }));

  const actualExpenses = sumExpensesInRange(expenses, start, end);
  const plannedExpenses = money(finance.dre.fixedCosts) + money(finance.dre.variableCosts) + money(finance.dre.personalExpenses) + money(finance.dre.collaboratorCosts);
  const currentMonthRevenue = sumPaymentsInRange(payments, start, end, "received");
  const previousMonthRevenue = sumPaymentsInRange(payments, previousRange.start, previousRange.end, "received");
  const quarterRevenue = sumPaymentsInRange(payments, quarterStart, quarterEnd, "received");
  const previousQuarterRevenue = sumPaymentsInRange(payments, previousQuarterStartDate.getTime(), previousQuarterEndDate.getTime(), "received");
  const currentYearRevenue = sumPaymentsInRange(payments, yearStart, yearEnd, "received");
  const previousYearRevenue = sumPaymentsInRange(payments, previousYearStart, previousYearEnd, "received");
  const totalContractedProduction = productionByClient.reduce((sum, item) => sum + item.contracted, 0);
  const totalDeliveredProduction = productionByClient.reduce((sum, item) => sum + item.delivered, 0);

  return {
    period: {
      year,
      month,
      label: periodLabel(year, month),
      startDate: start,
      endDate: end,
    },
    summary: {
      predictedRevenue: roundMoney(predictedRevenue),
      receivedRevenue: roundMoney(receivedRevenue),
      pendingRevenue: roundMoney(Math.max(predictedRevenue - receivedRevenue, 0)),
      expenses: roundMoney(actualExpenses),
      netProfit: roundMoney(receivedRevenue - actualExpenses),
      netMargin: receivedRevenue > 0 ? roundMoney(((receivedRevenue - actualExpenses) / receivedRevenue) * 100) : 0,
      activeClients: activeClients.length,
      delinquentClients: delinquentClients.length,
      pendingPayments: pendingPayments.length,
      productionPending: productionByClient.filter(item => item.pending > 0).length,
      tasksOpen: tasksByCollaborator.reduce((sum, item) => sum + item.open, 0),
      contentAwaitingApproval: contentSummary.summary.awaitingApproval,
    },
    reports: {
      financialMonthly: {
        dre: finance.dre,
        cashflow: finance.cashflow,
        riskAlerts: finance.riskAlerts,
      },
      expensesByCategory,
      revenueByClient,
      pendingPayments,
      activeClients: activeClients.map(client => ({
        id: client.id,
        companyName: client.companyName,
        contactName: client.contactName,
        monthlyValue: roundMoney(money(client.monthlyValue)),
        services: serviceListForClient(client),
      })),
      delinquentClients,
      productionByClient,
      tasksByCollaborator,
      clientMonthlyReports,
      projectedCashflow: finance.cashflow,
    },
    comparisons: {
      currentVsPreviousMonth: buildComparison("Mes atual x mes anterior", currentMonthRevenue, previousMonthRevenue),
      currentVsPreviousQuarter: buildComparison("Trimestre atual x trimestre anterior", quarterRevenue, previousQuarterRevenue),
      currentVsPreviousYear: buildComparison("Ano atual x ano anterior", currentYearRevenue, previousYearRevenue),
      predictedVsReceived: {
        label: "Receita prevista x recebida",
        predicted: roundMoney(predictedRevenue),
        received: roundMoney(receivedRevenue),
        gap: roundMoney(predictedRevenue - receivedRevenue),
        completionPercent: predictedRevenue > 0 ? roundMoney((receivedRevenue / predictedRevenue) * 100) : 0,
      },
      plannedVsActualExpenses: {
        label: "Despesa planejada x real",
        planned: roundMoney(plannedExpenses),
        actual: roundMoney(actualExpenses),
        difference: roundMoney(plannedExpenses - actualExpenses),
        usagePercent: plannedExpenses > 0 ? roundMoney((actualExpenses / plannedExpenses) * 100) : 0,
      },
      contractedVsDeliveredProduction: {
        label: "Producao contratada x entregue",
        contracted: totalContractedProduction,
        delivered: totalDeliveredProduction,
        pending: Math.max(totalContractedProduction - totalDeliveredProduction, 0),
        completionPercent: totalContractedProduction > 0 ? roundMoney((totalDeliveredProduction / totalContractedProduction) * 100) : 100,
      },
    },
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
  for (const content of await listContentItems({ clientId })) await deleteContentItem(content.id);
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

function getDayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
  return { start, end };
}

function textMatches(query: string, values: unknown[]) {
  const normalized = query.trim().toLowerCase();
  return values
    .filter(value => value !== null && value !== undefined)
    .some(value => String(value).toLowerCase().includes(normalized));
}

export async function getTodayCommandCenter() {
  const today = new Date();
  const { start, end } = getDayRange(today);
  const threeDaysEnd = end + 3 * 24 * 60 * 60 * 1000;
  const [tasks, events, payments, clients, production, documents] = await Promise.all([
    listTasks(),
    listEvents(start, end),
    listPayments(),
    listClients(),
    list("productionTracking"),
    listDocuments(),
  ]);

  const clientsById = new Map(clients.map(client => [client.id, client]));
  const openTasks = tasks.filter(task => task.status !== "done");
  const tasksDueToday = openTasks.filter(task => asNumber(task.dueDate) >= start && asNumber(task.dueDate) <= end);
  const overdueTasks = openTasks.filter(task => task.dueDate && asNumber(task.dueDate) < start);
  const meetingsToday = events.filter(event => event.type === "meeting");
  const pendingPayments = payments.filter(payment => payment.status === "pending" || payment.status === "overdue");
  const enrichPayment = (payment: any) => ({
    ...payment,
    companyName: clientsById.get(payment.clientId)?.companyName ?? "Cliente sem nome",
  });
  const paymentsDueToday = pendingPayments
    .filter(payment => asNumber(payment.dueDate) >= start && asNumber(payment.dueDate) <= end)
    .map(enrichPayment);
  const paymentsDueSoon = pendingPayments
    .filter(payment => asNumber(payment.dueDate) > end && asNumber(payment.dueDate) <= threeDaysEnd)
    .map(enrichPayment);
  const overduePayments = pendingPayments
    .filter(payment => asNumber(payment.dueDate) < start)
    .map(enrichPayment);

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const activeClients = clients.filter(client => client.status === "active");
  const contractAlerts = activeClients
    .map(client => buildContractInsight(client, documents))
    .filter(contract => ["missing", "pending", "expired", "due_7", "due_15", "due_30"].includes(contract.key))
    .sort((a, b) => {
      const severityWeight = { critical: 0, warning: 1, info: 2, ok: 3 };
      return severityWeight[a.severity] - severityWeight[b.severity] || asNumber(a.daysUntil ?? 9999) - asNumber(b.daysUntil ?? 9999);
    });
  const productionPending = activeClients
    .map(client => {
      const tracking = production.find(item => item.clientId === client.id && item.year === year && item.month === month);
      const videoTarget = asNumber(client.videoQuantity);
      const imageTarget = asNumber(client.imageQuantity);
      const videosProduced = asNumber(tracking?.videosProduced);
      const imagesProduced = asNumber(tracking?.imagesProduced);
      const pendingVideos = Math.max(videoTarget - videosProduced, 0);
      const pendingImages = Math.max(imageTarget - imagesProduced, 0);
      return {
        clientId: client.id,
        companyName: client.companyName,
        pendingVideos,
        pendingImages,
        totalPending: pendingVideos + pendingImages,
      };
    })
    .filter(item => item.totalPending > 0)
    .sort((a, b) => b.totalPending - a.totalPending);

  const attentionClientIds = new Set<number>();
  overdueTasks.forEach(task => {
    if (task.clientId) attentionClientIds.add(task.clientId);
  });
  overduePayments.forEach(payment => attentionClientIds.add(payment.clientId));
  productionPending.slice(0, 10).forEach(item => attentionClientIds.add(item.clientId));
  contractAlerts.slice(0, 10).forEach(item => attentionClientIds.add(item.clientId));
  const clientsNeedingAttention = Array.from(attentionClientIds)
    .map(id => clientsById.get(id))
    .filter(Boolean)
    .map(client => ({
      id: client!.id,
      companyName: client!.companyName,
      status: client!.status,
      reasons: [
        overdueTasks.some(task => task.clientId === client!.id) ? "tarefas atrasadas" : null,
        overduePayments.some(payment => payment.clientId === client!.id) ? "pagamento atrasado" : null,
        productionPending.some(item => item.clientId === client!.id) ? "produção pendente" : null,
        contractAlerts.some(item => item.clientId === client!.id) ? "contrato em atenção" : null,
      ].filter(Boolean),
    }));

  const criticalAlerts = [
    overduePayments.length > 0 ? `${overduePayments.length} pagamento(s) atrasado(s)` : null,
    overdueTasks.length > 0 ? `${overdueTasks.length} tarefa(s) atrasada(s)` : null,
    productionPending.length > 0 ? `${productionPending.length} cliente(s) com produção pendente` : null,
    contractAlerts.length > 0 ? `${contractAlerts.length} contrato(s) em atenção` : null,
  ].filter(Boolean);

  return {
    date: start,
    summary: `Hoje você tem ${tasksDueToday.length} tarefa(s) vencendo, ${overdueTasks.length} atrasada(s), ${meetingsToday.length} reunião(ões), ${paymentsDueToday.length} pagamento(s) vencendo, ${productionPending.length} cliente(s) com produção em aberto e ${contractAlerts.length} contrato(s) em atenção.`,
    counts: {
      tasksDueToday: tasksDueToday.length,
      overdueTasks: overdueTasks.length,
      eventsToday: events.length,
      meetingsToday: meetingsToday.length,
      paymentsDueToday: paymentsDueToday.length,
      paymentsDueSoon: paymentsDueSoon.length,
      overduePayments: overduePayments.length,
      productionPending: productionPending.length,
      contractAlerts: contractAlerts.length,
      clientsNeedingAttention: clientsNeedingAttention.length,
      criticalAlerts: criticalAlerts.length,
    },
    tasksDueToday,
    overdueTasks,
    eventsToday: events,
    paymentsDueToday,
    paymentsDueSoon,
    overduePayments,
    productionPending: productionPending.slice(0, 8),
    contractAlerts: contractAlerts.slice(0, 8),
    clientsNeedingAttention,
    criticalAlerts,
  };
}

export async function globalSearch(query: string) {
  const q = query.trim();
  if (q.length < 2) {
    return { query: q, categories: [], total: 0 };
  }

  const [clients, tasks, expenses, payments, collaborators, events, investments, creditCards, production, contentItems] = await Promise.all([
    listClients(),
    listTasks(),
    listExpenses(),
    listPayments(),
    listCollaborators(),
    listEvents(),
    listInvestments(),
    listCreditCardTransactions(),
    list("productionTracking"),
    listContentItems(),
  ]);
  const clientsById = new Map(clients.map(client => [client.id, client]));
  const limit = 6;

  const categories = [
    {
      type: "clients",
      label: "Clientes",
      items: clients
        .filter(client => textMatches(q, [
          client.companyName,
          client.contactName,
          client.email,
          client.phone,
          client.whatsapp,
          client.notes,
          client.contractPaymentMethod,
          client.contractAdjustment,
          client.contractNotes,
          client.contractStatus,
        ]))
        .slice(0, limit)
        .map(client => ({
          id: client.id,
          title: client.companyName,
          subtitle: client.contactName,
          meta: client.status,
          href: `/clientes/${client.id}`,
        })),
    },
    {
      type: "tasks",
      label: "Tarefas",
      items: tasks
        .filter(task => textMatches(q, [
          task.title,
          task.description,
          task.status,
          task.priority,
          task.taskType,
          task.recurrence,
          task.comments,
          task.relatedLinks,
          task.attachmentLinks,
          clientsById.get(task.clientId)?.companyName,
        ]))
        .slice(0, limit)
        .map(task => ({
          id: task.id,
          title: task.title,
          subtitle: clientsById.get(task.clientId)?.companyName ?? "Sem cliente vinculado",
          meta: task.status,
          href: "/tarefas",
        })),
    },
    {
      type: "expenses",
      label: "Despesas",
      items: expenses
        .filter(expense => textMatches(q, [expense.category, expense.description, expense.amount]))
        .slice(0, limit)
        .map(expense => ({
          id: expense.id,
          title: expense.description || expense.category,
          subtitle: expense.category,
          meta: money(expense.amount),
          href: "/financeiro",
        })),
    },
    {
      type: "payments",
      label: "Pagamentos",
      items: payments
        .filter(payment => textMatches(q, [payment.description, payment.amount, payment.status, clientsById.get(payment.clientId)?.companyName]))
        .slice(0, limit)
        .map(payment => ({
          id: payment.id,
          title: clientsById.get(payment.clientId)?.companyName ?? "Pagamento",
          subtitle: payment.description || "Recebimento",
          meta: payment.status,
          href: "/financeiro",
        })),
    },
    {
      type: "collaborators",
      label: "Colaboradores",
      items: collaborators
        .filter(collaborator => textMatches(q, [collaborator.name, collaborator.role, collaborator.email, collaborator.phone]))
        .slice(0, limit)
        .map(collaborator => ({
          id: collaborator.id,
          title: collaborator.name,
          subtitle: collaborator.role,
          meta: collaborator.status,
          href: "/colaboradores",
        })),
    },
    {
      type: "events",
      label: "Eventos",
      items: events
        .filter(event => textMatches(q, [event.title, event.description, event.type, clientsById.get(event.clientId)?.companyName]))
        .slice(0, limit)
        .map(event => ({
          id: event.id,
          title: event.title,
          subtitle: clientsById.get(event.clientId)?.companyName ?? event.type,
          meta: event.startTime,
          href: "/calendario",
        })),
    },
    {
      type: "investments",
      label: "Investimentos",
      items: investments
        .filter(investment => textMatches(q, [investment.name, investment.description, investment.type, investment.amount]))
        .slice(0, limit)
        .map(investment => ({
          id: investment.id,
          title: investment.name,
          subtitle: investment.type,
          meta: money(investment.amount),
          href: "/financeiro",
        })),
    },
    {
      type: "creditCards",
      label: "Cartão",
      items: creditCards
        .filter(card => textMatches(q, [card.description, card.category, card.amount, card.status]))
        .slice(0, limit)
        .map(card => ({
          id: card.id,
          title: card.description,
          subtitle: card.category,
          meta: card.status,
          href: "/financeiro",
        })),
    },
    {
      type: "production",
      label: "Produção",
      items: production
        .filter(item => textMatches(q, [clientsById.get(item.clientId)?.companyName, item.year, item.month]))
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: clientsById.get(item.clientId)?.companyName ?? "Produção",
          subtitle: `${item.month}/${item.year}`,
          meta: `${asNumber(item.videosProduced)} vídeos, ${asNumber(item.imagesProduced)} imagens`,
          href: clientsById.get(item.clientId) ? `/clientes/${item.clientId}` : "/clientes",
        })),
    },
    {
      type: "content",
      label: "Conteúdos",
      items: contentItems
        .filter(item => textMatches(q, [
          item.theme,
          item.caption,
          item.notes,
          item.campaign,
          item.contentType,
          item.status,
          item.approvalStatus,
          item.publishedUrl,
          clientsById.get(item.clientId)?.companyName,
        ]))
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.theme,
          subtitle: clientsById.get(item.clientId)?.companyName ?? item.contentType,
          meta: contentStatusLabel(item.status),
          href: "/producao",
        })),
    },
  ].filter(category => category.items.length > 0);

  return {
    query: q,
    categories,
    total: categories.reduce((sum, category) => sum + category.items.length, 0),
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

type ContentFilters = {
  clientId?: number;
  year?: number;
  month?: number;
  status?: string;
  approvalStatus?: string;
  contentType?: string;
  campaign?: string;
};

function contentInPeriod(content: LocalRecord, start: number, end: number) {
  return [content.scheduledDate, content.publishedAt, content.sentAt, content.approvedAt, content.createdAt ? new Date(content.createdAt).getTime() : null]
    .some(value => value && isInRange(value, start, end));
}

function contentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    idea: "Ideia",
    script: "Roteiro",
    production: "Em produção",
    editing: "Em edição",
    approval: "Em aprovação",
    changes: "Alteração solicitada",
    approved: "Aprovado",
    scheduled: "Agendado",
    published: "Publicado",
    archived: "Arquivado",
  };
  return labels[status] ?? status;
}

export async function listContentItems(filters: ContentFilters = {}) {
  const rows = await list("contentItems");
  const period = filters.year && filters.month ? getMonthRange(filters.year, filters.month) : null;
  return rows
    .filter(item => !filters.clientId || item.clientId === filters.clientId)
    .filter(item => !filters.status || item.status === filters.status)
    .filter(item => !filters.approvalStatus || item.approvalStatus === filters.approvalStatus)
    .filter(item => !filters.contentType || item.contentType === filters.contentType)
    .filter(item => !filters.campaign || String(item.campaign ?? "").toLowerCase().includes(filters.campaign!.toLowerCase()))
    .filter(item => !period || contentInPeriod(item, period.start, period.end))
    .sort((a, b) => asNumber(a.scheduledDate ?? new Date(a.createdAt).getTime()) - asNumber(b.scheduledDate ?? new Date(b.createdAt).getTime()));
}

export async function getContentItemById(id: number) {
  return (await list("contentItems")).find(item => item.id === id);
}

export async function createContentItem(data: Omit<InsertContentItem, "id" | "createdAt" | "updatedAt">) {
  const record = await insert("contentItems", {
    status: "idea",
    approvalStatus: "not_sent",
    versionHistory: "[]",
    ...data,
  });
  return { id: record.id };
}

export async function updateContentItem(id: number, data: Partial<InsertContentItem>) {
  const existing = await getContentItemById(id);
  const history = (() => {
    try {
      return JSON.parse(existing?.versionHistory || "[]");
    } catch {
      return [];
    }
  })();
  if (existing && (data.caption !== undefined || data.fileUrl !== undefined || data.publishedUrl !== undefined || data.status !== undefined || data.approvalStatus !== undefined)) {
    history.push({
      at: new Date().toISOString(),
      status: data.status ?? existing.status,
      approvalStatus: data.approvalStatus ?? existing.approvalStatus,
      captionChanged: data.caption !== undefined && data.caption !== existing.caption,
      fileChanged: data.fileUrl !== undefined && data.fileUrl !== existing.fileUrl,
      publishedUrlChanged: data.publishedUrl !== undefined && data.publishedUrl !== existing.publishedUrl,
    });
  }
  const values = { ...data };
  if (history.length) values.versionHistory = JSON.stringify(history.slice(-20));
  await update("contentItems", id, values);
}

export async function deleteContentItem(id: number) {
  await remove("contentItems", id);
}

export async function getContentStudioSummary(year: number, month: number, clientId?: number) {
  const [items, clients, collaborators] = await Promise.all([
    listContentItems({ year, month, clientId }),
    listClients(),
    listCollaborators(),
  ]);
  const clientsById = new Map(clients.map(client => [client.id, client]));
  const collaboratorsById = new Map(collaborators.map(collaborator => [collaborator.id, collaborator]));
  const now = nowMs();
  const openStatuses = new Set(["idea", "script", "production", "editing", "approval", "changes", "scheduled"]);
  const published = items.filter(item => item.status === "published");
  const approved = items.filter(item => item.status === "approved" || item.approvalStatus === "approved");
  const awaitingApproval = items.filter(item => item.status === "approval" || item.approvalStatus === "waiting" || item.approvalStatus === "sent");
  const overdue = items.filter(item => openStatuses.has(item.status) && item.scheduledDate && asNumber(item.scheduledDate) < now);
  const upcoming = items.filter(item => openStatuses.has(item.status) && item.scheduledDate && asNumber(item.scheduledDate) >= now).slice(0, 8);
  const byStatus = Object.entries(items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([status, count]) => ({ status, label: contentStatusLabel(status), count }));

  return {
    summary: {
      total: items.length,
      published: published.length,
      approved: approved.length,
      awaitingApproval: awaitingApproval.length,
      overdue: overdue.length,
      library: items.filter(item => item.status !== "archived").length,
    },
    byStatus,
    upcoming: upcoming.map(item => ({ ...item, companyName: clientsById.get(item.clientId)?.companyName ?? "Cliente", collaboratorName: collaboratorsById.get(item.collaboratorId)?.name ?? null })),
    overdue: overdue.slice(0, 8).map(item => ({ ...item, companyName: clientsById.get(item.clientId)?.companyName ?? "Cliente", collaboratorName: collaboratorsById.get(item.collaboratorId)?.name ?? null })),
  };
}

export async function getClientContentReport(clientId: number, year: number, month: number) {
  const [client, content, tasks, payments] = await Promise.all([
    getClientById(clientId),
    listContentItems({ clientId, year, month }),
    listTasks(),
    listPayments(clientId),
  ]);
  if (!client) return null;
  const { start, end } = getMonthRange(year, month);
  const monthTasks = tasks.filter(task => task.clientId === clientId && (
    isInRange(task.dueDate, start, end) ||
    isInRange(task.createdAt ? new Date(task.createdAt).getTime() : null, start, end) ||
    isInRange(task.updatedAt ? new Date(task.updatedAt).getTime() : null, start, end)
  ));
  const monthPayments = payments.filter(payment => isInRange(payment.dueDate, start, end) || isInRange(payment.paidDate, start, end));
  const published = content.filter(item => item.status === "published");
  const delivered = content.filter(item => ["approved", "scheduled", "published"].includes(item.status));
  const pending = content.filter(item => !["approved", "scheduled", "published", "archived"].includes(item.status));
  const campaigns = Array.from(new Set(content.map(item => item.campaign).filter(Boolean)));
  const received = monthPayments.filter(payment => payment.status === "paid").reduce((sum, payment) => sum + money(payment.amount), 0);
  const pendingPayments = monthPayments.filter(payment => payment.status !== "paid").reduce((sum, payment) => sum + money(payment.amount), 0);

  return {
    client: {
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName,
      services: serviceListForClient(client),
      monthlyValue: money(client.monthlyValue),
    },
    period: { year, month, start, end },
    content: {
      total: content.length,
      delivered: delivered.length,
      published: published.length,
      pending: pending.length,
      items: content,
      campaigns,
    },
    tasks: {
      completed: monthTasks.filter(task => task.status === "done").length,
      open: monthTasks.filter(task => task.status !== "done").length,
    },
    financial: {
      received: roundMoney(received),
      pending: roundMoney(pendingPayments),
    },
    nextSteps: pending.slice(0, 5).map(item => `${contentStatusLabel(item.status)}: ${item.theme}`),
  };
}

function serviceListForClient(client: LocalRecord) {
  const services = [
    client.metaAds ? "Meta Ads" : null,
    client.googleAds ? "Google Ads" : null,
    client.socialMedia ? "Redes Sociais" : null,
    client.otherServices ? String(client.otherServices) : null,
  ].filter(Boolean) as string[];
  return services;
}

function formatContractDueLabel(daysUntil: number | null, type?: string | null) {
  const action = type === "renovação" ? "Renova" : "Vence";
  if (daysUntil === null) return "Sem data de contrato";
  if (daysUntil < 0) return type === "renovação" ? "Renovação vencida" : "Contrato vencido";
  if (daysUntil === 0) return `${action} hoje`;
  if (daysUntil === 1) return `${action} amanhã`;
  return `${action} em ${daysUntil} dias`;
}

export function buildContractInsight(client: Record<string, any>, documents: Record<string, any>[] = [], referenceDate = new Date()) {
  const hasContractDocument = documents.some(document => document.clientId === client.id && document.category === "contract");
  const hasContractFields = Boolean(
    client.contractRenewalDate ||
    client.contractEndDate ||
    client.contractPaymentMethod ||
    client.contractDueDay ||
    client.contractAdjustment ||
    client.contractNotes
  );
  const explicitStatus = client.contractStatus ?? "pending";
  const hasContract = hasContractDocument || hasContractFields || explicitStatus === "active";
  const { start } = getDayRange(referenceDate);
  const milestones = [
    client.contractEndDate ? { type: "vencimento", date: getDayRange(new Date(asNumber(client.contractEndDate))).start } : null,
    client.contractRenewalDate ? { type: "renovação", date: getDayRange(new Date(asNumber(client.contractRenewalDate))).start } : null,
  ]
    .filter((item): item is { type: string; date: number } => Boolean(item?.date))
    .sort((a, b) => a.date - b.date);
  const overdueMilestone = [...milestones].reverse().find(item => item.date < start);
  const nextMilestone = milestones.find(item => item.date >= start);
  const milestone = overdueMilestone ?? nextMilestone ?? null;
  const daysUntil = milestone ? Math.ceil((milestone.date - start) / DAY_MS) : null;

  let key = "active";
  let severity: "critical" | "warning" | "info" | "ok" = "ok";

  if (explicitStatus === "cancelled") {
    key = "cancelled";
    severity = "ok";
  } else if (!hasContract) {
    key = "missing";
    severity = "warning";
  } else if (explicitStatus === "expired" || (daysUntil !== null && daysUntil < 0)) {
    key = "expired";
    severity = "critical";
  } else if (daysUntil !== null && daysUntil <= 7) {
    key = "due_7";
    severity = "critical";
  } else if (daysUntil !== null && daysUntil <= 15) {
    key = "due_15";
    severity = "warning";
  } else if (daysUntil !== null && daysUntil <= 30) {
    key = "due_30";
    severity = "info";
  } else if (explicitStatus === "pending") {
    key = "pending";
    severity = "info";
  }

  return {
    clientId: client.id,
    companyName: client.companyName,
    hasContract,
    hasContractDocument,
    key,
    severity,
    label: key === "missing" ? "Sem contrato cadastrado" : key === "pending" ? "Contrato pendente" : formatContractDueLabel(daysUntil, milestone?.type),
    daysUntil,
    milestoneDate: milestone?.date ?? null,
    milestoneType: milestone?.type ?? null,
    renewalDate: client.contractRenewalDate ?? null,
    endDate: client.contractEndDate ?? null,
    paymentMethod: client.contractPaymentMethod ?? null,
    dueDay: client.contractDueDay ?? null,
    adjustment: client.contractAdjustment ?? null,
    notes: client.contractNotes ?? null,
    status: explicitStatus,
  };
}

function clientHealthStatus(score: number, tags: string[]) {
  if (tags.includes("inadimplente")) return { key: "inadimplente", label: "Inadimplente" };
  if (score < 45) return { key: "risco", label: "Risco" };
  if (tags.includes("sobrecarregado")) return { key: "sobrecarregado", label: "Sobrecarregado" };
  if (score < 70) return { key: "atencao", label: "Atenção" };
  if (tags.includes("upsell")) return { key: "upsell", label: "Oportunidade de upsell" };
  return { key: "saudavel", label: "Saudável" };
}

async function buildClientHealth(client: LocalRecord, context?: {
  tasks?: LocalRecord[];
  payments?: LocalRecord[];
  production?: LocalRecord[];
  documents?: LocalRecord[];
}) {
  const now = nowMs();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1).getTime();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  const [tasks, payments, production, documents] = context ? [
    context.tasks ?? [],
    context.payments ?? [],
    context.production ?? [],
    context.documents ?? [],
  ] : await Promise.all([
    listTasks(),
    listPayments(),
    list("productionTracking"),
    listDocuments(),
  ]);

  const clientTasks = tasks.filter(task => task.clientId === client.id);
  const openTasks = clientTasks.filter(task => task.status !== "done");
  const completedTasks = clientTasks.filter(task => task.status === "done");
  const overdueTasks = openTasks.filter(task => task.dueDate && asNumber(task.dueDate) < now);
  const urgentTasks = openTasks.filter(task => task.priority === "high" || task.priority === "urgent");
  const clientPayments = payments.filter(payment => payment.clientId === client.id);
  const monthPayments = clientPayments.filter(payment => isInRange(payment.dueDate, monthStart, monthEnd) || isInRange(payment.paidDate, monthStart, monthEnd));
  const paidPayments = clientPayments.filter(payment => payment.status === "paid");
  const pendingPayments = clientPayments.filter(payment => payment.status !== "paid");
  const overduePayments = pendingPayments.filter(payment => asNumber(payment.dueDate) < now);
  const received = paidPayments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const pending = pendingPayments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const monthlyValue = money(client.monthlyValue);

  const tracking = production.find(item => item.clientId === client.id && item.year === year && item.month === month);
  const videoTarget = asNumber(client.videoQuantity);
  const imageTarget = asNumber(client.imageQuantity);
  const videosProduced = asNumber(tracking?.videosProduced);
  const imagesProduced = asNumber(tracking?.imagesProduced);
  const totalContracted = videoTarget + imageTarget;
  const totalDelivered = videosProduced + imagesProduced;
  const productionProgress = totalContracted > 0 ? Math.min(100, roundMoney((totalDelivered / totalContracted) * 100)) : 100;
  const productionBehind = totalContracted > 0 && productionProgress < Math.max(35, monthProgress * 100 - 20);
  const serviceCount = serviceListForClient(client).length;
  const contract = buildContractInsight(client, documents);
  const hasContract = contract.hasContract;
  const estimatedWorkloadCost = openTasks.length * 80 + videoTarget * 150 + imageTarget * 40;
  const estimatedMargin = monthlyValue > 0 ? roundMoney(((monthlyValue - estimatedWorkloadCost) / monthlyValue) * 100) : 0;
  const operationalLoad = monthlyValue > 0 ? roundMoney((estimatedWorkloadCost / monthlyValue) * 100) : openTasks.length > 0 ? 100 : 0;

  let score = 100;
  const reasons: string[] = [];
  const tags: string[] = [];

  if (client.status !== "active") {
    score -= 20;
    reasons.push("cliente não está ativo");
  }
  if (overduePayments.length > 0) {
    score -= 35;
    tags.push("inadimplente");
    reasons.push(`${overduePayments.length} pagamento(s) em atraso`);
  } else if (pendingPayments.length > 0) {
    score -= 8;
    reasons.push(`${pendingPayments.length} pagamento(s) pendente(s)`);
  }
  if (overdueTasks.length > 0) {
    score -= Math.min(25, overdueTasks.length * 8);
    reasons.push(`${overdueTasks.length} tarefa(s) atrasada(s)`);
  }
  if (urgentTasks.length > 0) {
    score -= Math.min(12, urgentTasks.length * 4);
    reasons.push(`${urgentTasks.length} tarefa(s) de alta prioridade`);
  }
  if (productionBehind) {
    score -= 18;
    reasons.push("produção abaixo do ritmo do mês");
  }
  if (operationalLoad > 95 || openTasks.length >= 10) {
    score -= 15;
    tags.push("sobrecarregado");
    reasons.push("alta demanda operacional para o contrato");
  }
  if (contract.key === "missing") {
    score -= 8;
    reasons.push("sem contrato cadastrado");
  } else if (contract.key === "expired") {
    score -= 18;
    reasons.push("contrato vencido");
  } else if (contract.key === "due_7") {
    score -= 8;
    reasons.push(contract.label.toLowerCase());
  } else if (contract.key === "due_15" || contract.key === "due_30") {
    score -= 4;
    reasons.push(contract.label.toLowerCase());
  } else if (contract.key === "pending") {
    score -= 5;
    reasons.push("contrato pendente");
  }
  if (serviceCount <= 1 && client.status === "active") {
    tags.push("upsell");
    reasons.push("cliente com potencial de contratar mais serviços");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = clientHealthStatus(score, tags);
  const upsellOpportunities = [
    !client.metaAds ? "Meta Ads" : null,
    !client.googleAds ? "Google Ads" : null,
    !client.socialMedia ? "Redes Sociais" : null,
    videoTarget === 0 ? "Vídeos/Reels" : null,
  ].filter(Boolean);

  return {
    clientId: client.id,
    companyName: client.companyName,
    contactName: client.contactName,
    monthlyValue,
    status,
    score,
    reasons,
    tags,
    services: serviceListForClient(client),
    upsellOpportunities,
    metrics: {
      openTasks: openTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      urgentTasks: urgentTasks.length,
      received: roundMoney(received),
      pending: roundMoney(pending),
      overduePayments: overduePayments.length,
      monthPayments: monthPayments.length,
      productionProgress,
      contractedVideos: videoTarget,
      deliveredVideos: videosProduced,
      contractedImages: imageTarget,
      deliveredImages: imagesProduced,
      hasContract,
      estimatedMargin,
      operationalLoad,
    },
    contract,
    latestActivityAt: Math.max(
      ...clientTasks.map(task => asNumber(new Date(task.updatedAt).getTime())),
      ...clientPayments.map(payment => asNumber(payment.paidDate ?? payment.dueDate)),
      asNumber(new Date(client.updatedAt ?? client.createdAt).getTime())
    ),
  };
}

export async function getClientHealth(clientId: number) {
  const client = await getClientById(clientId);
  if (!client) return null;
  return buildClientHealth(client);
}

export async function getClientIntelligence() {
  const [clients, tasks, payments, production, documents] = await Promise.all([
    listClients(),
    listTasks(),
    listPayments(),
    list("productionTracking"),
    listDocuments(),
  ]);
  const context = { tasks, payments, production, documents };
  const health = await Promise.all(clients.map(client => buildClientHealth(client, context)));
  const activeHealth = health.filter(item => clients.find(client => client.id === item.clientId)?.status === "active");
  const sortDesc = <T extends { value: number }>(items: T[]) => [...items].sort((a, b) => b.value - a.value).slice(0, 5);

  return {
    summary: {
      totalClients: clients.length,
      activeClients: activeHealth.length,
      healthy: health.filter(item => item.status.key === "saudavel" || item.status.key === "upsell").length,
      attention: health.filter(item => item.status.key === "atencao" || item.status.key === "sobrecarregado").length,
      risk: health.filter(item => item.status.key === "risco").length,
      delinquent: health.filter(item => item.status.key === "inadimplente").length,
      contractAlerts: health.filter(item => ["missing", "pending", "expired", "due_7", "due_15", "due_30"].includes(item.contract.key)).length,
      averageScore: health.length ? Math.round(health.reduce((sum, item) => sum + item.score, 0) / health.length) : 0,
    },
    health,
    ranking: {
      topRevenue: sortDesc(health.map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.monthlyValue, label: "Faturamento" }))),
      mostProfitable: sortDesc(health.map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.metrics.estimatedMargin, label: "Margem estimada" }))),
      leastProfitable: [...health]
        .map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.metrics.estimatedMargin, label: "Margem estimada" }))
        .sort((a, b) => a.value - b.value)
        .slice(0, 5),
      mostTasks: sortDesc(health.map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.metrics.openTasks, label: "Tarefas abertas" }))),
      mostOverdue: sortDesc(health.map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.metrics.overdueTasks + item.metrics.overduePayments, label: "Pendências" }))),
      upsell: health
        .filter(item => item.upsellOpportunities.length > 0)
        .map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.upsellOpportunities.length, label: item.upsellOpportunities.join(", ") }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      operationalLoad: sortDesc(health.map(item => ({ clientId: item.clientId, companyName: item.companyName, value: item.metrics.operationalLoad, label: "Carga operacional" }))),
    },
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
    netProfit: totalRevenue - totalExpenses,
  });
}

function getMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 0, 23, 59, 59, 999).getTime(),
  };
}

function isInRange(value: unknown, start: number, end: number) {
  const timestamp = asNumber(value);
  return timestamp >= start && timestamp <= end;
}

function expenseGroupByType(expenses: LocalRecord[]) {
  return expenses.reduce((acc, expense) => {
    const type = classifyActualExpense(expense);
    acc[type] = (acc[type] ?? 0) + money(expense.amount);
    return acc;
  }, { fixed: 0, variable: 0, personal: 0 } as Record<"fixed" | "variable" | "personal", number>);
}

function categoryTotal(expenses: LocalRecord[], words: string[]) {
  return expenses
    .filter(expense => {
      const text = normalizeBudgetText(`${expense.category} ${expense.description}`);
      return words.some(word => text.includes(word));
    })
    .reduce((sum, expense) => sum + money(expense.amount), 0);
}

function paymentMessage(companyName: string, amount: number) {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  return `Olá, tudo bem? Passando para lembrar que há um pagamento em aberto da ${companyName} no valor de ${formatted}, referente aos serviços da Seven Marketing. Qualquer dúvida, estou à disposição.`;
}

export function getContractDueDateForWindow(client: LocalRecord, referenceDate: number, windowEnd: number) {
  const dueDay = asNumber(client.contractDueDay);
  if (!dueDay || dueDay < 1 || client.status !== "active") return null;
  const monthlyValue = money(client.monthlyValue);
  if (monthlyValue <= 0) return null;

  const reference = new Date(referenceDate);
  const buildDueDate = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(dueDay, lastDay), 12, 0, 0, 0).getTime();
  };
  const candidates = [
    buildDueDate(reference.getFullYear(), reference.getMonth()),
    buildDueDate(reference.getFullYear(), reference.getMonth() + 1),
  ];

  return candidates
    .find(dueDate => dueDate >= referenceDate && dueDate <= windowEnd) ?? null;
}

export function buildExpectedContractReceivables(clients: LocalRecord[], payments: LocalRecord[], referenceDate: number, windowEnd: number) {
  return clients
    .filter(client => client.status === "active")
    .map(client => {
      const dueDate = getContractDueDateForWindow(client, referenceDate, windowEnd);
      if (!dueDate) return null;
      const alreadyRegistered = payments.some(payment => {
        if (payment.status === "paid" || payment.clientId !== client.id) return false;
        const paymentDueDate = asNumber(payment.dueDate);
        const paymentMonth = new Date(paymentDueDate);
        const contractMonth = new Date(dueDate);
        return paymentMonth.getFullYear() === contractMonth.getFullYear()
          && paymentMonth.getMonth() === contractMonth.getMonth();
      });
      if (alreadyRegistered) return null;

      return {
        type: "contract_expected",
        label: client.companyName || "Cliente sem nome",
        description: "Recebimento esperado pelo contrato ativo",
        amount: roundMoney(money(client.monthlyValue)),
        dueDate,
        status: "Previsto",
      };
    })
    .filter(Boolean) as Array<{ type: string; label: string; description: string; amount: number; dueDate: number; status: string }>;
}

function buildCashWindow(days: number, now: number, payments: LocalRecord[], expenses: LocalRecord[], creditCards: LocalRecord[], collaborators: LocalRecord[], clients: LocalRecord[]) {
  const { start } = getDayRange(new Date(now));
  const end = start + days * 24 * 60 * 60 * 1000 - 1;
  const clientsById = new Map(clients.map(client => [client.id, client]));
  const registeredReceivableItems = payments
    .filter(payment => payment.status !== "paid" && asNumber(payment.dueDate) <= end)
    .map(payment => ({
      type: "payment",
      label: clientsById.get(payment.clientId)?.companyName ?? "Cliente sem nome",
      description: payment.description || "Recebimento de cliente",
      amount: roundMoney(money(payment.amount)),
      dueDate: payment.dueDate,
      status: asNumber(payment.dueDate) < start ? "Atrasado" : "A vencer",
    }))
  const expectedContractItems = buildExpectedContractReceivables(clients, payments, start, end);
  const receivableItems = [...registeredReceivableItems, ...expectedContractItems]
    .sort((a, b) => asNumber(a.dueDate) - asNumber(b.dueDate));
  const expenseItems = expenses
    .filter(expense => isInRange(expense.date, start, end))
    .map(expense => ({
      type: "expense",
      label: expense.category || "Despesa",
      description: expense.description || "Despesa registrada",
      amount: roundMoney(money(expense.amount)),
      dueDate: expense.date,
      status: "A pagar",
    }));
  const cardItems = creditCards
    .filter(card => card.status === "pending" && asNumber(card.transactionDate) <= end)
    .map(card => ({
      type: "credit_card",
      label: "Cartão de crédito",
      description: card.description || card.category || "Compra no cartão",
      amount: roundMoney(money(card.amount)),
      dueDate: card.transactionDate,
      status: "Pendente",
    }));
  const collaboratorItems = collaborators
    .filter(collaborator => collaborator.status !== "inactive" && asNumber(collaborator.monthlyCost) > 0)
    .map(collaborator => {
      const paymentDay = asNumber(collaborator.paymentDay);
      const date = new Date(now);
      const dueDate = paymentDay
        ? new Date(date.getFullYear(), date.getMonth(), Math.min(paymentDay, 28), 12, 0, 0, 0).getTime()
        : start + 29 * DAY_MS;
      return {
        type: "collaborator",
        label: collaborator.name,
        description: collaborator.role || "Custo de colaborador",
        amount: roundMoney(money(collaborator.monthlyCost)),
        dueDate,
        status: "A pagar",
      };
    })
    .filter(item => item.dueDate >= start && item.dueDate <= end);
  const payableItems = [...expenseItems, ...cardItems, ...collaboratorItems]
    .sort((a, b) => asNumber(a.dueDate) - asNumber(b.dueDate));
  const receivables = receivableItems.reduce((sum, item) => sum + item.amount, 0);
  const payables = payableItems.reduce((sum, item) => sum + item.amount, 0);
  return {
    days,
    label: `Próximos ${days} dias`,
    totalReceivable: roundMoney(receivables),
    totalPayable: roundMoney(payables),
    projectedBalance: roundMoney(receivables - payables),
    receivableItems,
    payableItems,
    risk: receivables - payables < 0 ? "negative" : receivables - payables < payables * 0.15 ? "attention" : "healthy",
  };
}

export async function getStrategicFinance(year: number, month: number) {
  const { start, end } = getMonthRange(year, month);
  const now = nowMs();
  const [clients, payments, expenses, investments, creditCards, collaborators] = await Promise.all([
    listClients(),
    listPayments(),
    listExpenses(),
    listInvestments(),
    listCreditCardTransactions(),
    listCollaborators(),
  ]);

  const monthExpenses = expenses.filter(expense => isInRange(expense.date, start, end));
  const monthInvestments = investments.filter(investment => isInRange(investment.date, start, end));
  const monthCreditCards = creditCards.filter(card => isInRange(card.transactionDate, start, end));
  const forecast = await getMonthlyBillingForecast(year, month);
  const period = await getOrCreateMonthlyPeriod(year, month);
  const budget = await getOrCreateMonthlyBudget(period.id);
  const collaboratorCosts = collaborators
    .filter(collaborator => collaborator.status !== "inactive")
    .reduce((sum, collaborator) => sum + money(collaborator.monthlyCost), 0);
  const budgetMetrics = await calculateBudgetMetrics(budget.id, collaboratorCosts);
  const expenseGroups = expenseGroupByType(monthExpenses);

  const grossRevenue = roundMoney(forecast.predicted);
  const receivedRevenue = roundMoney(forecast.received);
  const pendingRevenue = roundMoney(forecast.pending);
  const fixedCosts = roundMoney(Math.max(money(budgetMetrics.totalFixedCosts), expenseGroups.fixed));
  const variableCosts = roundMoney(Math.max(money(budgetMetrics.totalVariableCosts), expenseGroups.variable));
  const personalExpenses = roundMoney(Math.max(money(budgetMetrics.totalPersonalExpenses), expenseGroups.personal));
  const collaboratorCostTotal = roundMoney(money(budgetMetrics.totalCollaboratorCosts));
  const softwareTools = roundMoney(categoryTotal(monthExpenses, ["software", "assinatura", "canva", "adobe", "sistema", "ferramenta"]));
  const operationalExpenses = roundMoney(monthExpenses.reduce((sum, expense) => sum + money(expense.amount), 0));
  const investmentsTotal = roundMoney(monthInvestments.reduce((sum, investment) => sum + money(investment.amount), 0));
  const creditCardPending = roundMoney(monthCreditCards.filter(card => card.status === "pending").reduce((sum, card) => sum + money(card.amount), 0));
  const taxes = 0;
  const companyExpenses = roundMoney(fixedCosts + variableCosts + collaboratorCostTotal + taxes);
  const operatingProfit = roundMoney(receivedRevenue - companyExpenses);
  const netProfit = roundMoney(operatingProfit - personalExpenses - creditCardPending);
  const margin = receivedRevenue > 0 ? roundMoney((netProfit / receivedRevenue) * 100) : 0;
  const availableCash = roundMoney(receivedRevenue - operationalExpenses - creditCardPending);

  const clientRevenue = clients
    .filter(client => client.status === "active")
    .map(client => ({ id: client.id, companyName: client.companyName, amount: money(client.monthlyValue) }))
    .sort((a, b) => b.amount - a.amount);
  const topClientShare = grossRevenue > 0 && clientRevenue[0] ? roundMoney((clientRevenue[0].amount / grossRevenue) * 100) : 0;
  const topTwoShare = grossRevenue > 0 ? roundMoney((clientRevenue.slice(0, 2).reduce((sum, item) => sum + item.amount, 0) / grossRevenue) * 100) : 0;

  const pendingPayments = payments.filter(payment => payment.status !== "paid");
  const overduePayments = pendingPayments.filter(payment => asNumber(payment.dueDate) < now);
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const cashflow = [7, 15, 30].map(days => buildCashWindow(days, now, pendingPayments, monthExpenses, creditCards, collaborators, clients));

  const riskAlerts = [
    grossRevenue > 0 && fixedCosts / grossRevenue > 0.5 ? {
      level: "high",
      title: "Custo fixo acima do seguro",
      description: `Custos fixos representam ${Math.round((fixedCosts / grossRevenue) * 100)}% da receita prevista.`,
    } : null,
    receivedRevenue > 0 && margin < 15 ? {
      level: margin < 0 ? "critical" : "medium",
      title: "Margem líquida baixa",
      description: `Margem líquida atual em ${margin}%. Revise custos e cobranças pendentes.`,
    } : null,
    topTwoShare >= 60 ? {
      level: "medium",
      title: "Receita concentrada",
      description: `Os dois maiores clientes representam ${topTwoShare}% da receita prevista.`,
    } : null,
    grossRevenue > 0 && pendingAmount / grossRevenue > 0.35 ? {
      level: "high",
      title: "Pendências elevadas",
      description: `Pagamentos pendentes somam ${Math.round((pendingAmount / grossRevenue) * 100)}% da receita prevista.`,
    } : null,
    grossRevenue > 0 && personalExpenses / grossRevenue > 0.12 ? {
      level: "medium",
      title: "Pessoal impactando caixa",
      description: `Despesas pessoais representam ${Math.round((personalExpenses / grossRevenue) * 100)}% da receita prevista.`,
    } : null,
    money(budgetMetrics.totalDuplicatedActualExpenses) > 0 ? {
      level: "low",
      title: "Duplicidades detectadas",
      description: `${budgetMetrics.ignoredDuplicateExpenses?.length ?? 0} lançamento(s) não foram somados duas vezes.`,
    } : null,
    cashflow.some(item => item.projectedBalance < 0) ? {
      level: "critical",
      title: "Risco de caixa negativo",
      description: "Uma das janelas projetadas indica mais saídas do que entradas previstas.",
    } : null,
    grossRevenue > 0 && creditCardPending / grossRevenue > 0.2 ? {
      level: "medium",
      title: "Cartão alto para o mês",
      description: `Compras pendentes no cartão representam ${Math.round((creditCardPending / grossRevenue) * 100)}% da receita prevista.`,
    } : null,
    overduePayments.length > 0 ? {
      level: "high",
      title: "Clientes em atraso",
      description: `${overduePayments.length} pagamento(s) estão vencidos e precisam de cobrança.`,
    } : null,
  ].filter(Boolean);

  const clientsById = new Map(clients.map(client => [client.id, client]));
  const collections = pendingPayments
    .map(payment => {
      const client = clientsById.get(payment.clientId);
      const daysLate = Math.floor((now - asNumber(payment.dueDate)) / (24 * 60 * 60 * 1000));
      const amount = money(payment.amount);
      return {
        paymentId: payment.id,
        clientId: payment.clientId,
        companyName: client?.companyName ?? "Cliente sem nome",
        amount: roundMoney(amount),
        dueDate: payment.dueDate,
        daysLate: Math.max(daysLate, 0),
        status: daysLate > 0 ? "Atrasado" : daysLate === 0 ? "Vence hoje" : "Pendente",
        collectionStatus: daysLate > 0 ? "Atrasado" : "Pendente",
        priority: daysLate > 7 || amount >= grossRevenue * 0.2 ? "Alta" : daysLate > 0 ? "Média" : "Normal",
        message: paymentMessage(client?.companyName ?? "sua empresa", amount),
      };
    })
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { Alta: 0, Média: 1, Normal: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || asNumber(a.dueDate) - asNumber(b.dueDate);
    });

  const company = {
    revenue: receivedRevenue,
    fixedCosts,
    variableCosts,
    collaboratorCosts: collaboratorCostTotal,
    taxes,
    tools: softwareTools,
    operationalExpenses,
    investments: investmentsTotal,
    creditCardPending,
    operatingProfit,
  };
  const personal = {
    withdrawals: personalExpenses,
    personalExpenses,
    personalImpactPercentage: grossRevenue > 0 ? roundMoney((personalExpenses / grossRevenue) * 100) : 0,
  };

  return {
    period: { year, month, startDate: start, endDate: end },
    dre: {
      grossRevenue,
      receivedRevenue,
      pendingRevenue,
      taxes,
      fixedCosts,
      variableCosts,
      collaboratorCosts: collaboratorCostTotal,
      freelancers: categoryTotal(monthExpenses, ["freelancer", "terceirizacao", "terceiro"]),
      tools: softwareTools,
      subscriptions: categoryTotal(monthExpenses, ["assinatura", "software", "sistema"]),
      operationalExpenses,
      personalExpenses,
      investments: investmentsTotal,
      partnerWithdrawals: personalExpenses,
      creditCardPending,
      operatingProfit,
      netProfit,
      netMargin: margin,
      finalBalance: availableCash,
    },
    separation: { company, personal },
    cashflow,
    riskAlerts,
    collections,
    concentration: {
      topClientShare,
      topTwoShare,
      topClients: clientRevenue.slice(0, 5),
    },
    duplicates: {
      totalIgnored: roundMoney(money(budgetMetrics.totalDuplicatedActualExpenses)),
      items: budgetMetrics.ignoredDuplicateExpenses ?? [],
    },
  };
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
  const period = await getMonthlyPeriodById(budget.periodId);
  const fixedCosts = await getFixedCosts(budgetId);
  const variableCosts = await getVariableCosts(budgetId);
  const personalExpenses = await getPersonalExpenses(budgetId);
  const actualExpenses = period ? (await listExpenses()).filter(expense => asNumber(expense.date) >= period.startDate && asNumber(expense.date) <= period.endDate) : [];
  const forecastedRevenue = money(budget.forecastedRevenue);
  const plannedItems = [
    ...fixedCosts.map(item => toBudgetExpenseItem(item, "fixed", "planned")),
    ...variableCosts.map(item => toBudgetExpenseItem(item, "variable", "planned")),
    ...personalExpenses.map(item => toBudgetExpenseItem(item, "personal", "planned")),
  ];
  let collaboratorItems = (await listCollaborators())
    .filter(item => item.status !== "inactive" && money(item.monthlyCost) > 0)
    .map(item => ({
      id: item.id,
      source: "collaborator" as const,
      type: "collaborator" as const,
      description: item.name || item.role || "Colaborador",
      category: item.role || "Colaborador",
      amount: money(item.monthlyCost),
      date: null as number | null,
      duplicateOf: null as string | null,
    }));
  if (!collaboratorItems.length && collaboratorCosts > 0) {
    collaboratorItems = [{
      id: 0,
      source: "collaborator" as const,
      type: "collaborator" as const,
      description: "Custos de colaboradores",
      category: "Colaborador",
      amount: collaboratorCosts,
      date: null,
      duplicateOf: null,
    }];
  }
  const actualItems = actualExpenses.map(item => toBudgetExpenseItem(item, classifyActualExpense(item), "actual"));
  const acceptedActualItems: ReturnType<typeof toBudgetExpenseItem>[] = [];
  const duplicatedActualItems: Array<ReturnType<typeof toBudgetExpenseItem> & {
    duplicateMatch?: ReturnType<typeof toBudgetExpenseItem>;
    duplicateReason?: string;
    duplicateConfidence?: number;
    duplicateAmountDiff?: number;
    duplicateTextSimilarity?: number;
  }> = [];
  const comparisonBase = [...plannedItems, ...collaboratorItems];

  for (const item of actualItems) {
    const duplicate = findBudgetDuplicate([...comparisonBase, ...acceptedActualItems], item);
    if (duplicate) {
      duplicatedActualItems.push({
        ...item,
        duplicateOf: `${duplicate.match.source}:${duplicate.match.id}`,
        duplicateMatch: duplicate.match,
        duplicateReason: duplicate.reason,
        duplicateConfidence: duplicate.confidence,
        duplicateAmountDiff: roundMoney(duplicate.amountDiff),
        duplicateTextSimilarity: roundMoney(duplicate.textSimilarity * 100),
      });
    } else {
      acceptedActualItems.push(item);
    }
  }

  const allExpenseItems = [...plannedItems, ...collaboratorItems, ...acceptedActualItems];
  const totalFixedCosts = allExpenseItems.filter(item => item.type === "fixed").reduce((sum, item) => sum + item.amount, 0);
  const totalVariableCosts = allExpenseItems.filter(item => item.type === "variable").reduce((sum, item) => sum + item.amount, 0);
  const totalPersonalExpenses = allExpenseItems.filter(item => item.type === "personal").reduce((sum, item) => sum + item.amount, 0);
  const normalizedCollaboratorCosts = allExpenseItems.filter(item => item.type === "collaborator").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = totalFixedCosts + totalVariableCosts + totalPersonalExpenses + normalizedCollaboratorCosts;
  const netProfitForecast = forecastedRevenue - totalExpenses;
  const profitMarginPercentage = forecastedRevenue > 0 ? Math.max(-999.99, Math.min(999.99, (netProfitForecast / forecastedRevenue) * 100)) : 0;
  const status = netProfitForecast > 0 ? "positive" : netProfitForecast > -1000 ? "warning" : "negative";
  const calcData = {
    budgetId,
    forecastedRevenue: roundMoney(forecastedRevenue).toString(),
    totalFixedCosts: roundMoney(totalFixedCosts).toString(),
    totalVariableCosts: roundMoney(totalVariableCosts).toString(),
    totalPersonalExpenses: roundMoney(totalPersonalExpenses).toString(),
    totalCollaboratorCosts: roundMoney(normalizedCollaboratorCosts || collaboratorCosts).toString(),
    totalActualExpenses: roundMoney(acceptedActualItems.reduce((sum, item) => sum + item.amount, 0)).toString(),
    totalDuplicatedActualExpenses: roundMoney(duplicatedActualItems.reduce((sum, item) => sum + item.amount, 0)).toString(),
    totalExpenses: roundMoney(totalExpenses).toString(),
    netProfitForecast: roundMoney(netProfitForecast).toString(),
    breakEvenPoint: roundMoney(totalExpenses).toString(),
    safetyMargin: roundMoney(Math.max(forecastedRevenue - totalExpenses, 0)).toString(),
    profitMarginPercentage: roundMoney(profitMarginPercentage).toString(),
    status,
    budgetStatus: status,
    expenseItems: allExpenseItems,
    importedActualExpenses: acceptedActualItems,
    ignoredDuplicateExpenses: duplicatedActualItems,
  };
  const existing = (await list("budgetCalculations")).find(item => item.budgetId === budgetId);
  if (existing) {
    await update("budgetCalculations", existing.id, calcData);
    return { ...existing, ...calcData };
  }
  return insert("budgetCalculations", calcData);
}

function normalizeBudgetText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BUDGET_STOP_WORDS = new Set([
  "sem",
  "descricao",
  "despesa",
  "despesas",
  "custo",
  "custos",
  "fixo",
  "fixos",
  "variavel",
  "variaveis",
  "mensal",
  "mes",
  "pagamento",
  "conta",
  "meu",
  "minha",
  "casa",
  "empresa",
  "servico",
  "servicos",
  "outro",
  "outros",
  "para",
  "com",
  "por",
  "uma",
  "um",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "a",
  "o",
  "as",
  "os",
]);

const BUDGET_TOKEN_ALIASES: Record<string, string> = {
  alugueis: "aluguel",
  locacao: "aluguel",
  aluguel: "aluguel",
  imovel: "aluguel",
  condominio: "condominio",
  luz: "energia",
  eletrica: "energia",
  energia: "energia",
  agua: "agua",
  saneamento: "agua",
  internet: "internet",
  fibra: "internet",
  wifi: "internet",
  telefone: "telefone",
  celular: "telefone",
  software: "software",
  sistema: "software",
  app: "software",
  assinatura: "assinatura",
  assinaturas: "assinatura",
  adobe: "adobe",
  canva: "canva",
  contador: "contabilidade",
  contabilidade: "contabilidade",
  salario: "salario",
  salarios: "salario",
  colaborador: "colaborador",
  colaboradores: "colaborador",
  freelancer: "freelancer",
  trafego: "trafego",
  anuncios: "trafego",
  marketing: "marketing",
  mercado: "mercado",
  alimentacao: "alimentacao",
  emprestimo: "emprestimo",
  financiamento: "emprestimo",
};

function budgetTokens(value: string) {
  return normalizeBudgetText(value)
    .split(" ")
    .map(token => BUDGET_TOKEN_ALIASES[token] ?? token)
    .filter(token => token.length > 2 && !BUDGET_STOP_WORDS.has(token));
}

function textSimilarity(a: string, b: string) {
  const left = new Set(budgetTokens(a));
  const right = new Set(budgetTokens(b));
  if (!left.size || !right.size) return 0;
  const shared = Array.from(left).filter(token => right.has(token)).length;
  return shared / Math.min(left.size, right.size);
}

function hasSharedBudgetMeaning(a: string, b: string) {
  const left = new Set(budgetTokens(a));
  const right = new Set(budgetTokens(b));
  if (!left.size || !right.size) return false;
  return Array.from(left).some(token => right.has(token));
}

function analyzeBudgetDuplicate(a: ReturnType<typeof toBudgetExpenseItem>, b: ReturnType<typeof toBudgetExpenseItem>) {
  const amountDiff = Math.abs(a.amount - b.amount);
  const amountTolerance = Math.max(2, Math.min(a.amount, b.amount) * 0.05);
  if (amountDiff > amountTolerance) return null;
  const aText = `${a.description} ${a.category}`;
  const bText = `${b.description} ${b.category}`;
  const normalizedA = normalizeBudgetText(aText);
  const normalizedB = normalizeBudgetText(bText);
  const similarity = textSimilarity(aText, bText);
  const containsSameText = normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
  const sharesMeaning = hasSharedBudgetMeaning(aText, bText);

  if (!containsSameText && (!sharesMeaning || similarity < 0.5)) return null;

  const amountScore = Math.max(0, 1 - amountDiff / amountTolerance);
  const textScore = containsSameText ? 1 : similarity;
  const confidence = Math.round(((amountScore * 0.45) + (textScore * 0.55)) * 100);
  const reasonParts = [
    amountDiff === 0
      ? "mesmo valor"
      : `valor muito proximo, diferenca de ${formatBudgetAuditMoney(amountDiff)}`,
    containsSameText
      ? "descricao equivalente"
      : `termos em comum: ${sharedBudgetTokens(aText, bText).join(", ") || "categoria parecida"}`,
  ];

  return {
    match: a,
    amountDiff,
    textSimilarity: containsSameText ? 1 : similarity,
    confidence,
    reason: reasonParts.join(" e "),
  };
}

function findBudgetDuplicate(
  candidates: ReturnType<typeof toBudgetExpenseItem>[],
  item: ReturnType<typeof toBudgetExpenseItem>
) {
  return candidates
    .map(candidate => analyzeBudgetDuplicate(candidate, item))
    .filter((result): result is NonNullable<typeof result> => Boolean(result))
    .sort((a, b) => b.confidence - a.confidence || a.amountDiff - b.amountDiff)[0] ?? null;
}

function sharedBudgetTokens(a: string, b: string) {
  const left = new Set(budgetTokens(a));
  const right = new Set(budgetTokens(b));
  return Array.from(left).filter(token => right.has(token));
}

function formatBudgetAuditMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(roundMoney(value));
}

function classifyActualExpense(expense: LocalRecord): "fixed" | "variable" | "personal" {
  const text = normalizeBudgetText(`${expense.category} ${expense.description}`);
  if (expense.collaboratorId || /\b(colaborador|freelancer|equipe|salario|pro labore|prolabore)\b/.test(text)) return "fixed";
  if (/\b(pessoal|cartao|celular|moradia|mercado|dizimo|lazer|casa|alimentacao)\b/.test(text)) return "personal";
  if (/\b(aluguel|internet|energia|agua|software|assinatura|emprestimo|estrutura|contabilidade)\b/.test(text)) return "fixed";
  return "variable";
}

function toBudgetExpenseItem(item: LocalRecord, type: "fixed" | "variable" | "personal" | "collaborator", source: "planned" | "actual" | "collaborator") {
  return {
    id: item.id,
    source,
    type,
    description: item.description || item.name || "Sem descricao",
    category: item.category || item.role || "Sem categoria",
    amount: money(item.amount ?? item.monthlyCost),
    date: item.date ?? null,
    duplicateOf: null as string | null,
  };
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
