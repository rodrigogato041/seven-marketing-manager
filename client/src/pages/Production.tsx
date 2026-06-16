import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, CheckCircle2, ExternalLink, FileText, Film, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusOptions = [
  ["idea", "Ideia"],
  ["script", "Roteiro"],
  ["production", "Em produção"],
  ["editing", "Em edição"],
  ["approval", "Em aprovação"],
  ["changes", "Alteração solicitada"],
  ["approved", "Aprovado"],
  ["scheduled", "Agendado"],
  ["published", "Publicado"],
  ["archived", "Arquivado"],
] as const;

const approvalOptions = [
  ["not_sent", "Não enviado"],
  ["sent", "Enviado ao cliente"],
  ["waiting", "Aguardando aprovação"],
  ["approved", "Aprovado"],
  ["changes_requested", "Alteração solicitada"],
  ["rejected", "Reprovado"],
  ["published", "Publicado"],
] as const;

const contentTypes = ["Reel", "Arte", "Story", "Vídeo", "Legenda", "Campanha", "Relatório", "Outro"];

type ContentForm = {
  clientId: string;
  collaboratorId: string;
  contentType: string;
  theme: string;
  campaign: string;
  scheduledDate: string;
  publishedAt: string;
  status: string;
  approvalStatus: string;
  sentAt: string;
  approvedAt: string;
  caption: string;
  notes: string;
  fileUrl: string;
  publishedUrl: string;
  clientComment: string;
  internalComment: string;
  revisionOwnerId: string;
};

function currentMonthInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year: year || new Date().getFullYear(), month: month || new Date().getMonth() + 1 };
}

function parseLocalDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function inputDate(value?: number | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value?: number | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0) || 0);
}

function emptyForm(): ContentForm {
  return {
    clientId: "",
    collaboratorId: "",
    contentType: "Reel",
    theme: "",
    campaign: "",
    scheduledDate: "",
    publishedAt: "",
    status: "idea",
    approvalStatus: "not_sent",
    sentAt: "",
    approvedAt: "",
    caption: "",
    notes: "",
    fileUrl: "",
    publishedUrl: "",
    clientComment: "",
    internalComment: "",
    revisionOwnerId: "",
  };
}

function statusLabel(value: string) {
  return statusOptions.find(([key]) => key === value)?.[1] ?? value;
}

function approvalLabel(value: string) {
  return approvalOptions.find(([key]) => key === value)?.[1] ?? value;
}

function statusTone(status: string) {
  if (status === "published" || status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "changes") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "approval" || status === "editing") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-muted bg-muted text-muted-foreground";
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ProductionPage() {
  const utils = trpc.useUtils();
  const [monthValue, setMonthValue] = useState(currentMonthInput());
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [reportClientId, setReportClientId] = useState("");
  const { year, month } = parseMonth(monthValue);
  const clientId = clientFilter !== "all" ? Number(clientFilter) : undefined;
  const status = statusFilter !== "all" ? statusFilter as any : undefined;

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: collaborators = [] } = trpc.collaborators.list.useQuery();
  const { data: contentItems = [], isLoading } = trpc.contentProduction.listContent.useQuery({ year, month, clientId, status });
  const { data: summary } = trpc.contentProduction.summary.useQuery({ year, month, clientId });
  const reportQuery = trpc.contentProduction.clientReport.useQuery(
    { clientId: Number(reportClientId || 0), year, month },
    { enabled: Boolean(reportClientId) }
  );

  const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client.companyName])), [clients]);
  const collaboratorMap = useMemo(() => new Map(collaborators.map(collaborator => [collaborator.id, collaborator.name])), [collaborators]);
  const filteredItems = contentItems.filter(item => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [item.theme, item.contentType, item.campaign, item.caption, item.notes, clientMap.get(item.clientId)]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q));
  });

  const refreshProduction = async () => {
    await Promise.all([
      utils.contentProduction.listContent.invalidate(),
      utils.contentProduction.summary.invalidate(),
      utils.contentProduction.clientReport.invalidate(),
      utils.dashboard.globalSearch.invalidate(),
    ]);
  };

  const createContent = trpc.contentProduction.createContent.useMutation({
    onSuccess: async () => {
      await refreshProduction();
      setDialogOpen(false);
      toast.success("Conteúdo criado!");
    },
  });

  const updateContent = trpc.contentProduction.updateContent.useMutation({
    onSuccess: async () => {
      await refreshProduction();
      setDialogOpen(false);
      toast.success("Conteúdo atualizado!");
    },
  });

  const deleteContent = trpc.contentProduction.deleteContent.useMutation({
    onSuccess: async () => {
      await refreshProduction();
      toast.success("Conteúdo removido!");
    },
  });

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      clientId: item.clientId ? String(item.clientId) : "",
      collaboratorId: item.collaboratorId ? String(item.collaboratorId) : "",
      contentType: item.contentType || "Reel",
      theme: item.theme || "",
      campaign: item.campaign || "",
      scheduledDate: inputDate(item.scheduledDate),
      publishedAt: inputDate(item.publishedAt),
      status: item.status || "idea",
      approvalStatus: item.approvalStatus || "not_sent",
      sentAt: inputDate(item.sentAt),
      approvedAt: inputDate(item.approvedAt),
      caption: item.caption || "",
      notes: item.notes || "",
      fileUrl: item.fileUrl || "",
      publishedUrl: item.publishedUrl || "",
      clientComment: item.clientComment || "",
      internalComment: item.internalComment || "",
      revisionOwnerId: item.revisionOwnerId ? String(item.revisionOwnerId) : "",
    });
    setDialogOpen(true);
  }

  function saveContent() {
    const payload = {
      clientId: Number(form.clientId),
      collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : undefined,
      contentType: form.contentType,
      theme: form.theme.trim(),
      campaign: form.campaign.trim() || undefined,
      scheduledDate: parseLocalDate(form.scheduledDate),
      publishedAt: parseLocalDate(form.publishedAt),
      status: form.status as any,
      approvalStatus: form.approvalStatus as any,
      sentAt: parseLocalDate(form.sentAt),
      approvedAt: parseLocalDate(form.approvedAt),
      caption: form.caption.trim() || undefined,
      notes: form.notes.trim() || undefined,
      fileUrl: form.fileUrl.trim() || undefined,
      publishedUrl: form.publishedUrl.trim() || undefined,
      clientComment: form.clientComment.trim() || undefined,
      internalComment: form.internalComment.trim() || undefined,
      revisionOwnerId: form.revisionOwnerId ? Number(form.revisionOwnerId) : undefined,
    };
    if (editingId) {
      updateContent.mutate({ id: editingId, ...payload });
    } else {
      createContent.mutate(payload);
    }
  }

  function exportReport() {
    const report = reportQuery.data;
    if (!report) return;
    const content = [
      `Relatório Mensal - ${report.client.companyName}`,
      `Período: ${String(month).padStart(2, "0")}/${year}`,
      "",
      `Serviços: ${report.client.services.join(", ") || "Sem serviços cadastrados"}`,
      `Valor mensal: ${formatCurrency(report.client.monthlyValue)}`,
      "",
      `Conteúdos entregues: ${report.content.delivered}`,
      `Conteúdos publicados: ${report.content.published}`,
      `Conteúdos pendentes: ${report.content.pending}`,
      `Tarefas concluídas: ${report.tasks.completed}`,
      `Tarefas em aberto: ${report.tasks.open}`,
      `Recebido no período: ${formatCurrency(report.financial.received)}`,
      `Pendente no período: ${formatCurrency(report.financial.pending)}`,
      "",
      `Campanhas: ${report.content.campaigns.join(", ") || "Nenhuma campanha registrada"}`,
      "",
      "Próximos passos:",
      ...(report.nextSteps.length ? report.nextSteps.map(step => `- ${step}`) : ["- Nenhuma pendência editorial registrada"]),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${report.client.companyName}-${year}-${month}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Operação editorial
          </div>
          <h1 className="text-2xl font-semibold">Produção</h1>
          <p className="mt-1 text-sm text-muted-foreground">Calendário editorial, aprovação, biblioteca e relatórios mensais por cliente.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Conteúdo
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[160px_1fr_180px_220px]">
        <Input type="month" value={monthValue} onChange={event => setMonthValue(event.target.value)} />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar tema, campanha, legenda ou cliente..." value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(client => <SelectItem key={client.id} value={String(client.id)}>{client.companyName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Conteúdos" value={summary?.summary.total ?? 0} icon={Film} tone="text-blue-700" />
        <SummaryCard label="Publicados" value={summary?.summary.published ?? 0} icon={CheckCircle2} tone="text-emerald-700" />
        <SummaryCard label="Aprovados" value={summary?.summary.approved ?? 0} icon={CheckCircle2} tone="text-cyan-700" />
        <SummaryCard label="Em aprovação" value={summary?.summary.awaitingApproval ?? 0} icon={CalendarClock} tone="text-amber-700" />
        <SummaryCard label="Atrasados" value={summary?.summary.overdue ?? 0} icon={CalendarClock} tone="text-rose-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Calendário editorial e biblioteca</CardTitle>
            <Badge variant="outline">{filteredItems.length} item(ns)</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(item => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 py-12 text-center text-sm text-muted-foreground">
                Nenhum conteúdo encontrado para os filtros atuais.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map(item => (
                  <div key={item.id} className="rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                          <Badge variant="secondary" className="bg-muted">{approvalLabel(item.approvalStatus)}</Badge>
                          <span className="text-xs text-muted-foreground">{item.contentType}</span>
                        </div>
                        <p className="font-semibold text-foreground">{item.theme}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {clientMap.get(item.clientId) ?? "Cliente"} · {item.scheduledDate ? `Previsto ${formatDate(item.scheduledDate)}` : "Sem data prevista"}
                          {item.collaboratorId ? ` · ${collaboratorMap.get(item.collaboratorId) ?? "Responsável"}` : ""}
                        </p>
                        {item.campaign ? <p className="mt-1 text-xs text-muted-foreground">Campanha: {item.campaign}</p> : null}
                        {item.caption ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.caption}</p> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.publishedUrl ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(item.publishedUrl, "_blank")}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteContent.mutate({ id: item.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm">Aprovação e atrasos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(summary?.overdue ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">Nenhum conteúdo atrasado.</p>
              ) : (
                summary?.overdue.map((item: any) => (
                  <button key={item.id} className="block w-full rounded-lg border bg-rose-50/50 p-3 text-left" onClick={() => openEdit(item)}>
                    <p className="text-sm font-semibold">{item.theme}</p>
                    <p className="text-xs text-muted-foreground">{item.companyName} · {formatDate(item.scheduledDate)}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm">Relatório mensal do cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={reportClientId} onValueChange={setReportClientId}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(client => <SelectItem key={client.id} value={String(client.id)}>{client.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
              {reportQuery.data ? (
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-semibold">{reportQuery.data.client.companyName}</p>
                  <p className="mt-2 text-muted-foreground">Entregues: {reportQuery.data.content.delivered} · Pendentes: {reportQuery.data.content.pending}</p>
                  <p className="text-muted-foreground">Tarefas concluídas: {reportQuery.data.tasks.completed} · Abertas: {reportQuery.data.tasks.open}</p>
                  <p className="text-muted-foreground">Recebido: {formatCurrency(reportQuery.data.financial.received)}</p>
                </div>
              ) : null}
              <Button className="w-full" variant="outline" disabled={!reportQuery.data} onClick={exportReport}>
                <FileText className="mr-2 h-4 w-4" /> Gerar relatório
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <SelectField label="Cliente" value={form.clientId} onChange={value => setForm(f => ({ ...f, clientId: value }))} items={clients.map(client => [String(client.id), client.companyName])} />
            <SelectField label="Responsável" value={form.collaboratorId} onChange={value => setForm(f => ({ ...f, collaboratorId: value }))} items={collaborators.map(collaborator => [String(collaborator.id), collaborator.name])} placeholder="Sem responsável" />
            <SelectField label="Tipo de conteúdo" value={form.contentType} onChange={value => setForm(f => ({ ...f, contentType: value }))} items={contentTypes.map(type => [type, type])} />
            <Field label="Campanha" value={form.campaign} onChange={value => setForm(f => ({ ...f, campaign: value }))} />
            <div className="sm:col-span-2">
              <Field label="Tema" value={form.theme} onChange={value => setForm(f => ({ ...f, theme: value }))} />
            </div>
            <Field label="Data prevista" type="date" value={form.scheduledDate} onChange={value => setForm(f => ({ ...f, scheduledDate: value }))} />
            <Field label="Data de publicação" type="date" value={form.publishedAt} onChange={value => setForm(f => ({ ...f, publishedAt: value }))} />
            <SelectField label="Status editorial" value={form.status} onChange={value => setForm(f => ({ ...f, status: value }))} items={statusOptions as any} />
            <SelectField label="Aprovação" value={form.approvalStatus} onChange={value => setForm(f => ({ ...f, approvalStatus: value }))} items={approvalOptions as any} />
            <Field label="Enviado ao cliente" type="date" value={form.sentAt} onChange={value => setForm(f => ({ ...f, sentAt: value }))} />
            <Field label="Aprovado em" type="date" value={form.approvedAt} onChange={value => setForm(f => ({ ...f, approvedAt: value }))} />
            <Field label="Link do arquivo" value={form.fileUrl} onChange={value => setForm(f => ({ ...f, fileUrl: value }))} />
            <Field label="Link publicado" value={form.publishedUrl} onChange={value => setForm(f => ({ ...f, publishedUrl: value }))} />
            <div className="sm:col-span-2">
              <TextareaField label="Legenda" value={form.caption} onChange={value => setForm(f => ({ ...f, caption: value }))} />
            </div>
            <TextareaField label="Comentário do cliente" value={form.clientComment} onChange={value => setForm(f => ({ ...f, clientComment: value }))} />
            <TextareaField label="Comentário interno" value={form.internalComment} onChange={value => setForm(f => ({ ...f, internalComment: value }))} />
            <div className="sm:col-span-2">
              <TextareaField label="Observações" value={form.notes} onChange={value => setForm(f => ({ ...f, notes: value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveContent} disabled={!form.clientId || !form.theme.trim() || createContent.isPending || updateContent.isPending}>
              {createContent.isPending || updateContent.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value} onChange={event => onChange(event.target.value)} rows={3} />
    </div>
  );
}

function SelectField({ label, value, onChange, items, placeholder = "Selecionar" }: { label: string; value: string; onChange: (value: string) => void; items: readonly (readonly [string, string])[]; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {items.map(([itemValue, labelText]) => <SelectItem key={itemValue} value={itemValue}>{labelText}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
