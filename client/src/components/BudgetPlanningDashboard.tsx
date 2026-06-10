import { useState, useMemo, useEffect } from "react";
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
  Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, Target, Zap,
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

interface BudgetPlanningDashboardProps {
  year: number;
  month: number;
}

export default function BudgetPlanningDashboard({ year, month }: BudgetPlanningDashboardProps) {
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
    { enabled: !!budget?.id }
  );
  const metrics = metricsData ? { ...metricsData, budgetStatus: "positive" } : null;
  const utils = trpc.useUtils();

  // Dynamic forecasted revenue from billing forecast
  const dynamicForecastedRevenue = billingForecast?.predicted || 0;

  // Mutations
  const updateBudget = trpc.budgetPlanning.updateBudget.useMutation({
    onSuccess: () => toast.success("Faturamento atualizado!"),
  });
  const calculateMetrics = trpc.budgetPlanning.calculateMetrics.useMutation({
    onSuccess: () => toast.success("Métricas recalculadas!"),
  });
  const deleteFixedCost = trpc.budgetPlanning.deleteFixedCost.useMutation({
    onSuccess: () => toast.success("Custo fixo removido!"),
  });
  const deleteVariableCost = trpc.budgetPlanning.deleteVariableCost.useMutation({
    onSuccess: () => toast.success("Custo variável removido!"),
  });
  const deletePersonalExpense = trpc.budgetPlanning.deletePersonalExpense.useMutation({
    onSuccess: () => toast.success("Despesa pessoal removida!"),
  });
  const refreshPlanning = async () => {
    if (!budget?.id) return;
    await Promise.all([
      utils.budgetPlanning.getFixedCosts.invalidate({ budgetId: budget.id }),
      utils.budgetPlanning.getVariableCosts.invalidate({ budgetId: budget.id }),
      utils.budgetPlanning.getPersonalExpenses.invalidate({ budgetId: budget.id }),
      utils.budgetPlanning.getMetrics.invalidate({ budgetId: budget.id }),
      utils.budgetAlerts.checkBudgetAlerts.invalidate({ year, month }),
    ]);
    calculateMetrics.mutate({ budgetId: budget.id });
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
  const totalFixedCosts = useMemo(() => fixedCosts.reduce((sum: number, c: any) => sum + (c.amount || 0), 0), [fixedCosts]);
  const totalVariableCosts = useMemo(() => variableCosts.reduce((sum: number, c: any) => sum + (c.amount || 0), 0), [variableCosts]);
  const totalPersonalExpenses = useMemo(() => personalExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0), [personalExpenses]);

  // Auto-update budget when billing forecast changes
  const { mutate: autoUpdateRevenue } = trpc.budgetPlanning.updateBudget.useMutation({
    onSuccess: () => {
      if (budget?.id) {
        calculateMetrics.mutate({ budgetId: budget.id });
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
              <div>Clientes ativos: <strong>{formatCurrency(billingForecast.predicted)}</strong></div>
              <div>Recebido: <strong>{formatCurrency(billingForecast.received)}</strong></div>
              <div>Pendente: <strong>{formatCurrency(billingForecast.pending)}</strong></div>
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
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <StatusIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Resultado Previsto</p>
              <p className={`text-2xl font-bold ${metrics?.netProfitForecast ?? 0 >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {metrics ? formatCurrency(metrics.netProfitForecast) : "-"}
              </p>
              <Badge className="mt-2" variant={budgetStatus === "positive" ? "default" : "destructive"}>
                {budgetStatus === "positive" ? "✓ Lucro" : budgetStatus === "warning" ? "⚠ Atenção" : "✗ Prejuízo"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Safety Margin */}
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Meta de Segurança</p>
              <p className="text-2xl font-bold text-green-600">
                {metrics ? formatCurrency(metrics.safetyMargin) : "-"}
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
              <p className="text-2xl font-bold mt-1">{metrics ? formatCurrency(metrics.breakEvenPoint) : "-"}</p>
              <p className="text-xs text-muted-foreground mt-1">Faturamento mínimo necessário para cobrir todas as despesas</p>
            </div>
            <Zap className="h-8 w-8 text-amber-500" />
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Custos Fixos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalFixedCosts)}</p>
            <p className="text-xs text-muted-foreground mt-1">{fixedCosts.length} itens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Custos Variáveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalVariableCosts)}</p>
            <p className="text-xs text-muted-foreground mt-1">{variableCosts.length} itens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Despesas Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPersonalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">{personalExpenses.length} itens</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <Tabs defaultValue="fixed" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fixed">Custos Fixos</TabsTrigger>
          <TabsTrigger value="variable">Custos Variáveis</TabsTrigger>
          <TabsTrigger value="personal">Despesas Pessoais</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="scenarios">Cenários</TabsTrigger>
        </TabsList>

        {/* Fixed Costs Tab */}
        <TabsContent value="fixed" className="space-y-4">
          <Button onClick={() => setShowAddFixedCost(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Custo Fixo
          </Button>
          <div className="space-y-2">
            {fixedCosts.map(cost => (
              <Card key={cost.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{cost.description}</p>
                  <p className="text-sm text-muted-foreground">{cost.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold">{formatCurrency(cost.amount)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFixedCost.mutate({ id: cost.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Variable Costs Tab */}
        <TabsContent value="variable" className="space-y-4">
          <Button onClick={() => setShowAddVariableCost(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Custo Variável
          </Button>
          <div className="space-y-2">
            {variableCosts.map(cost => (
              <Card key={cost.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{cost.description}</p>
                  <p className="text-sm text-muted-foreground">{cost.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold">{formatCurrency(cost.amount)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteVariableCost.mutate({ id: cost.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Personal Expenses Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Button onClick={() => setShowAddPersonalExpense(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Despesa Pessoal
          </Button>
          <div className="space-y-2">
            {personalExpenses.map(expense => (
              <Card key={expense.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-muted-foreground">{expense.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold">{formatCurrency(expense.amount)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePersonalExpense.mutate({ id: expense.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Projected Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          {metrics && (
            <ProjectedCashFlow
              forecastedRevenue={metrics.forecastedRevenue}
              totalExpenses={metrics.totalExpenses}
              daysInMonth={new Date(year, month, 0).getDate()}
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
