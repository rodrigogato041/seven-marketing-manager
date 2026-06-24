import { z } from "zod/v4";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { invokeLLM, type Message } from "./_core/llm";
import * as db from "./db";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});

type PriorityLevel = "critical" | "high" | "medium" | "low";

type BusinessContext = Awaited<ReturnType<typeof buildBusinessContext>>;

type ProactiveBrief = {
  headline: string;
  summary: string;
  priorities: Array<{
    title: string;
    reason: string;
    impact: string;
    action: string;
    level: PriorityLevel;
  }>;
  risks: Array<{
    title: string;
    evidence: string;
    action: string;
    level: PriorityLevel;
  }>;
  opportunities: Array<{
    title: string;
    reason: string;
    action: string;
  }>;
  nextMoves: string[];
  questionsToOwner: string[];
};

const priorityLevels: PriorityLevel[] = ["critical", "high", "medium", "low"];

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDate(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? new Date(parsed) : null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: unknown) {
  const date = asDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function topItems<T>(items: T[], limit = 8) {
  return items.slice(0, limit);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const first = value.indexOf("{");
    const last = value.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(value.slice(first, last + 1));
    }
    throw new Error("A IA retornou um formato inesperado.");
  }
}

function normalizeLevel(level: unknown): PriorityLevel {
  return priorityLevels.includes(level as PriorityLevel) ? level as PriorityLevel : "medium";
}

function normalizeBrief(input: Partial<ProactiveBrief>): ProactiveBrief {
  return {
    headline: input.headline || "Radar executivo pronto",
    summary: input.summary || "Analise os sinais do CRM para decidir as proximas acoes.",
    priorities: (input.priorities || []).slice(0, 6).map(item => ({
      title: item.title || "Prioridade sem titulo",
      reason: item.reason || "O sistema identificou este ponto como relevante.",
      impact: item.impact || "Pode afetar resultado, operacao ou caixa.",
      action: item.action || "Revise este item e defina o proximo responsavel.",
      level: normalizeLevel(item.level),
    })),
    risks: (input.risks || []).slice(0, 6).map(item => ({
      title: item.title || "Risco sem titulo",
      evidence: item.evidence || "Existe sinal de atencao nos dados atuais.",
      action: item.action || "Acompanhe e trate antes que vire urgencia.",
      level: normalizeLevel(item.level),
    })),
    opportunities: (input.opportunities || []).slice(0, 5).map(item => ({
      title: item.title || "Oportunidade",
      reason: item.reason || "Ha espaco para melhoria operacional ou financeira.",
      action: item.action || "Transforme em uma acao objetiva.",
    })),
    nextMoves: (input.nextMoves || []).slice(0, 8),
    questionsToOwner: (input.questionsToOwner || []).slice(0, 5),
  };
}

async function buildBusinessContext() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const inSevenDays = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const inThirtyDays = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const [
    clients,
    payments,
    expenses,
    collaborators,
    tasks,
    dashboard,
    executive,
    collections,
    finance,
    todayCommand,
    clientIntelligence,
    reports,
  ] = await Promise.all([
    db.listClients(),
    db.listPayments(),
    db.listExpenses(),
    db.listCollaborators(),
    db.listTasks(),
    db.getDashboardStats(),
    db.getExecutiveDashboard(),
    db.getCollectionsCenter(),
    db.getStrategicFinance(year, month),
    db.getTodayCommandCenter(),
    db.getClientIntelligence(),
    db.getReportsCenter(year, month),
  ]);

  const activeClients = clients.filter(client => client.status === "active");
  const inactiveClients = clients.filter(client => client.status !== "active");
  const pendingTasks = tasks.filter(task => task.status !== "done");
  const urgentTasks = pendingTasks
    .filter(task => task.priority === "urgent" || task.priority === "high")
    .sort((a, b) => money(a.dueDate) - money(b.dueDate));
  const overdueTasks = pendingTasks
    .filter(task => {
      const dueDate = money(task.dueDate);
      return dueDate > 0 && dueDate < now.getTime();
    })
    .sort((a, b) => money(a.dueDate) - money(b.dueDate));
  const dueSoonTasks = pendingTasks
    .filter(task => {
      const dueDate = money(task.dueDate);
      return dueDate >= now.getTime() && dueDate <= inSevenDays;
    })
    .sort((a, b) => money(a.dueDate) - money(b.dueDate));
  const overduePayments = payments.filter(payment => payment.status === "overdue");
  const pendingPayments = payments.filter(payment => payment.status === "pending");
  const dueSoonPayments = pendingPayments
    .filter(payment => {
      const dueDate = money(payment.dueDate);
      return dueDate > 0 && dueDate <= inThirtyDays;
    })
    .sort((a, b) => money(a.dueDate) - money(b.dueDate));
  const monthlyRevenue = activeClients.reduce((sum, client) => sum + money(client.monthlyValue), 0);
  const overdueAmount = overduePayments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const monthlyExpensesList = expenses.filter(expense => {
    const date = asDate(expense.date);
    return date && date.getFullYear() === year && date.getMonth() + 1 === month;
  });
  const monthlyExpenses = monthlyExpensesList.reduce((sum, expense) => sum + money(expense.amount), 0);
  const topExpenseCategories = Object.entries(
    monthlyExpensesList.reduce<Record<string, number>>((acc, expense) => {
      const category = String(expense.category || "Sem categoria");
      acc[category] = (acc[category] || 0) + money(expense.amount);
      return acc;
    }, {})
  )
    .map(([category, amount]) => ({ category, amount, formattedAmount: formatCurrency(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const clientById = new Map(clients.map(client => [client.id, client]));

  return {
    today: now.toISOString(),
    month: { year, month },
    dashboard,
    executive,
    finance,
    todayCommand,
    clientIntelligence,
    reports,
    totals: {
      clients: clients.length,
      activeClients: activeClients.length,
      inactiveClients: inactiveClients.length,
      collaborators: collaborators.length,
      openTasks: pendingTasks.length,
      urgentTasks: urgentTasks.length,
      overdueTasks: overdueTasks.length,
      dueSoonTasks: dueSoonTasks.length,
      overduePayments: overduePayments.length,
      pendingPayments: pendingPayments.length,
      estimatedMonthlyRevenue: formatCurrency(monthlyRevenue),
      currentMonthExpenses: formatCurrency(monthlyExpenses),
      overdueAmount: formatCurrency(overdueAmount),
      pendingAmount: formatCurrency(pendingAmount),
      raw: {
        estimatedMonthlyRevenue: monthlyRevenue,
        currentMonthExpenses: monthlyExpenses,
        overdueAmount,
        pendingAmount,
      },
    },
    clients: topItems(activeClients, 20).map(client => ({
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName,
      status: client.status,
      monthlyValue: formatCurrency(money(client.monthlyValue)),
      services: {
        metaAds: Boolean(client.metaAds),
        googleAds: Boolean(client.googleAds),
        socialMedia: Boolean(client.socialMedia),
        videos: client.videoQuantity ?? 0,
        images: client.imageQuantity ?? 0,
      },
      contractStatus: client.contractStatus,
      contractDueDay: client.contractDueDay,
    })),
    urgentTasks: topItems(urgentTasks, 12).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      dueDateFormatted: formatDate(task.dueDate),
      clientId: task.clientId,
      clientName: task.clientId ? clientById.get(task.clientId)?.companyName : null,
    })),
    overdueTasks: topItems(overdueTasks, 12).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      dueDateFormatted: formatDate(task.dueDate),
      clientId: task.clientId,
      clientName: task.clientId ? clientById.get(task.clientId)?.companyName : null,
    })),
    dueSoonPayments: topItems(dueSoonPayments, 12).map(payment => ({
      id: payment.id,
      clientId: payment.clientId,
      clientName: clientById.get(payment.clientId)?.companyName,
      amount: formatCurrency(money(payment.amount)),
      status: payment.status,
      dueDate: payment.dueDate,
      dueDateFormatted: formatDate(payment.dueDate),
    })),
    collections: {
      totals: collections.summary,
      urgent: topItems(collections.collections ?? [], 12),
    },
    expenses: {
      currentMonthTotal: formatCurrency(monthlyExpenses),
      topCategories: topExpenseCategories,
      recent: topItems(
        [...expenses].sort((a, b) => money(b.date) - money(a.date)),
        12
      ).map(expense => ({
        id: expense.id,
        description: expense.description,
        category: expense.category,
        amount: formatCurrency(money(expense.amount)),
        date: expense.date,
        dateFormatted: formatDate(expense.date),
      })),
    },
  };
}

function buildDeterministicBrief(context: BusinessContext): ProactiveBrief {
  const totals = context.totals;
  const priorities: ProactiveBrief["priorities"] = [];
  const risks: ProactiveBrief["risks"] = [];
  const opportunities: ProactiveBrief["opportunities"] = [];

  if (totals.overduePayments > 0) {
    priorities.push({
      title: "Atacar cobrancas vencidas",
      reason: `${totals.overduePayments} cobrancas estao vencidas, somando ${totals.overdueAmount}.`,
      impact: "Caixa atrasado reduz margem de manobra e aumenta risco operacional.",
      action: "Abra a aba Cobrancas, priorize os maiores valores e registre o proximo contato.",
      level: "critical",
    });
    risks.push({
      title: "Risco de caixa travado",
      evidence: `Valor vencido identificado: ${totals.overdueAmount}.`,
      action: "Defina uma rotina diaria de cobranca ate normalizar os recebimentos.",
      level: "critical",
    });
  }

  if (totals.overdueTasks > 0 || totals.urgentTasks > 0) {
    priorities.push({
      title: "Limpar tarefas criticas",
      reason: `${totals.overdueTasks} tarefas vencidas e ${totals.urgentTasks} urgentes aparecem no sistema.`,
      impact: "Atrasos em producao e atendimento podem afetar retencao de clientes.",
      action: "Delegue as 3 primeiras tarefas mais antigas antes de criar novas demandas.",
      level: totals.overdueTasks > 0 ? "high" : "medium",
    });
  }

  if (totals.pendingPayments > 0) {
    priorities.push({
      title: "Antecipar recebimentos pendentes",
      reason: `${totals.pendingPayments} pagamentos estao pendentes, somando ${totals.pendingAmount}.`,
      impact: "Recebimentos previsiveis ajudam a proteger o planejamento financeiro.",
      action: "Confirme vencimentos dos proximos 30 dias e cobre antes de virar atraso.",
      level: "high",
    });
  }

  if (totals.raw.currentMonthExpenses > 0) {
    opportunities.push({
      title: "Revisar maiores categorias de despesa",
      reason: `O mes ja acumula ${totals.currentMonthExpenses} em despesas registradas.`,
      action: "Compare as maiores categorias com o planejamento financeiro e corte duplicidades.",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      title: "Manter rotina de crescimento",
      reason: "Nao ha sinal critico automatico no momento.",
      impact: "Este e um bom momento para melhorar processos, vendas e acompanhamento de clientes.",
      action: "Revise clientes ativos, producao do mes e oportunidades de upsell.",
      level: "medium",
    });
  }

  return {
    headline: totals.overduePayments > 0 ? "Caixa e cobrancas pedem prioridade" : "Operacao sob controle, hora de acelerar",
    summary: `Hoje o sistema mostra ${totals.activeClients} clientes ativos, ${totals.openTasks} tarefas abertas e receita mensal estimada de ${totals.estimatedMonthlyRevenue}.`,
    priorities: priorities.slice(0, 5),
    risks: risks.slice(0, 5),
    opportunities: opportunities.slice(0, 4),
    nextMoves: [
      "Conferir cobrancas vencidas e pendentes.",
      "Resolver ou delegar tarefas urgentes.",
      "Revisar despesas do mes no planejamento financeiro.",
      "Usar a IA para montar um plano de acao da semana.",
    ],
    questionsToOwner: [
      "Qual meta de faturamento voce quer perseguir este mes?",
      "Quais clientes sao prioridade estrategica para retencao?",
      "A IA pode sugerir tarefas, mas voce quer aprovar antes de criar no sistema?",
    ],
  };
}

const systemPrompt = `Voce e a inteligencia executiva da Seven Marketing Manager.
Atue como socio estrategico do dono da empresa: pense em caixa, clientes, producao, cobrancas, prioridades, risco e crescimento.
Responda em portugues do Brasil, com objetividade e raciocinio de negocio.
Use os dados reais do contexto do CRM antes de sugerir qualquer acao.
Quando houver risco, diga o risco, a evidencia e a acao recomendada.
Quando houver oportunidade, diga o ganho esperado e o primeiro passo.
Quando faltar informacao, diga exatamente qual dado falta.
Nao invente numeros fora do contexto fornecido.
Nao prometa que alterou dados. Por seguranca, por enquanto voce orienta, prioriza, diagnostica e recomenda proximas acoes.`;

async function generateProactiveBrief(context: BusinessContext): Promise<ProactiveBrief> {
  if (!ENV.forgeApiKey) {
    return buildDeterministicBrief(context);
  }

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Gere um briefing executivo proativo para o dono da Seven Marketing. Ele deve abrir a pagina e ja saber o que fazer antes de perguntar.
Responda somente JSON valido neste formato:
{
  "headline": "frase curta",
  "summary": "resumo executivo",
  "priorities": [{"title": "", "reason": "", "impact": "", "action": "", "level": "critical|high|medium|low"}],
  "risks": [{"title": "", "evidence": "", "action": "", "level": "critical|high|medium|low"}],
  "opportunities": [{"title": "", "reason": "", "action": ""}],
  "nextMoves": ["acao objetiva"],
  "questionsToOwner": ["pergunta que desbloqueia decisao"]
}`,
    },
    {
      role: "user",
      content: `Contexto atual do sistema:\n${JSON.stringify(context, null, 2)}`,
    },
  ];

  const response = await invokeLLM({
    messages,
    maxTokens: 3000,
    responseFormat: { type: "json_object" },
  });
  const content = response.choices[0]?.message?.content;
  const parsed = safeJsonParse(typeof content === "string" ? content : JSON.stringify(content ?? {}));
  return normalizeBrief(parsed);
}

export const aiRouter = router({
  status: protectedProcedure.query(() => ({
    configured: Boolean(ENV.forgeApiKey),
    model: ENV.openAiModel,
    reasoningEffort: ENV.openAiReasoningEffort,
  })),
  businessContext: protectedProcedure.query(() => buildBusinessContext()),
  proactiveBrief: protectedProcedure.query(async () => {
    const context = await buildBusinessContext();
    return generateProactiveBrief(context);
  }),
  chat: protectedProcedure.input(z.object({
    messages: z.array(chatMessageSchema).min(1).max(24),
  })).mutation(async ({ input }) => {
    if (!ENV.forgeApiKey) {
      return {
        content: "A IA ainda nao esta configurada. Adicione OPENAI_API_KEY nas variaveis de ambiente do Render e reinicie o servico.",
        model: ENV.openAiModel,
      };
    }

    const context = await buildBusinessContext();
    const brief = buildDeterministicBrief(context);
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: `Contexto atual do sistema Seven Marketing Manager:\n${JSON.stringify(context, null, 2)}`,
      },
      {
        role: "system",
        content: `Radar automatico inicial:\n${JSON.stringify(brief, null, 2)}`,
      },
      ...input.messages.slice(-16).map(message => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const response = await invokeLLM({ messages, maxTokens: 4200 });
    const content = response.choices[0]?.message?.content;
    return {
      content: typeof content === "string" ? content : JSON.stringify(content ?? ""),
      model: response.model,
      usage: response.usage,
    };
  }),
});
