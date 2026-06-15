import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Clock,
  ListTodo,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { useFinancialPrivacy } from "@/lib/financialPrivacy";

function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric || 0);
}

function formatDate(value?: number | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function contractTone(severity?: string) {
  if (severity === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (severity === "info") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusClass(statusKey?: string) {
  if (statusKey === "inadimplente") return "border-rose-200 bg-rose-50 text-rose-700";
  if (statusKey === "risco") return "border-orange-200 bg-orange-50 text-orange-700";
  if (statusKey === "sobrecarregado") return "border-amber-200 bg-amber-50 text-amber-700";
  if (statusKey === "atencao") return "border-yellow-200 bg-yellow-50 text-yellow-700";
  if (statusKey === "upsell") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function ClientHealthBadge({ health }: { health?: any }) {
  if (!health) return null;
  return (
    <Badge variant="outline" className={`${statusClass(health.status?.key)} text-[10px]`}>
      {health.status?.label ?? "Sem leitura"}
    </Badge>
  );
}

function SummaryTile({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatRankingValue(item: any, financialValue: (value: string) => string) {
  if (item.label === "Faturamento") return financialValue(formatCurrency(item.value));
  if (item.label === "Margem estimada" || item.label === "Carga operacional") return `${item.value}%`;
  return String(item.value);
}

function RankingList({ title, items, empty, financialValue }: { title: string; items: any[]; empty: string; financialValue: (value: string) => string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={`${title}-${item.clientId}`}
              className="flex w-full items-center justify-between gap-3 rounded-md border bg-muted/20 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
              onClick={() => setLocation(`/clientes/${item.clientId}`)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.companyName}</p>
                <p className="truncate text-xs text-muted-foreground">{item.label}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{formatRankingValue(item, financialValue)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientIntelligenceDashboard() {
  const { financialValue } = useFinancialPrivacy();
  const { data, isLoading } = trpc.clients.intelligence.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />)}
      </div>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-primary/10 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Carteira inteligente
            </div>
            <CardTitle className="text-lg">Saúde e ranking dos clientes</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Leitura automática de lucro, operação, produção, atrasos e oportunidades.</p>
          </div>
          <Badge variant="outline" className={data.summary.averageScore >= 70 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
            Score médio {data.summary.averageScore}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryTile label="Clientes ativos" value={data.summary.activeClients} icon={Users} tone="text-blue-700" />
          <SummaryTile label="Saudáveis" value={data.summary.healthy} icon={CheckCircle2} tone="text-emerald-700" />
          <SummaryTile label="Atenção" value={data.summary.attention} icon={Clock} tone="text-amber-700" />
          <SummaryTile label="Risco" value={data.summary.risk} icon={AlertTriangle} tone="text-orange-700" />
          <SummaryTile label="Inadimplentes" value={data.summary.delinquent} icon={CircleDollarSign} tone="text-rose-700" />
          <SummaryTile label="Contratos" value={data.summary.contractAlerts ?? 0} icon={FileCheck2} tone="text-cyan-700" />
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <RankingList title="Maiores faturamentos" items={data.ranking.topRevenue} empty="Sem receita cadastrada." financialValue={financialValue} />
          <RankingList title="Maior carga operacional" items={data.ranking.operationalLoad} empty="Sem carga operacional." financialValue={financialValue} />
          <RankingList title="Mais pendências" items={data.ranking.mostOverdue} empty="Sem pendências relevantes." financialValue={financialValue} />
          <RankingList title="Potencial de upsell" items={data.ranking.upsell} empty="Nenhuma oportunidade clara." financialValue={financialValue} />
        </div>
      </CardContent>
    </Card>
  );
}

function SmallMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium uppercase">{label}</p>
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function Client360Overview({ clientId }: { clientId: number }) {
  const { financialValue } = useFinancialPrivacy();
  const { data: health, isLoading } = trpc.clients.health.useQuery({ id: clientId }, {
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!health) return null;

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Visão 360° do Cliente
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Saúde operacional, financeira, produção e oportunidades.</p>
          </div>
          <div className="flex items-center gap-2">
            <ClientHealthBadge health={health} />
            <Badge variant="outline">Score {health.score}/100</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SmallMetric label="Tarefas abertas" value={health.metrics.openTasks} icon={ListTodo} />
          <SmallMetric label="Pagamentos pendentes" value={financialValue(formatCurrency(health.metrics.pending))} icon={CircleDollarSign} />
          <SmallMetric label="Produção entregue" value={`${health.metrics.productionProgress}%`} icon={Target} />
          <SmallMetric label="Contrato" value={health.contract?.label ?? "Sem leitura"} icon={FileCheck2} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Contratado x entregue</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Vídeos</span><strong>{health.metrics.deliveredVideos}/{health.metrics.contractedVideos}</strong></div>
              <div className="flex justify-between"><span>Imagens</span><strong>{health.metrics.deliveredImages}/{health.metrics.contractedImages}</strong></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(health.metrics.productionProgress, 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Financeiro</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Recebido</span><strong>{financialValue(formatCurrency(health.metrics.received))}</strong></div>
              <div className="flex justify-between"><span>Pendente</span><strong>{financialValue(formatCurrency(health.metrics.pending))}</strong></div>
              <div className="flex justify-between"><span>Pagamentos atrasados</span><strong>{health.metrics.overduePayments}</strong></div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Oportunidades</p>
            {health.upsellOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade clara no momento.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {health.upsellOpportunities.filter((item): item is string => Boolean(item)).map(item => (
                  <Badge key={item} variant="outline" className="bg-white">{item}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Contrato</p>
            <Badge variant="outline" className={contractTone(health.contract?.severity)}>
              {health.contract?.label ?? "Sem leitura"}
            </Badge>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Renovação</span>
              <strong className="ml-auto">{formatDate(health.contract?.renewalDate)}</strong>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Vencimento</span>
              <strong className="ml-auto">{formatDate(health.contract?.endDate)}</strong>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pagamento</span>
              <strong className="ml-auto truncate">{health.contract?.paymentMethod ?? "-"}</strong>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reajuste</span>
              <strong className="ml-auto truncate">{health.contract?.adjustment ?? "-"}</strong>
            </div>
          </div>
        </div>

        {health.reasons.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-amber-800">Motivos da leitura</p>
            <div className="flex flex-wrap gap-1.5">
              {health.reasons.filter((reason): reason is string => Boolean(reason)).map(reason => (
                <Badge key={reason} variant="outline" className="border-amber-200 bg-white text-amber-800">{reason}</Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
