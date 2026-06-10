import { useState, useMemo } from "react";
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
  Plus, TrendingUp, TrendingDown, DollarSign, Trash2,
  CheckCircle, Clock, AlertTriangle, Undo2, Target, Wallet, CreditCard,
  ChevronLeft, ChevronRight, BarChart3,
} from "lucide-react";
import PremiumLineChart from "@/components/PremiumLineChart";
import ExpensesPieChart from "@/components/ExpensesPieChart";
import InvestmentsTab from "@/components/InvestmentsTab";
import CreditCardTab from "@/components/CreditCardTab";
import { MonthlyPeriodSelector } from "@/components/MonthlyPeriodSelector";
import BudgetPlanningDashboard from "@/components/BudgetPlanningDashboard";
import { toast } from "sonner";

function formatCurrency(value: string | number | null) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

const statusConfig = {
  paid: { label: "Pago", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  pending: { label: "Pendente", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badgeClass: "bg-amber-100 text-amber-700 border-amber-300" },
  overdue: { label: "Atrasado", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badgeClass: "bg-red-100 text-red-700 border-red-300" },
};

export default function FinancialPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("detailed");

  // Billing forecast query
  const { data: forecast, isLoading: loadingForecast } = trpc.payments.billingForecast.useQuery(
    { year: selectedYear, month: selectedMonth },
    { refetchInterval: 15000 }
  );

  // General financial data
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: revenue } = trpc.dashboard.monthlyRevenue.useQuery();
  const { data: monthlyExp } = trpc.dashboard.monthlyExpenses.useQuery();
  const { data: expensesList } = trpc.expenses.list.useQuery();
  const { data: collabsList } = trpc.collaborators.list.useQuery();

  const utils = trpc.useUtils();

  // Mutations
  const confirmPayment = trpc.payments.confirm.useMutation({
    onSuccess: () => {
      utils.payments.billingForecast.invalidate();
      utils.payments.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      toast.success("Pagamento confirmado!");
    },
    onError: () => toast.error("Erro ao confirmar pagamento"),
  });

  const undoPayment = trpc.payments.undo.useMutation({
    onSuccess: () => {
      utils.payments.billingForecast.invalidate();
      utils.payments.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      toast.success("Pagamento desfeito! Status voltou para pendente.");
    },
    onError: () => toast.error("Erro ao desfazer pagamento"),
  });

  const deletePaymentMut = trpc.payments.delete.useMutation({
    onSuccess: () => {
      utils.payments.billingForecast.invalidate();
      utils.payments.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      toast.success("Pagamento excluído!");
    },
  });

  // Expense form
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({ amount: "", category: "", description: "", date: "", collaboratorId: "" });
  const createExp = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyExpenses.invalidate();
      setExpOpen(false);
      toast.success("Despesa registrada!");
    },
  });
  const deleteExp = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyExpenses.invalidate();
      toast.success("Despesa removida!");
    },
  });

  // Separated payment lists
  const pendingDetails = useMemo(() =>
    forecast?.details?.filter(d => d.status !== "paid") || [], [forecast]);
  const paidDetails = useMemo(() =>
    forecast?.details?.filter(d => d.status === "paid") || [], [forecast]);

  // Combined chart data
  const combinedData = useMemo(() => {
    const map = new Map<string, { month: string; receita: number; despesa: number }>();
    revenue?.forEach(r => {
      const existing = map.get(r.month) || { month: r.month, receita: 0, despesa: 0 };
      existing.receita = r.total;
      map.set(r.month, existing);
    });
    monthlyExp?.forEach(e => {
      const existing = map.get(e.month) || { month: e.month, receita: 0, despesa: 0 };
      existing.despesa = e.total;
      map.set(e.month, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [revenue, monthlyExp]);

  const collabMap = useMemo(() => {
    const m = new Map<number, string>();
    collabsList?.forEach(c => m.set(c.id, c.name));
    return m;
  }, [collabsList]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const navigateMonth = (dir: number) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const profit = (stats?.totalRevenue ?? 0) - (stats?.totalExpenses ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">Controle financeiro completo com previsibilidade de receita</p>
      </div>

      {/* Monthly Period Selector */}
      <MonthlyPeriodSelector
        currentYear={selectedYear}
        currentMonth={selectedMonth}
        onPeriodChange={(year, month) => {
          setSelectedYear(year);
          setSelectedMonth(month);
        }}
      />


















      {/* Billing KPIs - Previsto / Real / Pendente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento Previsto</p>
              <p className="text-xl font-bold text-foreground">
                {loadingForecast ? "..." : formatCurrency(forecast?.predicted ?? 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Soma dos valores dos clientes ativos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento Real</p>
              <p className="text-xl font-bold text-emerald-600">
                {loadingForecast ? "..." : formatCurrency(forecast?.received ?? 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pagamentos marcados como pago</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-100 bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pendente</p>
              <p className="text-xl font-bold text-amber-600">
                {loadingForecast ? "..." : formatCurrency(forecast?.pending ?? 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Previsto - Real</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {forecast && forecast.predicted > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Progresso de Recebimento</span>
              <span className="text-xs font-bold text-foreground">
                {Math.round((forecast.received / forecast.predicted) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((forecast.received / forecast.predicted) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">Recebido: {formatCurrency(forecast.received)}</span>
              <span className="text-[10px] text-muted-foreground">Meta: {formatCurrency(forecast.predicted)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="planning">Planejamento Financeiro</TabsTrigger>
          <TabsTrigger value="detailed">Financeiro Detalhado</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="expenseAnalysis">Análise de Despesas</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="creditCard">Cartão de Crédito</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        {/* PLANEJAMENTO FINANCEIRO */}
        <TabsContent value="planning">
          <BudgetPlanningDashboard year={selectedYear} month={selectedMonth} />
        </TabsContent>

        {/* FINANCEIRO DETALHADO */}
        <TabsContent value="detailed">
          <div className="space-y-6">
            {/* Pending Payments */}
            <Card className="shadow-sm border-amber-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-sm font-semibold text-amber-700">
                    Pagamentos Pendentes ({pendingDetails.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {pendingDetails.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Todos os pagamentos do mês estão em dia!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingDetails.map(d => {
                      const st = statusConfig[d.status as keyof typeof statusConfig] || statusConfig.pending;
                      const StIcon = st.icon;
                      return (
                        <div key={d.clientId} className={`flex items-center justify-between p-3.5 rounded-lg ${st.bg} ${st.border} border transition-all hover:shadow-sm`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <StIcon className={`h-5 w-5 ${st.color} shrink-0`} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{d.companyName}</p>
                              <p className="text-xs text-muted-foreground">
                                Valor mensal: {formatCurrency(d.monthlyValue)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right mr-2">
                              <p className="text-sm font-bold">{formatCurrency(d.pending)}</p>
                              <Badge variant="outline" className={`text-[10px] ${st.badgeClass}`}>
                                {st.label}
                              </Badge>
                            </div>
                            {/* Confirm payment for each pending payment */}
                            {d.payments?.filter((p: any) => p.status !== "paid").map((p: any) => (
                              <Button
                                key={p.id}
                                variant="outline"
                                size="sm"
                                className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => confirmPayment.mutate({ id: p.id })}
                                disabled={confirmPayment.isPending}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Confirmar
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Received Payments */}
            <Card className="shadow-sm border-emerald-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold text-emerald-700">
                    Pagamentos Recebidos ({paidDetails.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {paidDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento recebido neste mês</p>
                ) : (
                  <div className="space-y-2">
                    {paidDetails.map(d => (
                      <div key={d.clientId} className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 transition-all hover:shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.companyName}</p>
                            <p className="text-xs text-muted-foreground">
                              Valor mensal: {formatCurrency(d.monthlyValue)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right mr-2">
                            <p className="text-sm font-bold text-emerald-600">{formatCurrency(d.received)}</p>
                            <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">
                              Pago
                            </Badge>
                          </div>
                          {/* Undo payment for each paid payment */}
                          {d.payments?.filter((p: any) => p.status === "paid").map((p: any) => (
                            <Button
                              key={p.id}
                              variant="outline"
                              size="sm"
                              className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => undoPayment.mutate({ id: p.id })}
                              disabled={undoPayment.isPending}
                            >
                              <Undo2 className="h-3.5 w-3.5 mr-1" />
                              Desfazer
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DESPESAS */}
        <TabsContent value="expenses">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Registro de Despesas</CardTitle>
              <Button size="sm" onClick={() => { setExpForm({ amount: "", category: "", description: "", date: "", collaboratorId: "" }); setExpOpen(true); }}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova Despesa
              </Button>
            </CardHeader>
            <CardContent>
              {/* Expense KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">Despesas Totais</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats?.totalExpenses ?? 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">Receita Total</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                  <p className={`text-lg font-bold ${profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCurrency(profit)}</p>
                </div>
              </div>

              {!expensesList || expensesList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada</p>
              ) : (
                <div className="space-y-2">
                  {expensesList.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{formatCurrency(e.amount)}</p>
                          <Badge variant="outline" className="text-xs">{e.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(() => { const d = new Date(e.date); return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`; })()}
                          {e.collaboratorId && collabMap.has(e.collaboratorId) ? ` - ${collabMap.get(e.collaboratorId)}` : ""}
                          {e.description ? ` - ${e.description}` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExp.mutate({ id: e.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANÁLISE DE DESPESAS COM GRÁFICO DE PIZZA */}
        <TabsContent value="expenseAnalysis">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                Distribuição de Despesas por Categoria
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-2">Visualize onde estão sendo alocados os recursos da empresa</p>
            </CardHeader>
            <CardContent>
              {!expensesList || expensesList.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-10 w-10 opacity-20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma despesa registrada para análise</p>
                </div>
              ) : (
                <ExpensesPieChart expenses={expensesList} height={420} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GRÁFICOS PREMIUM */}
        <TabsContent value="charts">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Receita vs Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PremiumLineChart
                data={combinedData}
                lines={[
                  { dataKey: "receita", name: "Receita", color: "#ea580c", strokeWidth: 3.5 },
                  { dataKey: "despesa", name: "Despesa", color: "#06b6d4", strokeWidth: 3 },
                ]}
                xDataKey="month"
                height={360}
                showDots={true}
                showValues={true}
                showStripes={true}
                emptyMessage="Dados insuficientes para gerar gráficos"
                emptyIcon={<BarChart3 className="h-10 w-10 opacity-20" />}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVESTIMENTOS */}
        <TabsContent value="investments">
          <InvestmentsTab />
        </TabsContent>

        {/* CARTÃO DE CRÉDITO */}
        <TabsContent value="creditCard">
          <CreditCardTab />
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={expForm.category} onValueChange={v => setExpForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Colaborador">Colaborador</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colaborador (opcional)</Label>
              <Select value={expForm.collaboratorId} onValueChange={v => setExpForm(f => ({ ...f, collaboratorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  {collabsList?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              createExp.mutate({
                amount: expForm.amount,
                category: expForm.category,
                description: expForm.description || undefined,
                date: new Date(expForm.date).getTime(),
                collaboratorId: expForm.collaboratorId ? parseInt(expForm.collaboratorId) : undefined,
              });
            }} disabled={!expForm.amount || !expForm.category || !expForm.date || createExp.isPending}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              {createExp.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
