import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, CheckCircle2, GitCompareArrows,
} from "lucide-react";
import { toast } from "sonner";
import ProjectedCashFlow from "./ProjectedCashFlow";
import ScenarioAnalysis from "./ScenarioAnalysis";
import PDFExportButton from "./PDFExportButton";
import BudgetAlerts from "./BudgetAlerts";
import GoogleCalendarSync from "./GoogleCalendarSync";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type BudgetExpenseType = "fixed" | "variable" | "personal" | "collaborator";

type BudgetExpenseItem = {
  id: number;
  source: string;
  type: BudgetExpenseType;
  description: string;
  category: string;
  amount: number;
  date?: number | null;
  duplicateOf?: string | null;
  duplicateMatch?: BudgetExpenseItem | null;
  duplicateReason?: string | null;
  duplicateConfidence?: number | null;
  duplicateAmountDiff?: number | null;
  duplicateTextSimilarity?: number | null;
};

function formatBudgetDate(date?: number | null) {
  if (!date) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

function ImportedExpenseList({
  title,
  description,
  emptyMessage,
  items,
  financialValue = value => value,
  duplicate = false,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  items: BudgetExpenseItem[];
  financialValue?: (value: string) => string;
  duplicate?: boolean;
}) {
  const rowClass = duplicate ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60";
  const amountClass = duplicate ? "text-amber-700" : "text-emerald-700";

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={`${item.source}-${item.id}-${item.duplicateOf ?? "accepted"}`} className={`flex items-center justify-between gap-4 rounded-md border p-3 ${rowClass}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.description}</p>
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="secondary">Aba Despesas</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBudgetDate(item.date)}
                  {duplicate ? " - Ignorada por duplicidade" : " - Contabilizada nesta coluna"}
                </p>
              </div>
              <p className={`shrink-0 font-bold ${amountClass}`}>{financialValue(formatCurrency(item.amount))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function sourceLabel(source: string) {
  if (source === "planned") return "Planejamento";
  if (source === "actual") return "Aba Despesas";
  if (source === "collaborator") return "Colaboradores";
  return source;
}

function costTypeLabel(type: BudgetExpenseType) {
  if (type === "fixed") return "Custo fixo";
  if (type === "variable") return "Custo variavel";
  if (type === "personal") return "Despesa pessoal";
  return "Colaborador";
}

function DeduplicationAudit({
  acceptedItems,
  duplicatedItems,
  financialValue,
}: {
  acceptedItems: BudgetExpenseItem[];
  duplicatedItems: BudgetExpenseItem[];
  financialValue: (value: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Contabilizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700">{acceptedItems.length}</p>
            <p className="text-xs text-muted-foreground">Despesas reais integradas ao planejamento</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitCompareArrows className="h-4 w-4 text-amber-700" />
              Ignoradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{duplicatedItems.length}</p>
            <p className="text-xs text-muted-foreground">Itens parecidos que nao somaram duas vezes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Criterio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Compara valor, descricao, categoria e termos equivalentes.</p>
          </CardContent>
        </Card>
      </div>

      {duplicatedItems.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma duplicidade encontrada neste mes.
        </p>
      ) : (
        <div className="space-y-3">
          {duplicatedItems.map(item => {
            const match = item.duplicateMatch;
            return (
              <Card key={`${item.source}-${item.id}-${item.duplicateOf}`} className="border-amber-200">
                <CardContent className="p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Ignorada</Badge>
                        <Badge variant="secondary">{costTypeLabel(item.type)}</Badge>
                      </div>
                      <p className="font-semibold">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.category} - {formatBudgetDate(item.date)}</p>
                      <p className="mt-2 font-bold text-amber-700">{financialValue(formatCurrency(item.amount))}</p>
                    </div>

                    <div className="flex items-center justify-center">
                      <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Mantida</Badge>
                        <Badge variant="secondary">{sourceLabel(match?.source ?? "")}</Badge>
                      </div>
                      <p className="font-semibold">{match?.description ?? item.duplicateOf ?? "Item original"}</p>
                      <p className="text-xs text-muted-foreground">{match?.category ?? "Sem categoria"}</p>
                      <p className="mt-2 font-bold text-emerald-700">{financialValue(formatCurrency(match?.amount ?? 0))}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Motivo</p>
                      <p className="font-medium">{item.duplicateReason ?? "Valor e descricao parecidos"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Confianca</p>
                      <p className="font-medium">{item.duplicateConfidence ?? 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Diferenca de valor</p>
                      <p className="font-medium">{financialValue(formatCurrency(item.duplicateAmountDiff ?? 0))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface BudgetPlanningDashboardProps {
  year: number;
  month: number;
  financialValue?: (value: string) => string;
}

export default function BudgetPlanningDashboard({ year, month, financialValue = value => value }: BudgetPlanningDashboardProps) {
  const [showAddFixedCost, setShowAddFixedCost] = useState(false);
  const [showAddVariableCost, setShowAddVariableCost] = useState(false);
  const [showAddPersonalExpense, setShowAddPersonalExpense] = useState(false);
  const [forecastedRevenue, setForecastedRevenue] = useState("");
  const [fixedCostForm, setFixedCostForm] = useState({ description: "", amount: "", category: "", isRecurring: true });
  const [variableCostForm, setVariableCostForm] = useState({ description: "", amount: "", category: "" });
  const [personalExpenseForm, setPersonalExpenseForm] = useState({ description: "", amount: "", category: "" });

  // Queries
  const { data: billingForecast } = trpc.payments.billingForecast.useQuery({ year, month }, { refetchInterval: 10000 });
  const { data: budget, isLoading: loadingBudget } = trpc.budgetPlanning.getOrCreateBudget.useQuery({ year, month });
  const { data: fixedCosts = [] } = trpc.budgetPlanning.getFixedCosts.useQuery(
    { budgetId: budget?.id || 0 },
    { enabled: !!budget?.id }
  );
  const { data: variableCosts = [] } = trpc.budgetPlanning.getVariableCosts.useQuery(
    { budgetId: budget?.id || 0 },
    { enabled: !!budget?.id }
  );
  const { data: personalExpenses = [] } = trpc.budgetPlanning.getPersonalExpenses.useQuery(
    { budgetId: budget?.id || 0 },
    { enabled: !!budget?.id }
  );
  const { data: metricsData } = trpc.budgetPlanning.getMetrics.useQuery(
    { budgetId: budget?.id || 0 },
    { enabled: !!budget?.id, refetchInterval: 3000, refetchOnWindowFocus: true }
  );
  const metrics = metricsData ?? null;
  const utils = trpc.useUtils();

  // Dynamic forecasted revenue from billing forecast
  const dynamicForecastedRevenue = billingForecast?.predicted || 0;

  // Mutations
  const updateBudget = trpc.budgetPlanning.updateBudget.useMutation({
    onSuccess: () => toast.success("Faturamento atualizado!"),
  });
  const calculateMetrics = trpc.budgetPlanning.calculateMetrics.useMutation();
  const deleteFixedCost = trpc.budgetPlanning.deleteFixedCost.useMutation({
    onSuccess: async () => {
      await refreshPlanning();
      toast.success("Custo fixo removido!");
    },
  });
  const deleteVariableCost = trpc.budgetPlanning.deleteVariableCost.useMutation({
    onSuccess: async () => {
      await refreshPlanning();
      toast.success("Custo variavel removido!");
    },
  });
  const deletePersonalExpense = trpc.budgetPlanning.deletePersonalExpense.useMutation({
    onSuccess: async () => {
      await refreshPlanning();
      toast.success("Despesa pessoal removida!");
    },
  });
  const refreshPlanning = async () => {
    if (!budget?.id) return;
    const budgetId = budget.id;
    await Promise.all([
      utils.budgetPlanning.getFixedCosts.invalidate({ budgetId }),
      utils.budgetPlanning.getVariableCosts.invalidate({ budgetId }),
      utils.budgetPlanning.getPersonalExpenses.invalidate({ budgetId }),
      utils.expenses.list.invalidate(),
      utils.budgetAlerts.checkBudgetAlerts.invalidate({ year, month }),
    ]);
    const freshMetrics = await calculateMetrics.mutateAsync({ budgetId });
    utils.budgetPlanning.getMetrics.setData({ budgetId }, freshMetrics);
    await utils.budgetPlanning.getMetrics.invalidate({ budgetId });
  };
  const createFixedCost = trpc.budgetPlanning.createFixedCost.useMutation({
    onSuccess: async () => {
      setShowAddFixedCost(false);
      setFixedCostForm({ description: "", amount: "", category: "", isRecurring: true });
      await refreshPlanning();
      toast.success("Custo fixo adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar custo fixo"),
  });
  const createVariableCost = trpc.budgetPlanning.createVariableCost.useMutation({
    onSuccess: async () => {
      setShowAddVariableCost(false);
      setVariableCostForm({ description: "", amount: "", category: "" });
      await refreshPlanning();
      toast.success("Custo variavel adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar custo variavel"),
  });
  const createPersonalExpense = trpc.budgetPlanning.createPersonalExpense.useMutation({
    onSuccess: async () => {
      setShowAddPersonalExpense(false);
      setPersonalExpenseForm({ description: "", amount: "", category: "" });
      await refreshPlanning();
      toast.success("Despesa pessoal adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar despesa pessoal"),
  });

  // Calculations
  const totalFixedCosts = metrics?.totalFixedCosts ?? fixedCosts.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalVariableCosts = metrics?.totalVariableCosts ?? variableCosts.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalPersonalExpenses = metrics?.totalPersonalExpenses ?? personalExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const importedActualExpenses = (metrics?.importedActualExpenses ?? []) as BudgetExpenseItem[];
  const ignoredDuplicateExpenses = (metrics?.ignoredDuplicateExpenses ?? []) as BudgetExpenseItem[];
  const actualFixedExpenses = importedActualExpenses.filter(item => item.type === "fixed");
  const actualVariableExpenses = importedActualExpenses.filter(item => item.type === "variable");
  const actualPersonalExpenses = importedActualExpenses.filter(item => item.type === "personal");
  const duplicatedFixedExpenses = ignoredDuplicateExpenses.filter(item => item.type === "fixed");
  const duplicatedVariableExpenses = ignoredDuplicateExpenses.filter(item => item.type === "variable");
  const duplicatedPersonalExpenses = ignoredDuplicateExpenses.filter(item => item.type === "personal");

  // Auto-update budget when billing forecast changes
  const { mutate: autoUpdateRevenue } = trpc.budgetPlanning.updateBudget.useMutation({
    onSuccess: async () => {
      if (budget?.id) {
        await refreshPlanning();
      }
    },
  });

  // Update budget when billing forecast changes
  useEffect(() => {
    if (budget?.id && dynamicForecastedRevenue >= 0) {
      autoUpdateRevenue({
        budgetId: budget.id,
        forecastedRevenue: dynamicForecastedRevenue,
      });
    }
  }, [dynamicForecastedRevenue, budget?.id, autoUpdateRevenue]);

  // Faturamento agora eh atualizado automaticamente via useEffect

  if (loadingBudget) return <div>Carregando...</div>;
  if (!budget) return <div>Erro ao carregar orçamento</div>;

  const budgetStatus = (metrics as any)?.budgetStatus as string || "negative";
  const statusColor = budgetStatus === "positive" ? "bg-emerald-50 border-emerald-200" :
    budgetStatus === "warning" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const statusIcon = budgetStatus === "positive" ? TrendingUp :
    budgetStatus === "warning" ? AlertTriangle : TrendingDown;
  const StatusIcon = statusIcon;
  const fixedAmount = Number(fixedCostForm.amount);
  const variableAmount = Number(variableCostForm.amount);
  const personalAmount = Number(personalExpenseForm.amount);
  const canCreateFixedCost = Boolean(fixedCostForm.description.trim() && fixedCostForm.category.trim() && fixedAmount > 0);
  const canCreateVariableCost = Boolean(variableCostForm.description.trim() && variableCostForm.category.trim() && variableAmount > 0);
  const canCreatePersonalExpense = Boolean(personalExpenseForm.description.trim() && personalExpenseForm.category.trim() && personalAmount > 0);

  return (
    <div className="space-y-6">
      {/* Revenue Input */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento Previsto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {billingForecast && (
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="font-semibold text-foreground">Faturamento Previsto (Dinamico)</div>
              <div>Clientes ativos: <strong>{financialValue(formatCurrency(billingForecast.predicted))}</strong></div>
              <div>Recebido: <strong>{financialValue(formatCurrency(billingForecast.received))}</strong></div>
              <div>Pendente: <strong>{financialValue(formatCurrency(billingForecast.pending))}</strong></div>
            </div>
          )}
          {!billingForecast && (
            <div className="text-sm text-muted-foreground">Carregando faturamento previsto...</div>
          )}
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      <BudgetAlerts year={year} month={month} />

      {/* Export Buttons */}
      <div className="flex gap-2 justify-end">
        <PDFExportButton year={year} month={month} reportType="budget" />
        <PDFExportButton year={year} month={month} reportType="expenses" />
      </div>

      {/* Main Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Result Forecast */}
        <Card className={`${statusColor} border-2`}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-md border border-blue-100 bg-white flex items-center justify-center shadow-sm">
              <StatusIcon className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Resultado Previsto</p>
              <p className={`text-2xl font-bold ${metrics?.netProfitForecast ?? 0 >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {metrics ? financialValue(formatCurrency(metrics.netProfitForecast)) : "-"}
              </p>
              <Badge className="mt-2" variant={budgetStatus === "positive" ? "default" : "destructive"}>
                {budgetStatus === "positive" ? "✓ Lucro" : budgetStatus === "warning" ? "⚠ Atenção" : "✗ Prejuízo"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Safety Margin */}
        <Card className="bg-emerald-50/35 border-emerald-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-md border border-emerald-100 bg-white flex items-center justify-center shadow-sm">
              <Target className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Meta de Segurança</p>
              <p className="text-2xl font-bold text-green-600">
                {metrics ? financialValue(formatCurrency(metrics.safetyMargin)) : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Quanto ainda pode gastar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Break-even Point */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ponto de Equilíbrio</p>
              <p className="text-2xl font-bold mt-1">{metrics ? financialValue(formatCurrency(metrics.breakEvenPoint)) : "-"}</p>
              <p className="text-xs text-muted-foreground mt-1">Faturamento mínimo necessário para cobrir todas as despesas</p>
            </div>
            <Zap className="h-8 w-8 text-amber-500" />
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Custos Fixos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{financialValue(formatCurrency(totalFixedCosts))}</p>
            <p className="text-xs text-muted-foreground mt-1">Planejados + despesas reais classificadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Custos Variáveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{financialValue(formatCurrency(totalVariableCosts))}</p>
            <p className="text-xs text-muted-foreground mt-1">Planejados + despesas reais classificadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Despesas Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{financialValue(formatCurrency(totalPersonalExpenses))}</p>
            <p className="text-xs text-muted-foreground mt-1">Planejadas + despesas reais classificadas</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Despesas Integradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700">{financialValue(formatCurrency(metrics?.totalActualExpenses ?? 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">{importedActualExpenses.length} vindas da aba Despesas</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Duplicidades Ignoradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{financialValue(formatCurrency(metrics?.totalDuplicatedActualExpenses ?? 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">{ignoredDuplicateExpenses.length} itens nao contados duas vezes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <Tabs defaultValue="fixed" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="fixed">Custos Fixos</TabsTrigger>
          <TabsTrigger value="variable">Custos Variáveis</TabsTrigger>
          <TabsTrigger value="personal">Despesas Pessoais</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="scenarios">Cenários</TabsTrigger>
        </TabsList>

        {/* Fixed Costs Tab */}
        <TabsContent value="fixed" className="space-y-4">
          <Button onClick={() => setShowAddFixedCost(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Custo Fixo
          </Button>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Custos cadastrados manualmente</p>
            {fixedCosts.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Nenhum custo fixo manual cadastrado.</p>
            ) : (
              fixedCosts.map(cost => (
                <Card key={cost.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{cost.description}</p>
                    <p className="text-sm text-muted-foreground">{cost.category}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold">{financialValue(formatCurrency(cost.amount))}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFixedCost.mutate({ id: cost.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          <ImportedExpenseList
            title="Despesas classificadas como custo fixo"
            description="Itens registrados na aba Despesas que entraram automaticamente nesta coluna."
            emptyMessage="Nenhuma despesa da aba Despesas foi classificada como custo fixo neste mes."
            items={actualFixedExpenses}
            financialValue={financialValue}
          />
          <ImportedExpenseList
            title="Duplicidades ignoradas em custo fixo"
            description="Itens parecidos com custos ja considerados e que nao entraram duas vezes no total."
            emptyMessage="Nenhuma duplicidade ignorada nesta coluna."
            items={duplicatedFixedExpenses}
            financialValue={financialValue}
            duplicate
          />
        </TabsContent>

        {/* Variable Costs Tab */}
        <TabsContent value="variable" className="space-y-4">
          <Button onClick={() => setShowAddVariableCost(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Custo Variável
          </Button>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Custos cadastrados manualmente</p>
            {variableCosts.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Nenhum custo variavel manual cadastrado.</p>
            ) : (
              variableCosts.map(cost => (
                <Card key={cost.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{cost.description}</p>
                    <p className="text-sm text-muted-foreground">{cost.category}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold">{financialValue(formatCurrency(cost.amount))}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVariableCost.mutate({ id: cost.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          <ImportedExpenseList
            title="Despesas classificadas como custo variavel"
            description="Itens registrados na aba Despesas que entraram automaticamente nesta coluna."
            emptyMessage="Nenhuma despesa da aba Despesas foi classificada como custo variavel neste mes."
            items={actualVariableExpenses}
            financialValue={financialValue}
          />
          <ImportedExpenseList
            title="Duplicidades ignoradas em custo variavel"
            description="Itens parecidos com custos ja considerados e que nao entraram duas vezes no total."
            emptyMessage="Nenhuma duplicidade ignorada nesta coluna."
            items={duplicatedVariableExpenses}
            financialValue={financialValue}
            duplicate
          />
        </TabsContent>

        {/* Personal Expenses Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Button onClick={() => setShowAddPersonalExpense(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Despesa Pessoal
          </Button>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Despesas cadastradas manualmente</p>
            {personalExpenses.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Nenhuma despesa pessoal manual cadastrada.</p>
            ) : (
              personalExpenses.map(expense => (
                <Card key={expense.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">{expense.category}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold">{financialValue(formatCurrency(expense.amount))}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePersonalExpense.mutate({ id: expense.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          <ImportedExpenseList
            title="Despesas classificadas como despesa pessoal"
            description="Itens registrados na aba Despesas que entraram automaticamente nesta coluna."
            emptyMessage="Nenhuma despesa da aba Despesas foi classificada como despesa pessoal neste mes."
            items={actualPersonalExpenses}
            financialValue={financialValue}
          />
          <ImportedExpenseList
            title="Duplicidades ignoradas em despesas pessoais"
            description="Itens parecidos com despesas ja consideradas e que nao entraram duas vezes no total."
            emptyMessage="Nenhuma duplicidade ignorada nesta coluna."
            items={duplicatedPersonalExpenses}
            financialValue={financialValue}
            duplicate
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <DeduplicationAudit
            acceptedItems={importedActualExpenses}
            duplicatedItems={ignoredDuplicateExpenses}
            financialValue={financialValue}
          />
        </TabsContent>

        {/* Projected Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          {metrics && (
            <ProjectedCashFlow
              forecastedRevenue={metrics.forecastedRevenue}
              totalExpenses={metrics.totalExpenses}
              daysInMonth={new Date(year, month, 0).getDate()}
              expenseItems={metrics.expenseItems ?? []}
              financialValue={financialValue}
            />
          )}
        </TabsContent>

        {/* Scenario Analysis Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          {metrics && (
            <ScenarioAnalysis
              baseRevenue={metrics.forecastedRevenue}
              totalExpenses={metrics.totalExpenses}
              breakEvenPoint={metrics.breakEvenPoint}
              actualExpenses={metrics.totalActualExpenses ?? 0}
              duplicatedExpenses={metrics.totalDuplicatedActualExpenses ?? 0}
              financialValue={financialValue}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Google Calendar Sync */}
      <GoogleCalendarSync year={year} month={month} />

      {/* Dialogs for Adding Items */}
      {/* Add Fixed Cost Dialog */}
      <Dialog open={showAddFixedCost} onOpenChange={setShowAddFixedCost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Custo Fixo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descricao *</Label>
              <Input
                value={fixedCostForm.description}
                onChange={e => setFixedCostForm(form => ({ ...form, description: e.target.value }))}
                placeholder="Ex.: Aluguel, internet, assinatura"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fixedCostForm.amount}
                onChange={e => setFixedCostForm(form => ({ ...form, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Input
                value={fixedCostForm.category}
                onChange={e => setFixedCostForm(form => ({ ...form, category: e.target.value }))}
                placeholder="Ex.: Estrutura, Software, Equipe"
              />
            </div>
            <div className="space-y-2">
              <Label>Recorrencia</Label>
              <Select
                value={fixedCostForm.isRecurring ? "yes" : "no"}
                onValueChange={value => setFixedCostForm(form => ({ ...form, isRecurring: value === "yes" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Mensal recorrente</SelectItem>
                  <SelectItem value="no">Pontual neste mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFixedCost(false)}>Cancelar</Button>
            <Button
              disabled={!canCreateFixedCost || createFixedCost.isPending}
              onClick={() => budget?.id && createFixedCost.mutate({
                budgetId: budget.id,
                description: fixedCostForm.description.trim(),
                amount: fixedAmount,
                category: fixedCostForm.category.trim(),
                isRecurring: fixedCostForm.isRecurring,
              })}
            >
              {createFixedCost.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variable Cost Dialog */}
      <Dialog open={showAddVariableCost} onOpenChange={setShowAddVariableCost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Custo Variável</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descricao *</Label>
              <Input
                value={variableCostForm.description}
                onChange={e => setVariableCostForm(form => ({ ...form, description: e.target.value }))}
                placeholder="Ex.: Trafego, materiais, comissao"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={variableCostForm.amount}
                onChange={e => setVariableCostForm(form => ({ ...form, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Input
                value={variableCostForm.category}
                onChange={e => setVariableCostForm(form => ({ ...form, category: e.target.value }))}
                placeholder="Ex.: Marketing, Operacional, Terceiros"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVariableCost(false)}>Cancelar</Button>
            <Button
              disabled={!canCreateVariableCost || createVariableCost.isPending}
              onClick={() => budget?.id && createVariableCost.mutate({
                budgetId: budget.id,
                description: variableCostForm.description.trim(),
                amount: variableAmount,
                category: variableCostForm.category.trim(),
              })}
            >
              {createVariableCost.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Personal Expense Dialog */}
      <Dialog open={showAddPersonalExpense} onOpenChange={setShowAddPersonalExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Despesa Pessoal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descricao *</Label>
              <Input
                value={personalExpenseForm.description}
                onChange={e => setPersonalExpenseForm(form => ({ ...form, description: e.target.value }))}
                placeholder="Ex.: Cartao, celular, mercado"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={personalExpenseForm.amount}
                onChange={e => setPersonalExpenseForm(form => ({ ...form, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Input
                value={personalExpenseForm.category}
                onChange={e => setPersonalExpenseForm(form => ({ ...form, category: e.target.value }))}
                placeholder="Ex.: Pessoal, Moradia, Lazer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPersonalExpense(false)}>Cancelar</Button>
            <Button
              disabled={!canCreatePersonalExpense || createPersonalExpense.isPending}
              onClick={() => budget?.id && createPersonalExpense.mutate({
                budgetId: budget.id,
                description: personalExpenseForm.description.trim(),
                amount: personalAmount,
                category: personalExpenseForm.category.trim(),
              })}
            >
              {createPersonalExpense.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
