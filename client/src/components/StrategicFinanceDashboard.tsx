import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clipboard,
  CreditCard,
  Landmark,
  LineChart,
  ShieldAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric || 0);
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function levelClass(level: string) {
  if (level === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (level === "high") return "border-orange-200 bg-orange-50 text-orange-800";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function riskLabel(risk: string) {
  if (risk === "negative") return "Risco negativo";
  if (risk === "attention") return "Atenção";
  return "Saudável";
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  label: string;
  value: string;
  icon: any;
  tone: string;
  helper?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-md border bg-white ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold text-foreground">{value}</p>
          {helper ? <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <span className={muted ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function StrategicFinanceDashboard({
  year,
  month,
  financialValue,
}: {
  year: number;
  month: number;
  financialValue: (value: string) => string;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.strategicFinance.summary.useQuery(
    { year, month },
    { refetchInterval: 30000 }
  );
  const confirmPayment = trpc.payments.confirm.useMutation({
    onSuccess: () => {
      utils.strategicFinance.summary.invalidate();
      utils.payments.billingForecast.invalidate();
      utils.payments.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.today.invalidate();
      toast.success("Pagamento marcado como pago!");
    },
    onError: () => toast.error("Erro ao confirmar pagamento"),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(item => (
          <div key={item} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const dre = data.dre;
  const hasRisk = data.riskAlerts.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita recebida"
          value={financialValue(formatCurrency(dre.receivedRevenue))}
          icon={ArrowUpRight}
          tone="border-emerald-100 text-emerald-700"
          helper={`Pendente: ${financialValue(formatCurrency(dre.pendingRevenue))}`}
        />
        <MetricCard
          label="Lucro líquido"
          value={financialValue(formatCurrency(dre.netProfit))}
          icon={LineChart}
          tone={dre.netProfit >= 0 ? "border-emerald-100 text-emerald-700" : "border-rose-100 text-rose-700"}
          helper={`Margem: ${dre.netMargin}%`}
        />
        <MetricCard
          label="Caixa final"
          value={financialValue(formatCurrency(dre.finalBalance))}
          icon={Wallet}
          tone={dre.finalBalance >= 0 ? "border-blue-100 text-blue-700" : "border-rose-100 text-rose-700"}
          helper="Recebido menos saídas do mês"
        />
        <MetricCard
          label="Alertas ativos"
          value={String(data.riskAlerts.length)}
          icon={ShieldAlert}
          tone={hasRisk ? "border-orange-100 text-orange-700" : "border-emerald-100 text-emerald-700"}
          helper={hasRisk ? "Pontos para revisar" : "Sem alerta crítico"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Landmark className="h-4 w-4 text-primary" />
              DRE Gerencial Simplificada
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Receitas</p>
              <Row label="Receita bruta prevista" value={financialValue(formatCurrency(dre.grossRevenue))} />
              <Row label="Receita recebida" value={financialValue(formatCurrency(dre.receivedRevenue))} />
              <Row label="Receita pendente" value={financialValue(formatCurrency(dre.pendingRevenue))} muted />
              <Row label="Impostos" value={financialValue(formatCurrency(dre.taxes))} muted />
            </div>
            <div className="rounded-lg border bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Custos e despesas</p>
              <Row label="Custos fixos" value={financialValue(formatCurrency(dre.fixedCosts))} />
              <Row label="Custos variáveis" value={financialValue(formatCurrency(dre.variableCosts))} />
              <Row label="Colaboradores" value={financialValue(formatCurrency(dre.collaboratorCosts))} />
              <Row label="Ferramentas/assinaturas" value={financialValue(formatCurrency(dre.tools + dre.subscriptions))} muted />
              <Row label="Investimentos" value={financialValue(formatCurrency(dre.investments))} muted />
              <Row label="Cartão pendente" value={financialValue(formatCurrency(dre.creditCardPending))} muted />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Lucro operacional</p>
                  <p className="text-lg font-semibold">{financialValue(formatCurrency(dre.operatingProfit))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas pessoais/retirada</p>
                  <p className="text-lg font-semibold">{financialValue(formatCurrency(dre.personalExpenses))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo final</p>
                  <p className="text-lg font-semibold">{financialValue(formatCurrency(dre.finalBalance))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Empresa x Pessoal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-700" />
                <p className="text-sm font-semibold">Empresa</p>
              </div>
              <Row label="Receita" value={financialValue(formatCurrency(data.separation.company.revenue))} />
              <Row label="Custos operacionais" value={financialValue(formatCurrency(data.separation.company.operationalExpenses))} />
              <Row label="Lucro operacional" value={financialValue(formatCurrency(data.separation.company.operatingProfit))} />
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-violet-700" />
                <p className="text-sm font-semibold">Pessoal</p>
              </div>
              <Row label="Retiradas/despesas" value={financialValue(formatCurrency(data.separation.personal.personalExpenses))} />
              <Row label="Impacto sobre receita prevista" value={`${data.separation.personal.personalImpactPercentage}%`} muted />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Banknote className="h-4 w-4 text-primary" />
              Fluxo de Caixa por Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            {data.cashflow.map((window: any) => (
              <div key={window.days} className="rounded-lg border bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">{window.label}</p>
                  <Badge className={window.risk === "negative" ? "bg-rose-50 text-rose-700" : window.risk === "attention" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>
                    {riskLabel(window.risk)}
                  </Badge>
                </div>
                <Row label="A receber" value={financialValue(formatCurrency(window.totalReceivable))} />
                <Row label="A pagar" value={financialValue(formatCurrency(window.totalPayable))} />
                <Row label="Saldo previsto" value={financialValue(formatCurrency(window.projectedBalance))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Alertas de Risco Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.riskAlerts.length === 0 ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">Nenhum alerta financeiro crítico para este período.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {data.riskAlerts.map((alert: any) => (
                  <div key={`${alert.title}-${alert.description}`} className={`rounded-lg border p-3 ${levelClass(alert.level)}`}>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-1 text-xs leading-5 opacity-85">{alert.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            Central de Cobranças
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.collections.length === 0 ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">Nenhuma cobrança pendente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.collections.map((collection: any) => (
                <div key={collection.paymentId} className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{collection.companyName}</p>
                      <Badge variant="outline">{collection.priority}</Badge>
                      <Badge className={collection.status === "Atrasado" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}>
                        {collection.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {financialValue(formatCurrency(collection.amount))} · vencimento {formatDate(collection.dueDate)}
                      {collection.daysLate > 0 ? ` · ${collection.daysLate} dia(s) em atraso` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(collection.message);
                          toast.success("Mensagem de cobrança copiada!");
                        } catch {
                          toast.error("Não foi possível copiar automaticamente.");
                        }
                      }}
                    >
                      <Clipboard className="h-4 w-4" />
                      Copiar mensagem
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => confirmPayment.mutate({ id: collection.paymentId })}
                      disabled={confirmPayment.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar pago
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowDownRight className="h-4 w-4 text-primary" />
            Concentração e Duplicidades
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-muted-foreground">Maior cliente</p>
            <p className="mt-1 text-xl font-semibold">{data.concentration.topClientShare}%</p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-muted-foreground">Dois maiores clientes</p>
            <p className="mt-1 text-xl font-semibold">{data.concentration.topTwoShare}%</p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-muted-foreground">Duplicidades ignoradas</p>
            <p className="mt-1 text-xl font-semibold">{financialValue(formatCurrency(data.duplicates.totalIgnored))}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
