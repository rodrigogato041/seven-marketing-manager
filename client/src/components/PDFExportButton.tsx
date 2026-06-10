import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PDFExportButtonProps {
  year: number;
  month: number;
  reportType: "budget" | "expenses";
}

export default function PDFExportButton({ year, month, reportType }: PDFExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const budgetReportQuery = trpc.pdfExport.getBudgetPlanningReportData.useQuery(
    { year, month },
    { enabled: false }
  );

  const expenseReportQuery = trpc.pdfExport.getExpenseAnalysisReportData.useQuery(
    { year, month },
    { enabled: false }
  );

  const handleExport = async () => {
    try {
      setIsLoading(true);

      let reportData;
      if (reportType === "budget") {
        const result = await budgetReportQuery.refetch();
        reportData = result.data;
      } else {
        const result = await expenseReportQuery.refetch();
        reportData = result.data;
      }

      if (!reportData) {
        toast.error("Erro ao gerar relatório");
        return;
      }

      // Generate PDF content
      const htmlContent = generatePDFHTML(reportData, reportType);

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      // Use manus-md-to-pdf or similar approach
      // For now, we'll trigger a download of the HTML
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-${reportType}-${year}-${String(month).padStart(2, "0")}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}

function generatePDFHTML(data: any, reportType: string): string {
  const monthName = new Date(data.period.year, data.period.month - 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  if (reportType === "budget") {
    return generateBudgetPDF(data, monthName);
  } else {
    return generateExpensePDF(data, monthName);
  }
}

function generateBudgetPDF(data: any, monthName: string): string {
  const metrics = data.metrics || {};
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Planejamento Financeiro - ${monthName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #f97316; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
        h2 { color: #1f2937; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f3f4f6; font-weight: bold; }
        tr:hover { background-color: #f9fafb; }
        .metric { display: inline-block; margin: 20px 30px 20px 0; }
        .metric-label { color: #6b7280; font-size: 12px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        .summary { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>Relatório de Planejamento Financeiro - CFO Pessoal</h1>
      <p><strong>Período:</strong> ${monthName}</p>
      <p><strong>Data de Geração:</strong> ${new Date().toLocaleString("pt-BR")}</p>

      <div class="summary">
        <h2>Resumo Executivo</h2>
        <div class="metric">
          <div class="metric-label">Faturamento Previsto</div>
          <div class="metric-value">${formatCurrency(metrics.forecastedRevenue || 0)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total de Despesas</div>
          <div class="metric-value">${formatCurrency(metrics.totalExpenses || 0)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Lucro Previsto</div>
          <div class="metric-value ${metrics.netProfitForecast >= 0 ? "positive" : "negative"}">
            ${formatCurrency(metrics.netProfitForecast || 0)}
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">Margem de Lucro</div>
          <div class="metric-value">${(metrics.profitMarginPercentage || 0).toFixed(1)}%</div>
        </div>
      </div>

      <h2>Detalhamento de Custos</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo de Custo</th>
            <th style="text-align: right;">Valor</th>
            <th style="text-align: right;">Percentual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Custos Fixos</td>
            <td style="text-align: right;">${formatCurrency(metrics.totalFixedCosts || 0)}</td>
            <td style="text-align: right;">${metrics.totalExpenses > 0 ? ((metrics.totalFixedCosts / metrics.totalExpenses) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td>Custos Variáveis</td>
            <td style="text-align: right;">${formatCurrency(metrics.totalVariableCosts || 0)}</td>
            <td style="text-align: right;">${metrics.totalExpenses > 0 ? ((metrics.totalVariableCosts / metrics.totalExpenses) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td>Despesas Pessoais</td>
            <td style="text-align: right;">${formatCurrency(metrics.totalPersonalExpenses || 0)}</td>
            <td style="text-align: right;">${metrics.totalExpenses > 0 ? ((metrics.totalPersonalExpenses / metrics.totalExpenses) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td>Custos de Colaboradores</td>
            <td style="text-align: right;">${formatCurrency(metrics.totalCollaboratorCosts || 0)}</td>
            <td style="text-align: right;">${metrics.totalExpenses > 0 ? ((metrics.totalCollaboratorCosts / metrics.totalExpenses) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td>TOTAL DE DESPESAS</td>
            <td style="text-align: right;">${formatCurrency(metrics.totalExpenses || 0)}</td>
            <td style="text-align: right;">100%</td>
          </tr>
        </tbody>
      </table>

      <h2>Indicadores Financeiros</h2>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th style="text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ponto de Equilíbrio</td>
            <td style="text-align: right;">${formatCurrency(metrics.breakEvenPoint || 0)}</td>
          </tr>
          <tr>
            <td>Meta de Segurança</td>
            <td style="text-align: right;">${formatCurrency(metrics.safetyMargin || 0)}</td>
          </tr>
          <tr>
            <td>Margem de Lucro</td>
            <td style="text-align: right;">${(metrics.profitMarginPercentage || 0).toFixed(2)}%</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 40px; font-size: 12px; color: #6b7280;">
        Relatório gerado automaticamente pelo Seven Marketing Manager - CFO Pessoal
      </p>
    </body>
    </html>
  `;
}

function generateExpensePDF(data: any, monthName: string): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const categoryRows = (data.byCategory || [])
    .map(
      (cat: any) => `
      <tr>
        <td>${cat.category}</td>
        <td style="text-align: right;">${formatCurrency(cat.total)}</td>
        <td style="text-align: right;">${cat.percentage.toFixed(1)}%</td>
        <td style="text-align: center;">${cat.itemCount}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Análise de Despesas - ${monthName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #f97316; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
        h2 { color: #1f2937; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f3f4f6; font-weight: bold; }
        tr:hover { background-color: #f9fafb; }
        .summary { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>Relatório de Análise de Despesas</h1>
      <p><strong>Período:</strong> ${monthName}</p>
      <p><strong>Data de Geração:</strong> ${new Date().toLocaleString("pt-BR")}</p>

      <div class="summary">
        <h2>Resumo</h2>
        <p><strong>Total de Despesas:</strong> ${formatCurrency(data.summary.totalExpenses)}</p>
        <p><strong>Quantidade de Lançamentos:</strong> ${data.summary.expenseCount}</p>
        <p><strong>Categorias:</strong> ${data.summary.categoryCount}</p>
      </div>

      <h2>Despesas por Categoria</h2>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th style="text-align: right;">Valor</th>
            <th style="text-align: right;">Percentual</th>
            <th style="text-align: center;">Itens</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td>TOTAL</td>
            <td style="text-align: right;">${formatCurrency(data.summary.totalExpenses)}</td>
            <td style="text-align: right;">100%</td>
            <td style="text-align: center;">${data.summary.expenseCount}</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 40px; font-size: 12px; color: #6b7280;">
        Relatório gerado automaticamente pelo Seven Marketing Manager
      </p>
    </body>
    </html>
  `;
}
