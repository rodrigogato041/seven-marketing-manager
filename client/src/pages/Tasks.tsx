import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, GripVertical, Calendar, User, Building2 } from "lucide-react";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "done";

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: "todo", title: "A Fazer", color: "bg-blue-500" },
  { id: "in_progress", title: "Em Andamento", color: "bg-amber-500" },
  { id: "done", title: "Concluído", color: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };

type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  clientId: string;
  collaboratorId: string;
  dueDate: string;
};

const emptyForm: TaskForm = {
  title: "", description: "", status: "todo", priority: "medium", clientId: "", collaboratorId: "", dueDate: "",
};

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: tasksList } = trpc.tasks.list.useQuery();
  const { data: clientsList } = trpc.clients.list.useQuery();
  const { data: collabsList } = trpc.collaborators.list.useQuery();

  const createMut = trpc.tasks.create.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); setOpen(false); toast.success("Tarefa criada!"); } });
  const updateMut = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.list.invalidate() });
  const reorderMut = trpc.tasks.reorder.useMutation({ onSuccess: () => utils.tasks.list.invalidate() });
  const deleteMut = trpc.tasks.delete.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Tarefa removida!"); } });

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, typeof tasksList> = { todo: [], in_progress: [], done: [] };
    tasksList?.forEach(t => {
      const status = t.status as TaskStatus;
      if (map[status]) map[status]!.push(t);
    });
    return map;
  }, [tasksList]);

  const clientMap = useMemo(() => {
    const m = new Map<number, string>();
    clientsList?.forEach(c => m.set(c.id, c.companyName));
    return m;
  }, [clientsList]);

  const collabMap = useMemo(() => {
    const m = new Map<number, string>();
    collabsList?.forEach(c => m.set(c.id, c.name));
    return m;
  }, [collabsList]);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (draggedId === null) return;
    const task = tasksList?.find(t => t.id === draggedId);
    if (!task || task.status === targetStatus) { setDraggedId(null); return; }

    // Optimistic: update single task status
    updateMut.mutate({ id: draggedId, status: targetStatus });
    setDraggedId(null);
  }, [draggedId, tasksList, updateMut]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  function handleSave() {
    createMut.mutate({
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      clientId: form.clientId ? parseInt(form.clientId) : undefined,
      collaboratorId: form.collaboratorId ? parseInt(form.collaboratorId) : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Producao e entregas
          </div>
          <h1 className="text-2xl font-semibold">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-1">Quadro operacional para acompanhar prioridades e responsáveis.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map(col => (
          <div
            key={col.id}
            className="bg-muted/45 rounded-lg border p-3 min-h-[400px]"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{tasksByColumn[col.id]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {tasksByColumn[col.id]?.map(task => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={e => handleDragStart(e, task.id)}
                  className={`shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${draggedId === task.id ? "opacity-50" : ""}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground truncate">{task.title}</h4>
                          <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
                            {priorityLabels[task.priority]}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          {task.clientId && clientMap.has(task.clientId) && (
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{clientMap.get(task.clientId)}</span>
                          )}
                          {task.collaboratorId && collabMap.has(task.collaboratorId) && (
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{collabMap.get(task.collaboratorId)}</span>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{(() => { const d = new Date(task.dueDate); return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`; })()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}>
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
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {clientsList?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={form.collaboratorId} onValueChange={v => setForm(f => ({ ...f, collaboratorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {collabsList?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title || createMut.isPending}
              >
              {createMut.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
