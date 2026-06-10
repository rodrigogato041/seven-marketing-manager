import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users, DollarSign, ListTodo, TrendingUp, BarChart3,
  CalendarCheck, CheckCircle2, Clock, AlertCircle, Target, Wallet, CreditCard,
  Download, FileSpreadsheet, FileText,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import PremiumLineChart from "@/components/PremiumLineChart";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral da Seven Marketing</p>
        </div>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Clientes Ativos" value={loadingStats ? "..." : String(stats?.activeClients ?? 0)} icon={Users} accent="from-orange-500 to-amber-500" />
        <KPICard title="Tarefas Pendentes" value={loadingStats ? "..." : String(stats?.pendingTasks ?? 0)} icon={ListTodo} accent="from-blue-500 to-indigo-500" />
        <KPICard title="Receita Total" value={loadingStats ? "..." : formatCurrency(stats?.totalRevenue ?? 0)} icon={DollarSign} accent="from-emerald-500 to-green-500" />
        <KPICard title="Lucro Líquido" value={loadingStats ? "..." : formatCurrency(profit)} icon={TrendingUp} accent="from-violet-500 to-purple-500" />
      </div>

      {/* Billing Forecast */}
      {forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50/40 to-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                <Target className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Previsto do Mês</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(forecast.predicted)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                <Wallet className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Recebido do Mês</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(forecast.received)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                <CreditCard className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pendente do Mês</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(forecast.pending)}</p>
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
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
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
                        <span className="font-semibold text-red-800">{formatCurrency(parseFloat(p.amount))}</span>
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
                        <span className="font-semibold text-amber-800">{formatCurrency(parseFloat(p.amount))}</span>
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
        <Card className="shadow-sm border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
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
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(weekly.weeklyRevenue)}</p>
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
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
          </div>
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
