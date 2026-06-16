import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users, DollarSign, ListTodo, TrendingUp, BarChart3,
  CalendarCheck, CheckCircle2, Clock, AlertCircle, Target, Wallet, CreditCard,
  Download, FileSpreadsheet, FileText, Eye, EyeOff,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import PremiumLineChart from "@/components/PremiumLineChart";
import { TodayCommandCenter } from "@/components/TodayCommandCenter";
import { ExecutiveDashboardPanel } from "@/components/ExecutiveDashboardPanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useFinancialPrivacy } from "@/lib/financialPrivacy";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateUTC(timestamp: number) {
  const d = new Date(timestamp);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]} ${y?.slice(2)}`;
}

const COLORS = ["oklch(0.72 0.17 50)", "oklch(0.65 0.19 45)", "oklch(0.55 0.16 40)"];

const CHART_LINES = [
  { dataKey: "revenue", name: "Receita", color: "#ea580c", strokeWidth: 3.5 },
  { dataKey: "expense", name: "Despesa", color: "#06b6d4", strokeWidth: 3 },
  { dataKey: "profit", name: "Lucro", color: "#3b82f6", strokeWidth: 3, dashed: false },
];



export default function Home() {
  const { hideFinancialValues, toggleFinancialValues, financialValue } = useFinancialPrivacy();
  const { data: stats, isLoading: loadingStats } = trpc.dashboard.stats.useQuery();
  const { data: services } = trpc.dashboard.topServices.useQuery();
  const { data: alerts } = trpc.dashboard.paymentAlerts.useQuery();
  const { data: weekly } = trpc.dashboard.weeklySummary.useQuery();
  const { data: chartData, isLoading: loadingChart } = trpc.dashboard.revenueVsExpenses.useQuery();
  const { data: exportData } = trpc.dashboard.exportData.useQuery();

  const now = new Date();
  const { data: forecast } = trpc.payments.billingForecast.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 30000 }
  );

  const profit = (stats?.totalRevenue ?? 0) - (stats?.totalExpenses ?? 0);

  // Export functions
  function exportCSV() {
    if (!exportData) return;
    const rows = [["Tipo", "Nome", "Valor", "Status", "Data"]];
    exportData.payments.forEach(p => {
      rows.push(["Pagamento", p.description || `Pagamento #${p.id}`, p.amount, p.status, formatDateUTC(p.dueDate)]);
    });
    exportData.expenses.forEach(e => {
      rows.push(["Despesa", e.category, e.amount, "-", formatDateUTC(e.date)]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seven-marketing-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }

  function exportExcel() {
    if (!exportData) return;
    // Generate a simple HTML table that Excel can open
    let html = `<html><head><meta charset="utf-8"></head><body>`;
    html += `<h2>Relatório Financeiro - Seven Marketing</h2>`;
    html += `<p>Gerado em: ${new Date().toLocaleDateString("pt-BR")}</p>`;

    // Clients
    html += `<h3>Clientes</h3><table border="1"><tr><th>Empresa</th><th>Contato</th><th>Valor Mensal</th><th>Status</th></tr>`;
    exportData.clients.forEach(c => {
      html += `<tr><td>${c.companyName}</td><td>${c.contactName}</td><td>R$ ${c.monthlyValue}</td><td>${c.status}</td></tr>`;
    });
    html += `</table>`;

    // Payments
    html += `<h3>Pagamentos</h3><table border="1"><tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr>`;
    exportData.payments.forEach(p => {
      html += `<tr><td>${p.description || "-"}</td><td>R$ ${p.amount}</td><td>${formatDateUTC(p.dueDate)}</td><td>${p.status}</td></tr>`;
    });
    html += `</table>`;

    // Expenses
    html += `<h3>Despesas</h3><table border="1"><tr><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Data</th></tr>`;
    exportData.expenses.forEach(e => {
      html += `<tr><td>${e.category}</td><td>${e.description || "-"}</td><td>R$ ${e.amount}</td><td>${formatDateUTC(e.date)}</td></tr>`;
    });
    html += `</table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seven-marketing-financeiro-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exportado com sucesso!");
  }

  function exportPDF() {
    if (!exportData) return;
    const totalReceita = exportData.payments.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalDespesas = exportData.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const lucro = totalReceita - totalDespesas;

    let html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; }
        h2 { color: #333; margin-top: 24px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-card { padding: 16px; border: 1px solid #ddd; border-radius: 8px; flex: 1; text-align: center; }
        .summary-card .value { font-size: 24px; font-weight: bold; }
        .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; }
      </style></head><body>
      <h1>Relatório Financeiro - Seven Marketing</h1>
      <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")}</p>
      <div class="summary">
        <div class="summary-card"><div class="blue value">${formatCurrency(totalReceita)}</div><div>Receita Total</div></div>
        <div class="summary-card"><div class="red value">${formatCurrency(totalDespesas)}</div><div>Despesas Totais</div></div>
        <div class="summary-card"><div class="green value">${formatCurrency(lucro)}</div><div>Lucro Líquido</div></div>
      </div>
      <h2>Clientes (${exportData.clients.length})</h2>
      <table><tr><th>Empresa</th><th>Contato</th><th>Valor Mensal</th><th>Status</th></tr>`;
    exportData.clients.forEach(c => {
      html += `<tr><td>${c.companyName}</td><td>${c.contactName}</td><td>R$ ${c.monthlyValue}</td><td>${c.status}</td></tr>`;
    });
    html += `</table><div class="footer">Seven Marketing Manager &copy; ${new Date().getFullYear()}</div></body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
    toast.success("PDF aberto para impressão!");
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Operação em tempo real
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 max-w-[19rem] text-sm text-muted-foreground sm:max-w-2xl">Visão executiva da Seven Marketing com receita, entregas e alertas.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFinancialValues}
            aria-label={hideFinancialValues ? "Mostrar valores financeiros" : "Ocultar valores financeiros"}
            title={hideFinancialValues ? "Mostrar valores financeiros" : "Ocultar valores financeiros"}
          >
            {hideFinancialValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Exportar Dados
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Exportar Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF} className="gap-2">
                <FileText className="h-4 w-4" /> Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TodayCommandCenter />

      <ExecutiveDashboardPanel />

      {/* KPI Cards */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Clientes Ativos" value={loadingStats ? "..." : String(stats?.activeClients ?? 0)} icon={Users} accent="bg-cyan-50 text-cyan-700 border-cyan-100" />
        <KPICard title="Tarefas Pendentes" value={loadingStats ? "..." : String(stats?.pendingTasks ?? 0)} icon={ListTodo} accent="bg-blue-50 text-blue-700 border-blue-100" />
        <KPICard title="Receita Total" value={loadingStats ? "..." : financialValue(formatCurrency(stats?.totalRevenue ?? 0))} icon={DollarSign} accent="bg-emerald-50 text-emerald-700 border-emerald-100" />
        <KPICard title="Lucro Líquido" value={loadingStats ? "..." : financialValue(formatCurrency(profit))} icon={TrendingUp} accent="bg-violet-50 text-violet-700 border-violet-100" />
      </div>

      {/* Billing Forecast */}
      {forecast && (
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-blue-100 bg-blue-50/35">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md border border-blue-100 bg-white flex items-center justify-center shadow-sm">
                <Target className="h-4.5 w-4.5 text-blue-700" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Previsto do Mês</p>
                <p className="text-lg font-bold text-foreground">{financialValue(formatCurrency(forecast.predicted))}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-emerald-50/35">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md border border-emerald-100 bg-white flex items-center justify-center shadow-sm">
                <Wallet className="h-4.5 w-4.5 text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Recebido do Mês</p>
                <p className="text-lg font-bold text-emerald-600">{financialValue(formatCurrency(forecast.received))}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100 bg-amber-50/35">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md border border-amber-100 bg-white flex items-center justify-center shadow-sm">
                <CreditCard className="h-4.5 w-4.5 text-amber-700" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pendente do Mês</p>
                <p className="text-lg font-bold text-amber-600">{financialValue(formatCurrency(forecast.pending))}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress bar */}
      {forecast && forecast.predicted > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Progresso de Recebimento Mensal</span>
              <span className="text-xs font-bold text-foreground">
                {Math.round((forecast.received / forecast.predicted) * 100)}%
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((forecast.received / forecast.predicted) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Alerts - ONLY real data with client names */}
      {alerts && (alerts.overdue.length > 0 || alerts.dueSoon.length > 0) && (
        <div className="space-y-3">
          {alerts.overdue.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 shadow-sm">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Pagamentos Atrasados ({alerts.overdue.length})</span>
                </div>
                <div className="space-y-2">
                  {alerts.overdue.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          {p.logoUrl && <AvatarImage src={p.logoUrl} />}
                          <AvatarFallback className="text-[10px] bg-red-100 text-red-700">
                            {getInitials(p.companyName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-red-700 font-medium">{p.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-800">{financialValue(formatCurrency(parseFloat(p.amount)))}</span>
                        <Badge variant="destructive" className="text-[10px] px-1.5">
                          Vencido {formatDateUTC(p.dueDate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {alerts.dueSoon.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Vencendo em Breve ({alerts.dueSoon.length})</span>
                </div>
                <div className="space-y-2">
                  {alerts.dueSoon.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          {p.logoUrl && <AvatarImage src={p.logoUrl} />}
                          <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                            {getInitials(p.companyName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-amber-700 font-medium">{p.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-800">{financialValue(formatCurrency(parseFloat(p.amount)))}</span>
                        <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-300">
                          Vence {formatDateUTC(p.dueDate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No alerts message */}
      {alerts && alerts.overdue.length === 0 && alerts.dueSoon.length === 0 && (
        <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-emerald-700 font-medium">Nenhum vencimento próximo encontrado</span>
          </CardContent>
        </Card>
      )}

      {/* Weekly Summary */}
      {weekly && (
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Resumo Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/80">
                <p className="text-2xl font-bold text-foreground">{weekly.clientsServed}</p>
                <p className="text-xs text-muted-foreground mt-1">Clientes Atendidos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/80">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-2xl font-bold text-foreground">{weekly.tasksCompleted}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tarefas Concluídas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/80">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <p className="text-2xl font-bold text-foreground">{weekly.tasksPending}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tarefas Pendentes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/80">
                <p className="text-2xl font-bold text-emerald-600">{financialValue(formatCurrency(weekly.weeklyRevenue))}</p>
                <p className="text-xs text-muted-foreground mt-1">Receita da Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Line Chart - Revenue vs Expenses vs Profit */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Desempenho Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingChart ? (
            <div className="h-[340px] flex items-center justify-center text-muted-foreground text-sm">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <BarChart3 className="h-8 w-8 opacity-30" />
                <span>Carregando gráfico...</span>
              </div>
            </div>
          ) : (
            <PremiumLineChart
              data={chartData || []}
              lines={CHART_LINES}
              xDataKey="month"
              xFormatter={formatMonthLabel}
              height={340}
              showDots={true}
              showValues={false}
              showStripes={true}
              emptyMessage="Nenhum dado financeiro ainda"
              emptyIcon={<BarChart3 className="h-10 w-10 opacity-20" />}
            />
          )}
        </CardContent>
      </Card>

      {/* Services chart */}
      {services && services.some(s => s.count > 0) && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Serviços Mais Contratados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={services} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {services.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {services.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-foreground font-medium">{s.name}</span>
                    <span className="text-muted-foreground">({s.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: any; accent: string }) {
  return (
    <Card className="group w-full overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="mt-1 break-words text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`hidden h-11 w-11 shrink-0 rounded-md border ${accent} items-center justify-center transition-transform group-hover:-translate-y-0.5 sm:flex`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
