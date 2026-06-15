import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Banknote,
  CalendarPlus,
  CreditCard,
  Film,
  Plus,
  Receipt,
  TrendingUp,
  UserCog,
  Users,
  ClipboardList,
} from "lucide-react";
import type { ElementType } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type QuickCreateType =
  | "client"
  | "task"
  | "expense"
  | "payment"
  | "event"
  | "production"
  | "investment"
  | "card"
  | "collaborator";

const actionLabels: Record<QuickCreateType, string> = {
  client: "Novo cliente",
  task: "Nova tarefa",
  expense: "Nova despesa",
  payment: "Novo pagamento",
  event: "Novo evento",
  production: "Nova produção",
  investment: "Novo investimento",
  card: "Nova compra no cartão",
  collaborator: "Novo colaborador",
};

const actions: { type: QuickCreateType; icon: ElementType }[] = [
  { type: "client", icon: Users },
  { type: "task", icon: ClipboardList },
  { type: "expense", icon: Receipt },
  { type: "payment", icon: Banknote },
  { type: "event", icon: CalendarPlus },
  { type: "production", icon: Film },
  { type: "investment", icon: TrendingUp },
  { type: "card", icon: CreditCard },
  { type: "collaborator", icon: UserCog },
];

const taskTypes = [
  ["art", "Arte"],
  ["video", "Vídeo"],
  ["editing", "Edição"],
  ["script", "Roteiro"],
  ["copy", "Copy"],
  ["traffic", "Tráfego"],
  ["service", "Atendimento"],
  ["meeting", "Reunião"],
  ["financial", "Financeiro"],
  ["administrative", "Administrativo"],
  ["publishing", "Publicação"],
  ["report", "Relatório"],
  ["capture", "Captação"],
  ["planning", "Planejamento"],
] as const;

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function parseDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour = 9, minute = 0] = time.split(":").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function emptyForm() {
  return {
    title: "",
    description: "",
    companyName: "",
    contactName: "",
    clientId: "",
    collaboratorId: "",
    amount: "",
    category: "",
    date: todayInput(),
    time: "09:00",
    month: monthInput(),
    videosProduced: "0",
    imagesProduced: "0",
    priority: "medium",
    taskType: "administrative",
    checklist: "",
    status: "pending",
    role: "",
    type: "fixed",
    monthlyCost: "",
  };
}

export function QuickCreateMenu({ compact = false }: { compact?: boolean }) {
  const [activeType, setActiveType] = useState<QuickCreateType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: collaborators = [] } = trpc.collaborators.list.useQuery();

  const invalidateCore = async () => {
    await Promise.all([
      utils.dashboard.stats.invalidate(),
      utils.dashboard.today.invalidate(),
      utils.dashboard.revenueVsExpenses.invalidate(),
      utils.notifications.list.invalidate(),
      utils.notifications.unreadCount.invalidate(),
    ]);
  };

  const close = () => {
    setActiveType(null);
    setForm(emptyForm());
  };

  const onSuccess = async (message: string, extra?: () => Promise<unknown> | unknown) => {
    if (extra) await extra();
    await invalidateCore();
    toast.success(message);
    close();
  };

  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => onSuccess("Cliente criado!", () => utils.clients.list.invalidate()),
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => onSuccess("Tarefa criada!", () => utils.tasks.list.invalidate()),
  });
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => onSuccess("Despesa registrada!", () => utils.expenses.list.invalidate()),
  });
  const createPayment = trpc.payments.create.useMutation({
    onSuccess: () => onSuccess("Pagamento criado!", () => utils.payments.list.invalidate()),
  });
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => onSuccess("Evento criado!", () => utils.events.list.invalidate()),
  });
  const createInvestment = trpc.investments.create.useMutation({
    onSuccess: () => onSuccess("Investimento registrado!", async () => {
      await utils.investments.list.invalidate();
      await utils.investments.getSummary.invalidate();
    }),
  });
  const createCard = trpc.creditCard.create.useMutation({
    onSuccess: () => onSuccess("Compra registrada!", async () => {
      await utils.creditCard.list.invalidate();
      await utils.creditCard.getSummary.invalidate();
    }),
  });
  const createCollaborator = trpc.collaborators.create.useMutation({
    onSuccess: () => onSuccess("Colaborador criado!", () => utils.collaborators.list.invalidate()),
  });
  const upsertProduction = trpc.contentProduction.upsert.useMutation({
    onSuccess: () => onSuccess("Produção atualizada!", () => utils.contentProduction.get.invalidate()),
  });

  const isSaving = [
    createClient,
    createTask,
    createExpense,
    createPayment,
    createEvent,
    createInvestment,
    createCard,
    createCollaborator,
    upsertProduction,
  ].some(mutation => mutation.isPending);

  const canSave = useMemo(() => {
    if (!activeType) return false;
    if (activeType === "client") return form.companyName.trim().length > 0;
    if (activeType === "task") return form.title.trim().length > 0;
    if (activeType === "expense") return form.amount && form.category.trim();
    if (activeType === "payment") return form.clientId && form.amount;
    if (activeType === "event") return form.title.trim().length > 0;
    if (activeType === "production") return form.clientId && form.month;
    if (activeType === "investment") return form.title.trim() && form.amount;
    if (activeType === "card") return form.title.trim() && form.amount && form.category.trim();
    if (activeType === "collaborator") return form.title.trim() && form.role.trim();
    return false;
  }, [activeType, form]);

  const openAction = (type: QuickCreateType) => {
    setForm(emptyForm());
    setActiveType(type);
  };

  const submit = () => {
    if (!activeType) return;

    if (activeType === "client") {
      createClient.mutate({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim() || form.companyName.trim(),
        monthlyValue: form.amount || "0",
        status: "active",
      });
      return;
    }

    if (activeType === "task") {
      const checklist = form.checklist
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean)
        .map((text, index) => ({ id: index + 1, text, done: false }));
      createTask.mutate({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority as any,
        taskType: form.taskType as any,
        checklist: JSON.stringify(checklist),
        clientId: form.clientId ? Number(form.clientId) : undefined,
        collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : undefined,
        dueDate: form.date ? parseLocalDate(form.date) : undefined,
      });
      return;
    }

    if (activeType === "expense") {
      createExpense.mutate({
        amount: form.amount,
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        date: parseLocalDate(form.date),
      });
      return;
    }

    if (activeType === "payment") {
      createPayment.mutate({
        clientId: Number(form.clientId),
        amount: form.amount,
        dueDate: parseLocalDate(form.date),
        description: form.description.trim() || undefined,
        status: "pending",
      });
      return;
    }

    if (activeType === "event") {
      createEvent.mutate({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: "meeting",
        startTime: parseDateTime(form.date, form.time),
        clientId: form.clientId ? Number(form.clientId) : undefined,
        collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : undefined,
      });
      return;
    }

    if (activeType === "production") {
      upsertProduction.mutate({
        clientId: Number(form.clientId),
        month: form.month,
        videosProduced: Number(form.videosProduced) || 0,
        imagesProduced: Number(form.imagesProduced) || 0,
      });
      return;
    }

    if (activeType === "investment") {
      createInvestment.mutate({
        name: form.title.trim(),
        amount: form.amount,
        type: form.type as "fixed" | "variable",
        description: form.description.trim() || undefined,
        date: parseLocalDate(form.date),
      });
      return;
    }

    if (activeType === "card") {
      createCard.mutate({
        description: form.title.trim(),
        amount: form.amount,
        category: form.category.trim(),
        transactionDate: parseLocalDate(form.date),
        status: form.status as "pending" | "paid",
      });
      return;
    }

    if (activeType === "collaborator") {
      createCollaborator.mutate({
        name: form.title.trim(),
        role: form.role.trim(),
        type: form.type as "fixed" | "freelancer",
        monthlyCost: form.monthlyCost || "0",
        status: "active",
      });
    }
  };

  const title = activeType ? actionLabels[activeType] : "Novo registro";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={compact ? "icon" : "default"} className={compact ? "h-9 w-9" : "h-9 gap-2"}>
            <Plus className="h-4 w-4" />
            {!compact ? <span>Novo</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem key={action.type} onClick={() => openAction(action.type)} className="gap-2">
                <Icon className="h-4 w-4" />
                {actionLabels[action.type]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!activeType} onOpenChange={open => !open && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2 pr-1">
            {activeType === "client" ? (
              <>
                <Field label="Empresa" value={form.companyName} onChange={value => setForm(f => ({ ...f, companyName: value }))} />
                <Field label="Responsável" value={form.contactName} onChange={value => setForm(f => ({ ...f, contactName: value }))} />
                <Field label="Valor mensal" type="number" value={form.amount} onChange={value => setForm(f => ({ ...f, amount: value }))} />
              </>
            ) : null}

            {activeType === "task" ? (
              <>
                <Field label="Título" value={form.title} onChange={value => setForm(f => ({ ...f, title: value }))} />
                <TextareaField label="Descrição" value={form.description} onChange={value => setForm(f => ({ ...f, description: value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Prioridade" value={form.priority} onChange={value => setForm(f => ({ ...f, priority: value }))} items={[
                    ["low", "Baixa"],
                    ["medium", "Média"],
                    ["high", "Alta"],
                    ["urgent", "Urgente"],
                  ]} />
                  <SelectField label="Tipo" value={form.taskType} onChange={value => setForm(f => ({ ...f, taskType: value }))} items={taskTypes as any} />
                </div>
                <ClientSelect clients={clients} value={form.clientId} onChange={value => setForm(f => ({ ...f, clientId: value }))} />
                <CollaboratorSelect collaborators={collaborators} value={form.collaboratorId} onChange={value => setForm(f => ({ ...f, collaboratorId: value }))} />
                <Field label="Prazo" type="date" value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} />
                <TextareaField label="Checklist" placeholder="Um item por linha" value={form.checklist} onChange={value => setForm(f => ({ ...f, checklist: value }))} />
              </>
            ) : null}

            {activeType === "expense" ? (
              <>
                <Field label="Valor" type="number" value={form.amount} onChange={value => setForm(f => ({ ...f, amount: value }))} />
                <Field label="Categoria" value={form.category} onChange={value => setForm(f => ({ ...f, category: value }))} />
                <Field label="Data" type="date" value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} />
                <TextareaField label="Descrição" value={form.description} onChange={value => setForm(f => ({ ...f, description: value }))} />
              </>
            ) : null}

            {activeType === "payment" ? (
              <>
                <ClientSelect clients={clients} value={form.clientId} onChange={value => setForm(f => ({ ...f, clientId: value }))} />
                <Field label="Valor" type="number" value={form.amount} onChange={value => setForm(f => ({ ...f, amount: value }))} />
                <Field label="Vencimento" type="date" value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} />
                <TextareaField label="Descrição" value={form.description} onChange={value => setForm(f => ({ ...f, description: value }))} />
              </>
            ) : null}

            {activeType === "event" ? (
              <>
                <Field label="Título" value={form.title} onChange={value => setForm(f => ({ ...f, title: value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Data" type="date" value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} />
                  <Field label="Horário" type="time" value={form.time} onChange={value => setForm(f => ({ ...f, time: value }))} />
                </div>
                <ClientSelect clients={clients} value={form.clientId} onChange={value => setForm(f => ({ ...f, clientId: value }))} />
                <CollaboratorSelect collaborators={collaborators} value={form.collaboratorId} onChange={value => setForm(f => ({ ...f, collaboratorId: value }))} />
                <TextareaField label="Descrição" value={form.description} onChange={value => setForm(f => ({ ...f, description: value }))} />
              </>
            ) : null}

            {activeType === "production" ? (
              <>
                <ClientSelect clients={clients} value={form.clientId} onChange={value => setForm(f => ({ ...f, clientId: value }))} />
                <Field label="Mês" type="month" value={form.month} onChange={value => setForm(f => ({ ...f, month: value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vídeos produzidos" type="number" value={form.videosProduced} onChange={value => setForm(f => ({ ...f, videosProduced: value }))} />
                  <Field label="Imagens produzidas" type="number" value={form.imagesProduced} onChange={value => setForm(f => ({ ...f, imagesProduced: value }))} />
                </div>
              </>
            ) : null}

            {activeType === "investment" ? (
              <>
                <Field label="Nome" value={form.title} onChange={value => setForm(f => ({ ...f, title: value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Valor" type="number" value={form.amount} onChange={value => setForm(f => ({ ...f, amount: value }))} />
                  <SelectField label="Tipo" value={form.type} onChange={value => setForm(f => ({ ...f, type: value }))} items={[
                    ["fixed", "Renda fixa"],
                    ["variable", "Renda variável"],
                  ]} />
                </div>
                <Field label="Data" type="date" value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} />
                <TextareaField label="Descrição" value={form.description} onChange={value => setForm(f => ({ ...f, description: value }))} />
              </>
            ) : null}

            {activeType === "card" ? (
              <>
                <Field label="Descrição" value={form.title} onChange={value => setForm(f => ({ ...f, title: value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Valor" type="number" value={form.amount} onChange={value => setForm(f => ({ ...f, amount: value }))} />
                  <Field label="Categoria" value={form.category} onChange={value => setForm(f => ({ ...f, category: value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Data" type="date" value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} />
                  <SelectField label="Status" value={form.status} onChange={value => setForm(f => ({ ...f, status: value }))} items={[
                    ["pending", "Pendente"],
                    ["paid", "Pago"],
                  ]} />
                </div>
              </>
            ) : null}

            {activeType === "collaborator" ? (
              <>
                <Field label="Nome" value={form.title} onChange={value => setForm(f => ({ ...f, title: value }))} />
                <Field label="Função" value={form.role} onChange={value => setForm(f => ({ ...f, role: value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Tipo" value={form.type} onChange={value => setForm(f => ({ ...f, type: value }))} items={[
                    ["fixed", "Fixo"],
                    ["freelancer", "Freelancer"],
                  ]} />
                  <Field label="Custo mensal" type="number" value={form.monthlyCost} onChange={value => setForm(f => ({ ...f, monthlyCost: value }))} />
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={!canSave || isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value} placeholder={placeholder} rows={3} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: readonly (readonly [string, string])[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map(([itemValue, labelText]) => (
            <SelectItem key={itemValue} value={itemValue}>{labelText}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ClientSelect({ clients, value, onChange }: { clients: any[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Cliente</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
        <SelectContent>
          {clients.map(client => (
            <SelectItem key={client.id} value={String(client.id)}>{client.companyName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CollaboratorSelect({ collaborators, value, onChange }: { collaborators: any[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Colaborador</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecionar colaborador" /></SelectTrigger>
        <SelectContent>
          {collaborators.map(collaborator => (
            <SelectItem key={collaborator.id} value={String(collaborator.id)}>{collaborator.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
