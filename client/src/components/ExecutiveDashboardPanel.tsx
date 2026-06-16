import { trpc } from "@/lib/trpc";
import { useFinancialPrivacy } from "@/lib/financialPrivacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useLocation } from "wouter";
import type { ElementType } from "react";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function scoreTone(score: number) {
  if (score <= 39) return "text-rose-700 bg-rose-50 border-rose-100";
  if (score <= 59) return "text-amber-700 bg-amber-50 border-amber-100";
  if (score <= 79) return "text-blue-700 bg-blue-50 border-blue-100";
  return "text-emerald-700 bg-emerald-50 border-emerald-100";
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (severity === "high") return "border-orange-200 bg-orange-50 text-orange-800";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="truncate text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      </div>
      <p className="truncate text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ComponentBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.max(4, Math.min(score, 100))}%` }}
        />
      </div>
    </div>
  );
}

export function ExecutiveDashboardPanel() {
  const [, setLocation] = useLocation();
  const { financialValue } = useFinancialPrivacy();
  const { data, isLoading } = trpc.dashboard.executive.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-primary/10 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map(item => (
              <div key={item} className="h-24 animate-pulse rounded-lg bg-muted/70" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const metrics = data.metrics;
  const score = data.health.score;
  const status = data.health.status;

  return (
    <Card className="overflow-hidden border-primary/10 bg-white shadow-sm">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Brain className="h-3.5 w-3.5 text-primary" />
              Analise Inteligente
            </div>
            <CardTitle className="text-lg font-semibold">Dashboard Executivo</CardTitle>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{data.health.insight}</p>
          </div>
          <div className={`rounded-lg border px-4 py-3 text-right shadow-sm ${scoreTone(score)}`}>
            <p className="text-xs font-semibold uppercase">Saude da empresa</p>
            <p className="mt-1 text-3xl font-bold">{score}/100</p>
            <p className="text-sm font-medium">{status.label}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Receita do mes" value={financialValue(formatCurrency(metrics.grossRevenue))} icon={TrendingUp} />
          <Metric label="Recebido" value={financialValue(formatCurrency(metrics.receivedRevenue))} icon={Wallet} />
          <Metric label="Pendente" value={financialValue(formatCurrency(metrics.pendingRevenue))} icon={Target} />
          <Metric label="Lucro liquido" value={financialValue(formatCurrency(metrics.netProfit))} icon={Activity} />
          <Metric label="Clientes em risco" value={String(metrics.clientsAtRisk)} icon={Users} />
          <Metric label="Tarefas atrasadas" value={String(metrics.overdueTasks)} icon={ClipboardList} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Composicao do score</p>
            </div>
            <div className="space-y-3">
              {data.health.components.map((component: any) => (
                <ComponentBar key={component.key} label={component.label} score={component.score} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Decisoes recomendadas</p>
              <Badge variant="secondary" className="ml-auto bg-muted">
                {data.recommendations.length}
              </Badge>
            </div>
            {data.recommendations.length === 0 ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">Nenhuma acao critica agora. Continue acompanhando os indicadores.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {data.recommendations.map((item: any) => (
                  <button
                    key={`${item.title}-${item.href}`}
                    className={`rounded-lg border p-3 text-left transition hover:shadow-sm ${severityClass(item.severity)}`}
                    onClick={() => setLocation(item.href)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 opacity-85">{item.description}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {data.alerts.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-semibold text-amber-900">Alertas importantes</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.alerts.map((alert: any) => (
                <Badge key={`${alert.title}-${alert.description}`} variant="outline" className="border-amber-200 bg-white text-amber-800">
                  {alert.title}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/25 p-3">
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-6">
            <span>Margem liquida: <strong className="text-foreground">{metrics.netMargin}%</strong></span>
            <span>Receita 2 maiores clientes: <strong className="text-foreground">{metrics.topTwoRevenueShare}%</strong></span>
            <span>Producao pendente: <strong className="text-foreground">{metrics.pendingProduction}</strong></span>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/financeiro")}>
            Ver detalhes financeiros
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
