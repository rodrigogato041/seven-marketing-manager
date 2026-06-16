import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useFinancialPrivacy } from "@/lib/financialPrivacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Banknote,
  CheckCircle2,
  Clipboard,
  Clock,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const statusOptions = [
  { value: "all", label: "Todas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "pending", label: "Pendentes" },
  { value: "sent", label: "Enviadas" },
  { value: "responded", label: "Responderam" },
  { value: "negotiated", label: "Negociadas" },
  { value: "paid", label: "Pagas" },
];

const statusActions = [
  { value: "sent", label: "Cobrança enviada" },
  { value: "responded", label: "Cliente respondeu" },
  { value: "negotiated", label: "Negociado" },
  { value: "paid", label: "Pago" },
];

function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric || 0);
}

function formatDate(value?: number | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function parseDateInput(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).getTime();
}

function statusClass(status: string) {
  if (status === "overdue") return "bg-rose-50 text-rose-700 border-rose-100";
  if (status === "sent") return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "responded") return "bg-violet-50 text-violet-700 border-violet-100";
  if (status === "negotiated") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-muted text-muted-foreground";
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md border bg-white ${tone}`}>
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

export default function CollectionsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [followUps, setFollowUps] = useState<Record<number, string>>({});
  const { financialValue } = useFinancialPrivacy();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.collections.center.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const updateStatus = trpc.collections.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.collections.center.invalidate(),
        utils.payments.list.invalidate(),
        utils.payments.billingForecast.invalidate(),
        utils.dashboard.stats.invalidate(),
        utils.dashboard.today.invalidate(),
        utils.dashboard.executive.invalidate(),
        utils.strategicFinance.summary.invalidate(),
      ]);
      toast.success("Status da cobrança atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar a cobrança."),
  });

  const addNote = trpc.collections.addNote.useMutation({
    onSuccess: async (_, variables) => {
      setNotes(current => ({ ...current, [variables.paymentId]: "" }));
      setFollowUps(current => ({ ...current, [variables.paymentId]: "" }));
      await utils.collections.center.invalidate();
      toast.success("Observação registrada.");
    },
    onError: () => toast.error("Não foi possível salvar a observação."),
  });

  const filteredCollections = useMemo(() => {
    const items = data?.collections ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item: any) => {
      const matchesStatus = statusFilter === "all" || item.collectionStatus === statusFilter;
      const matchesQuery = !normalizedQuery || [item.companyName, item.description, item.contactName, item.email, item.whatsapp]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [data, query, statusFilter]);

  async function copyMessage(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  function saveNote(paymentId: number) {
    const note = notes[paymentId]?.trim();
    if (!note) {
      toast.error("Digite uma observação antes de salvar.");
      return;
    }
    addNote.mutate({
      paymentId,
      note,
      nextFollowUpAt: parseDateInput(followUps[paymentId] || ""),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Recebimentos e relacionamento
          </div>
          <h1 className="text-2xl font-semibold">Central de Cobranças</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe pendências, contatos, negociações e pagamentos em aberto.</p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Em aberto" value={String(data.summary.totalOpen)} icon={Banknote} tone="border-blue-100 text-blue-700" />
            <Metric label="Valor em aberto" value={financialValue(formatCurrency(data.summary.totalAmount))} icon={Wallet} tone="border-emerald-100 text-emerald-700" />
            <Metric label="Atrasadas" value={String(data.summary.overdue)} icon={ShieldAlert} tone="border-rose-100 text-rose-700" />
            <Metric label="Valor atrasado" value={financialValue(formatCurrency(data.summary.overdueAmount))} icon={Clock} tone="border-amber-100 text-amber-700" />
          </div>

          <Card className="shadow-sm">
            <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar cliente, descrição, contato, email ou WhatsApp..."
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-md border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {filteredCollections.length === 0 ? (
              <Card className="border-emerald-100 bg-emerald-50 shadow-sm">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-800">Nenhuma cobrança encontrada para este filtro.</p>
                </CardContent>
              </Card>
            ) : filteredCollections.map((collection: any) => (
              <Card key={collection.paymentId} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {collection.companyName}
                        <Badge variant="outline">{collection.priority}</Badge>
                        <Badge className={statusClass(collection.collectionStatus)}>{collection.collectionStatusLabel}</Badge>
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {collection.description || "Recebimento"} · vencimento {formatDate(collection.dueDate)}
                        {collection.daysLate > 0 ? ` · ${collection.daysLate} dia(s) em atraso` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">{financialValue(formatCurrency(collection.amount))}</p>
                      <p className="text-xs text-muted-foreground">{collection.whatsapp || collection.email || "Sem contato cadastrado"}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => copyMessage(collection.message)}>
                      <Clipboard className="h-4 w-4" /> Copiar mensagem
                    </Button>
                    {statusActions.map(action => (
                      <Button
                        key={action.value}
                        variant={action.value === "paid" ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ paymentId: collection.paymentId, status: action.value as any })}
                      >
                        {action.value === "sent" ? <Send className="h-4 w-4" /> : action.value === "paid" ? <CheckCircle2 className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
                    <Textarea
                      rows={2}
                      placeholder="Adicionar observação sobre a cobrança..."
                      value={notes[collection.paymentId] ?? ""}
                      onChange={event => setNotes(current => ({ ...current, [collection.paymentId]: event.target.value }))}
                    />
                    <Input
                      type="date"
                      value={followUps[collection.paymentId] ?? ""}
                      onChange={event => setFollowUps(current => ({ ...current, [collection.paymentId]: event.target.value }))}
                    />
                    <Button onClick={() => saveNote(collection.paymentId)} disabled={addNote.isPending}>
                      Salvar
                    </Button>
                  </div>

                  {(collection.notes.length > 0 || collection.history.length > 0) ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Observações</p>
                        {collection.notes.slice(-3).reverse().map((note: any) => (
                          <div key={note.id} className="border-b py-2 last:border-b-0">
                            <p className="text-sm">{note.note}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {note.author} · {new Date(note.createdAt).toLocaleString("pt-BR")}
                              {note.nextFollowUpAt ? ` · follow-up ${formatDate(note.nextFollowUpAt)}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico</p>
                        {collection.history.slice(-4).reverse().map((entry: any) => (
                          <div key={entry.id} className="border-b py-2 last:border-b-0">
                            <p className="text-sm">{entry.action}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{entry.author} · {new Date(entry.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
