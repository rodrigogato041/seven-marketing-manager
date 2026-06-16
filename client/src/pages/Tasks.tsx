import { useCallback, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, GripVertical, Calendar, User, Building2, ListChecks, Search, Repeat2, MessageSquare, History, Link as LinkIcon, Paperclip } from "lucide-react";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskRecurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
type ChecklistItem = { id: number; text: string; done: boolean };

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: "todo", title: "A Fazer", color: "bg-blue-500" },
  { id: "in_progress", title: "Em Andamento", color: "bg-amber-500" },
  { id: "done", title: "Concluído", color: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  urgent: "bg-rose-600 text-white",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const taskTypeLabels: Record<string, string> = {
  art: "Arte",
  video: "Vídeo",
  editing: "Edição",
  script: "Roteiro",
  copy: "Copy",
  traffic: "Tráfego",
  service: "Atendimento",
  meeting: "Reunião",
  financial: "Financeiro",
  administrative: "Administrativo",
  publishing: "Publicação",
  report: "Relatório",
  capture: "Captação",
  planning: "Planejamento",
};

const recurrenceLabels: Record<string, string> = {
  none: "Sem recorrência",
  daily: "Diária",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  custom: "Personalizada",
};

type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: string;
  checklist: string;
  recurrence: TaskRecurrence;
  recurrenceEvery: string;
  recurrenceUntil: string;
  relatedLinks: string;
  attachmentLinks: string;
  clientId: string;
  collaboratorId: string;
  dueDate: string;
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  taskType: "administrative",
  checklist: "",
  recurrence: "none",
  recurrenceEvery: "1",
  recurrenceUntil: "",
  relatedLinks: "",
  attachmentLinks: "",
  clientId: "",
  collaboratorId: "",
  dueDate: "",
};

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function inputDate(value?: number | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value?: string | number | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseChecklist(value?: string | null): ChecklistItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(item => item && typeof item.text === "string")
        .map((item, index) => ({
          id: Number(item.id ?? index + 1),
          text: item.text,
          done: Boolean(item.done),
        }));
    }
  } catch {
    return value
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean)
      .map((text, index) => ({ id: index + 1, text, done: false }));
  }
  return [];
}

function parseJsonList(value?: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);
  }
}

function linesToJson(value: string) {
  return JSON.stringify(value.split("\n").map(item => item.trim()).filter(Boolean));
}

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const utils = trpc.useUtils();
  const { data: tasksList = [] } = trpc.tasks.list.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();
  const { data: collabsList = [] } = trpc.collaborators.list.useQuery();

  const createMut = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      toast.success("Tarefa criada!");
    },
  });
  const updateMut = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });
  const deleteMut = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Tarefa removida!");
    },
  });
  const addCommentMut = trpc.tasks.addComment.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setCommentText("");
      toast.success("Comentário adicionado!");
    },
  });

  const clientMap = useMemo(() => {
    const map = new Map<number, string>();
    clientsList.forEach(client => map.set(client.id, client.companyName));
    return map;
  }, [clientsList]);

  const collabMap = useMemo(() => {
    const map = new Map<number, string>();
    collabsList.forEach(collaborator => map.set(collaborator.id, collaborator.name));
    return map;
  }, [collabsList]);

  const filteredTasks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tasksList.filter(task => {
      const clientName = task.clientId ? clientMap.get(task.clientId) : "";
      const collaboratorName = task.collaboratorId ? collabMap.get(task.collaboratorId) : "";
      const matchesSearch = !term || [
        task.title,
        task.description,
        task.status,
        task.priority,
        task.taskType,
        clientName,
        collaboratorName,
      ].some(value => String(value ?? "").toLowerCase().includes(term));
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesType = typeFilter === "all" || (task.taskType ?? "administrative") === typeFilter;
      return matchesSearch && matchesPriority && matchesType;
    });
  }, [tasksList, searchTerm, priorityFilter, typeFilter, clientMap, collabMap]);

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, typeof filteredTasks> = { todo: [], in_progress: [], done: [] };
    filteredTasks.forEach(task => {
      const status = task.status as TaskStatus;
      if (map[status]) map[status].push(task);
    });
    return map;
  }, [filteredTasks]);
  const selectedTask = selectedTaskId ? tasksList.find(task => task.id === selectedTaskId) : null;
  const selectedComments = selectedTask ? parseJsonList(selectedTask.comments) : [];
  const selectedHistory = selectedTask ? parseJsonList(selectedTask.history) : [];
  const selectedRelatedLinks = selectedTask ? parseJsonList(selectedTask.relatedLinks) : [];
  const selectedAttachmentLinks = selectedTask ? parseJsonList(selectedTask.attachmentLinks) : [];

  const handleDragStart = useCallback((event: React.DragEvent, taskId: number) => {
    setDraggedId(taskId);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback((event: React.DragEvent, targetStatus: TaskStatus) => {
    event.preventDefault();
    if (draggedId === null) return;
    const task = tasksList.find(item => item.id === draggedId);
    if (!task || task.status === targetStatus) {
      setDraggedId(null);
      return;
    }
    updateMut.mutate({ id: draggedId, status: targetStatus });
    setDraggedId(null);
  }, [draggedId, tasksList, updateMut]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  function handleSave() {
    const checklist = form.checklist
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean)
      .map((text, index) => ({ id: index + 1, text, done: false }));

    createMut.mutate({
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      taskType: form.taskType as any,
      checklist: JSON.stringify(checklist),
      recurrence: form.recurrence,
      recurrenceEvery: parseInt(form.recurrenceEvery) || 1,
      recurrenceUntil: form.recurrenceUntil ? parseLocalDate(form.recurrenceUntil) : undefined,
      relatedLinks: linesToJson(form.relatedLinks),
      attachmentLinks: linesToJson(form.attachmentLinks),
      clientId: form.clientId ? parseInt(form.clientId) : undefined,
      collaboratorId: form.collaboratorId ? parseInt(form.collaboratorId) : undefined,
      dueDate: form.dueDate ? parseLocalDate(form.dueDate) : undefined,
    });
  }

  function toggleChecklistItem(task: any, itemId: number) {
    const checklist = parseChecklist(task.checklist);
    const nextChecklist = checklist.map(item => item.id === itemId ? { ...item, done: !item.done } : item);
    updateMut.mutate({ id: task.id, checklist: JSON.stringify(nextChecklist) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Produção e entregas
          </div>
          <h1 className="text-2xl font-semibold">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-1">Quadro operacional para acompanhar prioridades, tipos e responsáveis.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-3 md:grid-cols-[1fr_180px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="pl-9"
              placeholder="Buscar tarefa, cliente, responsável ou descrição"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(taskTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {columns.map(column => (
          <div
            key={column.id}
            className="min-h-[420px] rounded-lg border bg-muted/45 p-3"
            onDragOver={handleDragOver}
            onDrop={event => handleDrop(event, column.id)}
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <div className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
              <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
              <span className="ml-auto text-xs text-muted-foreground">{tasksByColumn[column.id].length}</span>
            </div>
            <div className="space-y-2">
              {tasksByColumn[column.id].map(task => {
                const checklist = parseChecklist(task.checklist);
                const comments = parseJsonList(task.comments);
                const relatedLinks = parseJsonList(task.relatedLinks);
                const attachmentLinks = parseJsonList(task.attachmentLinks);
                const doneCount = checklist.filter(item => item.done).length;
                const progress = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
                const taskType = task.taskType ?? "administrative";
                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={event => handleDragStart(event, task.id)}
                    className={`cursor-grab shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${draggedId === task.id ? "opacity-50" : ""}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="min-w-0 text-sm font-medium text-foreground">{task.title}</h4>
                            <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority] ?? priorityColors.medium}`}>
                              {priorityLabels[task.priority] ?? "Média"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="bg-white text-[10px]">
                              {taskTypeLabels[taskType] ?? "Administrativo"}
                            </Badge>
                            {task.recurrence && task.recurrence !== "none" ? (
                              <Badge variant="outline" className="bg-white text-[10px]">
                                <Repeat2 className="h-3 w-3" /> {recurrenceLabels[task.recurrence]}
                              </Badge>
                            ) : null}
                            {task.dueDate && (
                              <Badge variant="outline" className="bg-white text-[10px]">
                                <Calendar className="h-3 w-3" /> {formatDate(task.dueDate)}
                              </Badge>
                            )}
                          </div>
                          {task.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            {task.clientId && clientMap.has(task.clientId) ? (
                              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{clientMap.get(task.clientId)}</span>
                            ) : null}
                            {task.collaboratorId && collabMap.has(task.collaboratorId) ? (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />{collabMap.get(task.collaboratorId)}</span>
                            ) : null}
                            {comments.length > 0 ? <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{comments.length}</span> : null}
                            {relatedLinks.length + attachmentLinks.length > 0 ? <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" />{relatedLinks.length + attachmentLinks.length}</span> : null}
                          </div>

                          {checklist.length > 0 ? (
                            <div className="rounded-md border bg-muted/20 p-2">
                              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium"><ListChecks className="h-3 w-3" /> Checklist</span>
                                <span>{doneCount}/{checklist.length} · {progress}%</span>
                              </div>
                              <div className="space-y-1.5">
                                {checklist.slice(0, 5).map(item => (
                                  <label key={item.id} className="flex cursor-pointer items-start gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={item.done}
                                      onChange={() => toggleChecklistItem(task, item.id)}
                                      onClick={event => event.stopPropagation()}
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-border"
                                    />
                                    <span className={item.done ? "text-muted-foreground line-through" : "text-foreground"}>{item.text}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              Detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => deleteMut.mutate({ id: task.id })}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedTask} onOpenChange={openState => !openState && setSelectedTaskId(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          {selectedTask ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selectedTask.status} onValueChange={value => updateMut.mutate({ id: selectedTask.id, status: value as TaskStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">A Fazer</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="done">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={selectedTask.priority} onValueChange={value => updateMut.mutate({ id: selectedTask.id, priority: value as TaskPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={selectedTask.collaboratorId ? String(selectedTask.collaboratorId) : "none"}
                      onValueChange={value => updateMut.mutate({ id: selectedTask.id, collaboratorId: value === "none" ? null : Number(value) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {collabsList.map(collaborator => <SelectItem key={collaborator.id} value={String(collaborator.id)}>{collaborator.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo</Label>
                    <Input
                      type="date"
                      value={inputDate(selectedTask.dueDate)}
                      onChange={event => updateMut.mutate({ id: selectedTask.id, dueDate: event.target.value ? parseLocalDate(event.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Repeat2 className="h-4 w-4 text-primary" />
                      Recorrência
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {recurrenceLabels[selectedTask.recurrence ?? "none"] ?? "Sem recorrência"}
                      {selectedTask.recurrence && selectedTask.recurrence !== "none" ? ` · a cada ${selectedTask.recurrenceEvery ?? 1}` : ""}
                      {selectedTask.recurrenceUntil ? ` · até ${formatDate(selectedTask.recurrenceUntil)}` : ""}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Comentários
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedComments.length} comentário(s) interno(s)</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Comentários internos
                    </div>
                    <div className="space-y-2">
                      {selectedComments.length === 0 ? (
                        <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">Nenhum comentário registrado.</p>
                      ) : (
                        selectedComments.slice().reverse().map((comment: any) => (
                          <div key={comment.id} className="rounded-lg border bg-white p-3">
                            <p className="text-sm">{comment.text}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">{comment.author} · {formatDateTime(comment.createdAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <Textarea
                      value={commentText}
                      onChange={event => setCommentText(event.target.value)}
                      rows={3}
                      placeholder="Adicionar comentário interno"
                    />
                    <Button
                      size="sm"
                      disabled={!commentText.trim() || addCommentMut.isPending}
                      onClick={() => addCommentMut.mutate({ id: selectedTask.id, text: commentText.trim() })}
                    >
                      Adicionar comentário
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <History className="h-4 w-4 text-primary" />
                        Histórico
                      </div>
                      <div className="space-y-2">
                        {selectedHistory.length === 0 ? (
                          <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">Nenhuma alteração registrada.</p>
                        ) : (
                          selectedHistory.slice().reverse().slice(0, 8).map((entry: any) => (
                            <div key={entry.id} className="rounded-lg border bg-white p-3">
                              <p className="text-sm font-medium">{entry.action}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <LinkIcon className="h-4 w-4 text-primary" />
                        Links relacionados
                      </div>
                      {selectedRelatedLinks.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum link relacionado.</p> : (
                        <div className="space-y-1">
                          {selectedRelatedLinks.map((link: string) => (
                            <a key={link} href={link} target="_blank" rel="noreferrer" className="block truncate rounded-md border bg-white px-3 py-2 text-xs text-primary hover:underline">{link}</a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Paperclip className="h-4 w-4 text-primary" />
                        Arquivos e anexos
                      </div>
                      {selectedAttachmentLinks.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum anexo por link.</p> : (
                        <div className="space-y-1">
                          {selectedAttachmentLinks.map((link: string) => (
                            <a key={link} href={link} target="_blank" rel="noreferrer" className="block truncate rounded-md border bg-white px-3 py-2 text-xs text-primary hover:underline">{link}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTaskId(null)}>Fechar</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={value => setForm(current => ({ ...current, status: value as TaskStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={value => setForm(current => ({ ...current, priority: value as TaskPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de tarefa</Label>
              <Select value={form.taskType} onValueChange={value => setForm(current => ({ ...current, taskType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(taskTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clientId} onValueChange={value => setForm(current => ({ ...current, clientId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {clientsList.map(client => <SelectItem key={client.id} value={String(client.id)}>{client.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={form.collaboratorId} onValueChange={value => setForm(current => ({ ...current, collaboratorId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {collabsList.map(collaborator => <SelectItem key={collaborator.id} value={String(collaborator.id)}>{collaborator.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={form.dueDate} onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={value => setForm(current => ({ ...current, recurrence: value as TaskRecurrence }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrência</SelectItem>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repetir a cada</Label>
                <Input type="number" min="1" value={form.recurrenceEvery} onChange={event => setForm(current => ({ ...current, recurrenceEvery: event.target.value }))} />
              </div>
            </div>
            {form.recurrence !== "none" ? (
              <div className="space-y-2">
                <Label>Repetir até</Label>
                <Input type="date" value={form.recurrenceUntil} onChange={event => setForm(current => ({ ...current, recurrenceUntil: event.target.value }))} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Checklist</Label>
              <Textarea
                value={form.checklist}
                onChange={event => setForm(current => ({ ...current, checklist: event.target.value }))}
                rows={4}
                placeholder="Um item por linha"
              />
            </div>
            <div className="space-y-2">
              <Label>Links relacionados</Label>
              <Textarea
                value={form.relatedLinks}
                onChange={event => setForm(current => ({ ...current, relatedLinks: event.target.value }))}
                rows={2}
                placeholder="Um link por linha"
              />
            </div>
            <div className="space-y-2">
              <Label>Anexos por link</Label>
              <Textarea
                value={form.attachmentLinks}
                onChange={event => setForm(current => ({ ...current, attachmentLinks: event.target.value }))}
                rows={2}
                placeholder="Drive, arquivo, briefing ou referência"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title || createMut.isPending}>
              {createMut.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
