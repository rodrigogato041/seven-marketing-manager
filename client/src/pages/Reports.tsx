import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useFinancialPrivacy } from "@/lib/financialPrivacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  LineChart,
  Printer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type ReportKey =
  | "financial"
  | "expenses"
  | "revenue"
  | "pending"
  | "clients"
  | "delinquent"
  | "production"
  | "tasks"
  | "clientMonthly"
  | "cashflow";

const reportOptions: Array<{ key: ReportKey; label: string; description: string }> = [
  { key: "financial", label: "Relatorio financeiro mensal", description: "DRE, fluxo de caixa e alertas do periodo." },
  { key: "expenses", label: "Despesas por categoria", description: "Categorias, totais, volume e participacao." },
  { key: "revenue", label: "Receitas por cliente", description: "Previsto, recebido e pendente por cliente." },
  { key: "pending", label: "Pagamentos pendentes", description: "Recebimentos em aberto e vencidos." },
  { key: "clients", label: "Clientes ativos", description: "Carteira ativa, servicos e valor mensal." },
  { key: "delinquent", label: "Clientes inadimplentes", description: "Clientes com pagamento vencido." },
  { key: "production", label: "Producao mensal por cliente", description: "Contratado, entregue, pendente e percentual." },
  { key: "tasks", label: "Tarefas por colaborador", description: "Total, concluidas, abertas e atrasadas." },
  { key: "clientMonthly", label: "Relatorio mensal do cliente", description: "Resumo operacional e financeiro por cliente." },
  { key: "cashflow", label: "Fluxo de caixa projetado", description: "Janelas de 7, 15 e 30 dias." },
];

function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric || 0);
}

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function formatDate(value?: number | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows: Array<Record<string, any>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const normalize = (value: any) => String(value ?? "").replace(/;/g, ",").replace(/\n/g, " ");
  return [headers.join(";"), ...rows.map(row => headers.map(header => normalize(row[header])).join(";"))].join("\n");
}

function rowsToHtml(title: string, rows: Array<Record<string, any>>) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:32px;color:#111827}
    h1{font-size:22px;margin-bottom:4px}p{color:#6b7280}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th,td{border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:12px}
    th{background:#f8fafc}
  </style></head><body><h1>${title}</h1><p>Exportado pelo Seven Marketing Manager</p><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${row[header] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-white text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DataTable({ rows }: { rows: Array<Record<string, any>> }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Nenhum dado encontrado para este relatorio.
      </div>
    );
  }
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map(header => (
              <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {rows.slice(0, 80).map((row, index) => (
            <tr key={index} className="hover:bg-muted/25">
              {headers.map(header => (
                <td key={header} className="px-3 py-2 text-foreground">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(monthValue());
  const [selectedReport, setSelectedReport] = useState<ReportKey>("financial");
  const { year, month } = parseMonth(selectedMonth);
  const { financialValue } = useFinancialPrivacy();
  const { data, isLoading } = trpc.reports.center.useQuery(
    { year, month },
    { refetchInterval: 60000 }
  );

  const selectedOption = reportOptions.find(item => item.key === selectedReport)!;

  const rows = useMemo(() => {
    if (!data) return [];
    const reports = data.reports;
    if (selectedReport === "financial") {
      const dre = reports.financialMonthly.dre;
      return [
        { Indicador: "Receita prevista", Valor: financialValue(formatCurrency(dre.grossRevenue)) },
        { Indicador: "Receita recebida", Valor: financialValue(formatCurrency(dre.receivedRevenue)) },
        { Indicador: "Receita pendente", Valor: financialValue(formatCurrency(dre.pendingRevenue)) },
        { Indicador: "Custos fixos", Valor: financialValue(formatCurrency(dre.fixedCosts)) },
        { Indicador: "Custos variaveis", Valor: financialValue(formatCurrency(dre.variableCosts)) },
        { Indicador: "Despesas pessoais", Valor: financialValue(formatCurrency(dre.personalExpenses)) },
        { Indicador: "Lucro liquido", Valor: financialValue(formatCurrency(dre.netProfit)) },
        { Indicador: "Margem liquida", Valor: `${dre.netMargin}%` },
      ];
    }
    if (selectedReport === "expenses") {
      return reports.expensesByCategory.map((item: any) => ({
        Categoria: item.category,
        Total: financialValue(formatCurrency(item.total)),
        Participacao: `${item.percentage}%`,
        Lancamentos: item.count,
      }));
    }
    if (selectedReport === "revenue") {
      return reports.revenueByClient.map((item: any) => ({
        Cliente: item.companyName,
        Previsto: financialValue(formatCurrency(item.predicted)),
        Recebido: financialValue(formatCurrency(item.received)),
        Pendente: financialValue(formatCurrency(item.pending)),
      }));
    }
    if (selectedReport === "pending") {
      return reports.pendingPayments.map((item: any) => ({
        Cliente: item.companyName,
        Descricao: item.description || "-",
        Valor: financialValue(formatCurrency(item.amount)),
        Vencimento: formatDate(item.dueDate),
        Status: item.status === "overdue" ? "Vencido" : "Pendente",
      }));
    }
    if (selectedReport === "clients") {
      return reports.activeClients.map((item: any) => ({
        Cliente: item.companyName,
        Contato: item.contactName,
        Valor: financialValue(formatCurrency(item.monthlyValue)),
        Servicos: item.services.join(", ") || "-",
      }));
    }
    if (selectedReport === "delinquent") {
      return reports.delinquentClients.map((item: any) => ({
        Cliente: item.companyName,
        Previsto: financialValue(formatCurrency(item.predicted)),
        Recebido: financialValue(formatCurrency(item.received)),
        Vencido: financialValue(formatCurrency(item.overdueAmount)),
      }));
    }
    if (selectedReport === "production") {
      return reports.productionByClient.map((item: any) => ({
        Cliente: item.companyName,
        Contratado: item.contracted,
        Entregue: item.delivered,
        Pendente: item.pending,
        Conclusao: `${item.completionRate}%`,
      }));
    }
    if (selectedReport === "tasks") {
      return reports.tasksByCollaborator.map((item: any) => ({
        Colaborador: item.name,
        Total: item.total,
        Concluidas: item.completed,
        Abertas: item.open,
        Atrasadas: item.overdue,
      }));
    }
    if (selectedReport === "clientMonthly") {
      return reports.clientMonthlyReports.map((item: any) => ({
        Cliente: item.companyName,
        Valor: financialValue(formatCurrency(item.monthlyValue)),
        Servicos: item.services.join(", ") || "-",
        Producao: `${item.production?.delivered ?? 0}/${item.production?.contracted ?? 0}`,
        Recebido: financialValue(formatCurrency(item.revenue?.received ?? 0)),
        Tarefas: `${item.tasks.completed} concluidas / ${item.tasks.open} abertas`,
      }));
    }
    return reports.projectedCashflow.map((item: any) => ({
      Janela: item.label,
      Receber: financialValue(formatCurrency(item.totalReceivable)),
      Pagar: financialValue(formatCurrency(item.totalPayable)),
      Saldo: financialValue(formatCurrency(item.projectedBalance)),
      Risco: item.risk === "negative" ? "Negativo" : item.risk === "attention" ? "Atencao" : "Saudavel",
    }));
  }, [data, financialValue, selectedReport]);

  function exportCsv() {
    downloadFile(`seven-${selectedReport}-${selectedMonth}.csv`, "\uFEFF" + rowsToCsv(rows), "text/csv;charset=utf-8");
  }

  function exportExcel() {
    downloadFile(`seven-${selectedReport}-${selectedMonth}.xls`, rowsToHtml(selectedOption.label, rows), "application/vnd.ms-excel;charset=utf-8");
  }

  function exportPdf() {
    downloadFile(`seven-${selectedReport}-${selectedMonth}.html`, rowsToHtml(selectedOption.label, rows), "text/html;charset=utf-8");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Inteligencia gerencial
          </div>
          <h1 className="text-2xl font-semibold">Relatorios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Exportacoes, comparativos e indicadores consolidados para decisao.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-40" type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} />
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportExcel} disabled={!rows.length}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportPdf} disabled={!rows.length}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Receita recebida" value={financialValue(formatCurrency(data.summary.receivedRevenue))} icon={Wallet} />
            <Metric label="Lucro liquido" value={financialValue(formatCurrency(data.summary.netProfit))} icon={TrendingUp} />
            <Metric label="Clientes ativos" value={String(data.summary.activeClients)} icon={Users} />
            <Metric label="Pendencias" value={String(Number(data.summary.pendingPayments) + Number(data.summary.tasksOpen))} icon={BarChart3} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LineChart className="h-4 w-4 text-primary" />
                  Comparativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  data.comparisons.currentVsPreviousMonth,
                  data.comparisons.currentVsPreviousQuarter,
                  data.comparisons.currentVsPreviousYear,
                ].map((item: any) => (
                  <div key={item.label} className="rounded-lg border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <Badge className={item.trend === "up" ? "bg-emerald-50 text-emerald-700" : item.trend === "down" ? "bg-rose-50 text-rose-700" : "bg-muted text-muted-foreground"}>
                        {item.changePercent}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Atual {financialValue(formatCurrency(item.current))} / Anterior {financialValue(formatCurrency(item.previous))}
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-semibold">{data.comparisons.predictedVsReceived.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Recebido {data.comparisons.predictedVsReceived.completionPercent}% do previsto.</p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-semibold">{data.comparisons.plannedVsActualExpenses.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Uso do planejado: {data.comparisons.plannedVsActualExpenses.usagePercent}%.</p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-semibold">{data.comparisons.contractedVsDeliveredProduction.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Entrega: {data.comparisons.contractedVsDeliveredProduction.completionPercent}%.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-primary" />
                    Biblioteca de relatorios
                  </span>
                  <Badge variant="secondary">{reportOptions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportOptions.map(option => (
                    <button
                      key={option.key}
                      onClick={() => setSelectedReport(option.key)}
                      className={`rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 ${selectedReport === option.key ? "border-primary/40 bg-primary/5" : "bg-white"}`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">{selectedOption.label}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedOption.description}</p>
                </div>
                <Badge variant="secondary">{rows.length} linha(s)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable rows={rows} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
