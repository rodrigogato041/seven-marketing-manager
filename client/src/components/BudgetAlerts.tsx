import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BudgetAlertsProps {
  year: number;
  month: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function BudgetAlerts({ year, month }: BudgetAlertsProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = trpc.budgetAlerts.checkBudgetAlerts.useQuery({ year, month });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas de Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando alertas...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            Alertas de Orcamento indisponiveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-red-700">
            Nao foi possivel carregar os alertas agora. Os calculos financeiros continuam salvos, mas este bloco precisa ser recarregado.
          </p>
          {error?.message ? <p className="text-xs text-red-600">{error.message}</p> : null}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="border-red-200 bg-white text-red-700 hover:bg-red-100">
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.alerts.length === 0) {
    return (
      <Card className="bg-emerald-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-600" />
            Alertas de Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-emerald-700">✓ Todos os orçamentos estão dentro dos limites!</p>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = data.alerts.filter(a => a.type === "critical");
  const warningAlerts = data.alerts.filter(a => a.type === "warning");

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resumo de Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total de Alertas</p>
              <p className="text-2xl font-bold text-gray-600">{data.summary.total}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Críticos</p>
              <p className="text-2xl font-bold text-red-600">{data.summary.critical}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avisos</p>
              <p className="text-2xl font-bold text-amber-600">{data.summary.warning}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              Alertas Críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.map((alert, idx) => (
              <div key={idx} className="border-l-4 border-red-500 pl-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700">{alert.category}</p>
                    <p className="text-xs text-red-600 mt-1">{alert.message}</p>
                  </div>
                  <Badge variant="destructive" className="whitespace-nowrap">
                    {alert.percentage?.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-xs text-red-600 mt-2">
                  Atual: {formatCurrency(alert.current)} / Limite: {formatCurrency(alert.limit || 0)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Avisos de Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warningAlerts.map((alert, idx) => (
              <div key={idx} className="border-l-4 border-amber-500 pl-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-700">{alert.category}</p>
                    <p className="text-xs text-amber-600 mt-1">{alert.message}</p>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap bg-amber-100 text-amber-700 border-amber-300">
                    {alert.percentage?.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-xs text-amber-600 mt-2">
                  Atual: {formatCurrency(alert.current)} / Limite: {formatCurrency(alert.limit || 0)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm text-blue-700">Recomendações</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          {criticalAlerts.length > 0 && (
            <p>• Revise imediatamente as categorias com alertas críticos e considere reduzir despesas.</p>
          )}
          {warningAlerts.length > 0 && (
            <p>• Monitore as categorias em aviso para evitar que ultrapassem os limites.</p>
          )}
          <p>• Considere ajustar os limites de orçamento se as despesas são necessárias e recorrentes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
