import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Edit3,
  Video,
  Truck,
  Megaphone,
  ListTodo,
  Users,
  MoreHorizontal,
  Check,
  ChevronsUpDown,
} from "lucide-react";

// ─── Client Combobox with search ───
function ClientCombobox({ clients, value, onChange }: { clients: any[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedClient = clients?.find((c: any) => String(c.id) === value);
  return (
    <div>
      <Label>Cliente</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-9 text-sm">
            {selectedClient ? selectedClient.companyName : "Selecionar cliente..."}
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cliente pelo nome..." />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={() => { onChange(""); setOpen(false); }}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
                  Nenhum
                </CommandItem>
                {clients?.map((c: any) => (
                  <CommandItem key={c.id} value={`${c.companyName} ${c.contactName}`} onSelect={() => { onChange(String(c.id)); setOpen(false); }}>
                    <Check className={cn("mr-2 h-3.5 w-3.5", value === String(c.id) ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span>{c.companyName}</span>
                      <span className="text-[10px] text-muted-foreground">{c.contactName}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Collaborator Combobox with search ───
function CollaboratorCombobox({ collaborators, value, onChange }: { collaborators: any[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedCollab = collaborators?.find((c: any) => String(c.id) === value);
  return (
    <div>
      <Label>Responsável</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-9 text-sm">
            {selectedCollab ? selectedCollab.name : "Selecionar responsável..."}
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar responsável..." />
            <CommandList>
              <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={() => { onChange(""); setOpen(false); }}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
                  Nenhum
                </CommandItem>
                {collaborators?.map((c: any) => (
                  <CommandItem key={c.id} onSelect={() => { onChange(String(c.id)); setOpen(false); }}>
                    <Check className={cn("mr-2 h-3.5 w-3.5", value === String(c.id) ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      {c.role && <span className="text-[10px] text-muted-foreground">{c.role}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  addWeeks, subWeeks, format, isSameMonth, isSameDay, isToday,
  startOfDay, endOfDay, addHours, setHours, setMinutes, getHours, getMinutes,
  differenceInMinutes, parseISO, eachDayOfInterval, eachHourOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week" | "day";

const EVENT_TYPES = [
  { value: "meeting", label: "Reunião", icon: Video, color: "#3b82f6" },
  { value: "delivery", label: "Entrega", icon: Truck, color: "#10b981" },
  { value: "recording", label: "Gravação", icon: Video, color: "#8b5cf6" },
  { value: "campaign", label: "Campanha", icon: Megaphone, color: "#f59e0b" },
  { value: "task", label: "Tarefa", icon: ListTodo, color: "#ef4444" },
  { value: "other", label: "Outro", icon: CalendarIcon, color: "#6b7280" },
] as const;

function getEventColor(type: string, customColor?: string | null) {
  if (customColor) return customColor;
  return EVENT_TYPES.find(t => t.value === type)?.color || "#6b7280";
}

function getEventIcon(type: string) {
  const et = EVENT_TYPES.find(t => t.value === type);
  return et?.icon || CalendarIcon;
}

function formatTime(ts: number) {
  return format(new Date(ts), "HH:mm");
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate range for query
  const queryRange = useMemo(() => {
    let start: Date, end: Date;
    if (viewMode === "month") {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    } else if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }
    return { startRange: start.getTime(), endRange: end.getTime() };
  }, [currentDate, viewMode]);

  const { data: events = [], isLoading } = trpc.events.list.useQuery(queryRange, { refetchInterval: 60000 });
  const { data: tasksList = [] } = trpc.tasks.list.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();
  const { data: collabsList = [] } = trpc.collaborators.list.useQuery();
  const utils = trpc.useUtils();

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); toast.success("Evento criado!"); setShowEventDialog(false); },
    onError: () => toast.error("Erro ao criar evento"),
  });
  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); toast.success("Evento atualizado!"); setShowEventDialog(false); },
    onError: () => toast.error("Erro ao atualizar evento"),
  });
  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); toast.success("Evento excluído!"); setShowEventDialog(false); },
    onError: () => toast.error("Erro ao excluir evento"),
  });

  // Merge tasks with deadlines into events
  const allEvents = useMemo(() => {
    const taskEvents = tasksList
      .filter(t => t.dueDate && t.status !== "done")
      .map(t => ({
        id: -t.id,
        title: `\uD83D\uDCCB ${t.title}`,
        description: t.description,
        type: "task" as const,
        startTime: t.dueDate!,
        endTime: t.dueDate! + 60 * 60 * 1000,
        allDay: false,
        clientId: t.clientId,
        collaboratorId: t.collaboratorId,
        taskId: t.id,
        color: "#ef4444",
        createdAt: new Date(),
        updatedAt: new Date(),
        isTask: true,
      }));
    return [...events.map(e => ({ ...e, isTask: false })), ...taskEvents];
  }, [events, tasksList]);

  const navigate = (dir: number) => {
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const goToday = () => setCurrentDate(new Date());

  const openNewEvent = (date?: Date) => {
    setEditingEvent(null);
    setSelectedDate(date || new Date());
    setShowEventDialog(true);
  };

  const openEditEvent = (event: any) => {
    if (event.isTask) return;
    setEditingEvent(event);
    setSelectedDate(new Date(event.startTime));
    setShowEventDialog(true);
  };

  const headerTitle = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, viewMode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Agenda e compromissos
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Calendário</h1>
          <p className="text-muted-foreground text-sm mt-1">Prazos, vencimentos e eventos em uma linha do tempo clara.</p>
        </div>
        <Button onClick={() => openNewEvent()}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Evento
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>Hoje</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-semibold capitalize ml-2">{headerTitle}</h2>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {(["month", "week", "day"] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "month" && <MonthView currentDate={currentDate} events={allEvents} onDayClick={(d) => { setCurrentDate(d); setViewMode("day"); }} onEventClick={openEditEvent} onNewEvent={openNewEvent} />}
          {viewMode === "week" && <WeekView currentDate={currentDate} events={allEvents} onEventClick={openEditEvent} onNewEvent={openNewEvent} />}
          {viewMode === "day" && <DayView currentDate={currentDate} events={allEvents} onEventClick={openEditEvent} onNewEvent={openNewEvent} />}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <EventDialog
        open={showEventDialog}
        onClose={() => setShowEventDialog(false)}
        event={editingEvent}
        defaultDate={selectedDate}
        clients={clientsList}
        collaborators={collabsList}
        onCreate={(data) => createEvent.mutate(data)}
        onUpdate={(data) => updateEvent.mutate(data)}
        onDelete={(id) => deleteEvent.mutate({ id })}
        isLoading={createEvent.isPending || updateEvent.isPending}
      />
    </div>
  );
}

// ─── Month View ───
function MonthView({ currentDate, events, onDayClick, onEventClick, onNewEvent }: { currentDate: Date; events: any[]; onDayClick: (d: Date) => void; onEventClick: (e: any) => void; onNewEvent: (d: Date) => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="border-t">
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = events.filter((e: any) => isSameDay(new Date(e.startTime), day));
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${
                !isCurrentMonth ? "bg-muted/10" : ""
              } ${i % 7 === 0 ? "border-l-0" : ""}`}
              onClick={() => onDayClick(day)}
              onDoubleClick={(e) => { e.stopPropagation(); onNewEvent(day); }}
            >
              <div className={`text-xs font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full ${
                today ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: getEventColor(ev.type, ev.color) + "20", color: getEventColor(ev.type, ev.color), borderLeft: `2px solid ${getEventColor(ev.type, ev.color)}` }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                  >
                    {ev.allDay ? "" : formatTime(ev.startTime) + " "}{ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───
function WeekView({ currentDate, events, onEventClick, onNewEvent }: { currentDate: Date; events: any[]; onEventClick: (e: any) => void; onNewEvent: (d: Date) => void }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="border-t overflow-auto max-h-[600px]">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
        <div className="border-r" />
        {days.map((d, i) => (
          <div key={i} className={`py-2 text-center border-r ${isToday(d) ? "bg-primary/5" : ""}`}>
            <div className="text-[10px] text-muted-foreground uppercase">{format(d, "EEE", { locale: ptBR })}</div>
            <div className={`text-sm font-semibold mt-0.5 ${isToday(d) ? "text-primary" : ""}`}>{format(d, "d")}</div>
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {hours.map(h => (
          <div key={h} className="contents">
            <div className="border-r border-b h-12 flex items-start justify-end pr-2 pt-0.5">
              <span className="text-[10px] text-muted-foreground">{String(h).padStart(2, "0")}:00</span>
            </div>
            {days.map((d, di) => {
              const slotStart = setMinutes(setHours(d, h), 0).getTime();
              const slotEnd = slotStart + 60 * 60 * 1000;
              const slotEvents = events.filter((e: any) => {
                const es = e.startTime;
                return es >= slotStart && es < slotEnd;
              });
              return (
                <div
                  key={di}
                  className={`border-r border-b h-12 relative cursor-pointer hover:bg-muted/20 ${isToday(d) ? "bg-primary/[0.02]" : ""}`}
                  onDoubleClick={() => onNewEvent(setHours(d, h))}
                >
                  {slotEvents.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="absolute inset-x-0.5 top-0.5 text-[10px] px-1 py-0.5 rounded truncate cursor-pointer z-10"
                      style={{ backgroundColor: getEventColor(ev.type, ev.color) + "25", color: getEventColor(ev.type, ev.color), borderLeft: `2px solid ${getEventColor(ev.type, ev.color)}` }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ───
function DayView({ currentDate, events, onEventClick, onNewEvent }: { currentDate: Date; events: any[]; onEventClick: (e: any) => void; onNewEvent: (d: Date) => void }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = events.filter((e: any) => isSameDay(new Date(e.startTime), currentDate));

  return (
    <div className="border-t overflow-auto max-h-[600px]">
      <div className="sticky top-0 bg-background z-10 border-b px-4 py-2">
        <div className="text-sm font-semibold capitalize">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</div>
        <div className="text-xs text-muted-foreground">{dayEvents.length} evento(s)</div>
      </div>
      <div className="grid grid-cols-[60px_1fr]">
        {hours.map(h => {
          const slotStart = setMinutes(setHours(currentDate, h), 0).getTime();
          const slotEnd = slotStart + 60 * 60 * 1000;
          const slotEvents = dayEvents.filter((e: any) => e.startTime >= slotStart && e.startTime < slotEnd);
          return (
            <div key={h} className="contents">
              <div className="border-r border-b h-16 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-muted-foreground">{String(h).padStart(2, "0")}:00</span>
              </div>
              <div
                className="border-b h-16 relative cursor-pointer hover:bg-muted/20 px-2"
                onDoubleClick={() => onNewEvent(setHours(currentDate, h))}
              >
                {slotEvents.map((ev: any) => {
                  const duration = ev.endTime ? Math.max(differenceInMinutes(new Date(ev.endTime), new Date(ev.startTime)), 30) : 60;
                  const topOffset = getMinutes(new Date(ev.startTime));
                  return (
                    <div
                      key={ev.id}
                      className="absolute left-2 right-2 px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity z-10"
                      style={{
                        backgroundColor: getEventColor(ev.type, ev.color) + "20",
                        color: getEventColor(ev.type, ev.color),
                        borderLeft: `3px solid ${getEventColor(ev.type, ev.color)}`,
                        top: `${(topOffset / 60) * 100}%`,
                        minHeight: "24px",
                      }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    >
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="text-[10px] opacity-70">{formatTime(ev.startTime)}{ev.endTime ? ` - ${formatTime(ev.endTime)}` : ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Dialog ───
function EventDialog({ open, onClose, event, defaultDate, clients, collaborators, onCreate, onUpdate, onDelete, isLoading }: { open: boolean; onClose: () => void; event: any; defaultDate: Date | null; clients: any[]; collaborators: any[]; onCreate: (data: any) => void; onUpdate: (data: any) => void; onDelete: (id: number) => void; isLoading: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("meeting");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [collaboratorId, setCollaboratorId] = useState<string>("");
  const [color, setColor] = useState("");

  useMemo(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setType(event.type || "meeting");
      setStartDate(format(new Date(event.startTime), "yyyy-MM-dd"));
      setStartTime(format(new Date(event.startTime), "HH:mm"));
      if (event.endTime) {
        setEndDate(format(new Date(event.endTime), "yyyy-MM-dd"));
        setEndTime(format(new Date(event.endTime), "HH:mm"));
      }
      setAllDay(event.allDay || false);
      setClientId(event.clientId ? String(event.clientId) : "");
      setCollaboratorId(event.collaboratorId ? String(event.collaboratorId) : "");
      setColor(event.color || "");
    } else if (defaultDate) {
      setTitle("");
      setDescription("");
      setType("meeting");
      setStartDate(format(defaultDate, "yyyy-MM-dd"));
      setStartTime(format(defaultDate, "HH:mm"));
      const end = addHours(defaultDate, 1);
      setEndDate(format(end, "yyyy-MM-dd"));
      setEndTime(format(end, "HH:mm"));
      setAllDay(false);
      setClientId("");
      setCollaboratorId("");
      setColor("");
    }
  }, [event, defaultDate, open]);

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    const start = new Date(`${startDate}T${startTime}`).getTime();
    const end = endDate ? new Date(`${endDate}T${endTime}`).getTime() : undefined;

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: type as any,
      startTime: start,
      endTime: end,
      allDay,
      clientId: clientId ? parseInt(clientId) : undefined,
      collaboratorId: collaboratorId ? parseInt(collaboratorId) : undefined,
      color: color || undefined,
    };

    if (event) {
      onUpdate({ id: event.id, ...data });
    } else {
      onCreate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do evento" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={allDay} onCheckedChange={setAllDay} />
                <Label className="text-sm">Dia inteiro</Label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              {!allDay && <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1" />}
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              {!allDay && <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1" />}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ClientCombobox
              clients={clients}
              value={clientId}
              onChange={setClientId}
            />
            <CollaboratorCombobox
              collaborators={collaborators}
              value={collaboratorId}
              onChange={setCollaboratorId}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do evento..." rows={3} />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {event && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(event.id)} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {event ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
