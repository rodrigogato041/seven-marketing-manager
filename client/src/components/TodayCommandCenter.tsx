import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  Film,
  Users,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useLocation } from "wouter";

function formatDate(value?: number | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function CountPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MiniList({
  title,
  icon: Icon,
  items,
  empty,
  render,
}: {
  title: string;
  icon: ElementType;
  items: any[];
  empty: string;
  render: (item: any) => ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="secondary" className="ml-auto bg-muted">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map(render)}
        </div>
      )}
    </div>
  );
}

export function TodayCommandCenter() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.today.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-primary/10 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map(item => (
              <div key={item} className="h-20 animate-pulse rounded-lg bg-muted/70" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasCritical = data.counts.criticalAlerts > 0;

  return (
    <Card className="overflow-hidden border-primary/10 bg-white shadow-sm">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Hoje na Seven
            </div>
            <CardTitle className="text-lg font-semibold">Central do Dia</CardTitle>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{data.summary}</p>
          </div>
          {hasCritical ? (
            <Badge className="border-rose-100 bg-rose-50 text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Atenção necessária
            </Badge>
          ) : (
            <Badge className="border-emerald-100 bg-emerald-50 text-emerald-700">
              Rotina controlada
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CountPill label="Tarefas hoje" value={data.counts.tasksDueToday} tone="text-blue-700" />
          <CountPill label="Atrasadas" value={data.counts.overdueTasks} tone="text-rose-700" />
          <CountPill label="Reuniões" value={data.counts.meetingsToday} tone="text-violet-700" />
          <CountPill label="Produções" value={data.counts.productionPending} tone="text-amber-700" />
          <CountPill label="Contratos" value={data.counts.contractAlerts ?? 0} tone="text-cyan-700" />
        </div>

        {data.criticalAlerts.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              {(data.criticalAlerts.filter(Boolean) as string[]).map((alert) => (
                <Badge key={alert} variant="outline" className="border-amber-200 bg-white text-amber-800">
                  {alert}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-5">
          <MiniList
            title="Tarefas críticas"
            icon={ClipboardList}
            items={[...data.overdueTasks, ...data.tasksDueToday]}
            empty="Nenhuma tarefa vencendo ou atrasada."
            render={(task: any) => (
              <button
                key={`task-${task.id}`}
                className="block w-full rounded-md border bg-muted/20 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setLocation("/tarefas")}
              >
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.dueDate ? formatDate(task.dueDate) : "Sem prazo"}</p>
              </button>
            )}
          />
          <MiniList
            title="Agenda"
            icon={CalendarClock}
            items={data.eventsToday}
            empty="Nenhum evento no calendário hoje."
            render={(event: any) => (
              <button
                key={`event-${event.id}`}
                className="block w-full rounded-md border bg-muted/20 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setLocation("/calendario")}
              >
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.type}</p>
              </button>
            )}
          />
          <MiniList
            title="Recebimentos"
            icon={CircleDollarSign}
            items={[...data.overduePayments, ...data.paymentsDueToday, ...data.paymentsDueSoon]}
            empty="Nenhum recebimento exigindo atenção."
            render={(payment: any) => (
              <button
                key={`payment-${payment.id}`}
                className="block w-full rounded-md border bg-muted/20 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setLocation("/financeiro")}
              >
                <p className="truncate text-sm font-medium">{payment.companyName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(payment.dueDate)} · {payment.status}</p>
              </button>
            )}
          />
          <MiniList
            title="Produção"
            icon={Film}
            items={data.productionPending}
            empty="Produção mensal dentro do combinado."
            render={(item: any) => (
              <button
                key={`production-${item.clientId}`}
                className="block w-full rounded-md border bg-muted/20 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setLocation(`/clientes/${item.clientId}`)}
              >
                <p className="truncate text-sm font-medium">{item.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.pendingVideos} vídeos · {item.pendingImages} imagens
                </p>
              </button>
            )}
          />
          <MiniList
            title="Contratos"
            icon={FileCheck2}
            items={data.contractAlerts ?? []}
            empty="Nenhum contrato vencendo."
            render={(contract: any) => (
              <button
                key={`contract-${contract.clientId}`}
                className="block w-full rounded-md border bg-muted/20 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setLocation(`/clientes/${contract.clientId}`)}
              >
                <p className="truncate text-sm font-medium">{contract.companyName}</p>
                <p className="text-xs text-muted-foreground">{contract.label}</p>
              </button>
            )}
          />
        </div>

        {data.clientsNeedingAttention.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Clientes em atenção:</span>
            {data.clientsNeedingAttention.slice(0, 6).map((client: any) => (
              <Button
                key={client.id}
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setLocation(`/clientes/${client.id}`)}
              >
                {client.companyName}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
