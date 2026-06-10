import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, UserCog, Phone, Mail, Pencil, Trash2, CalendarDays, AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: string | number | null) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getPaymentStatus(paymentDay: number | null) {
  if (!paymentDay) return null;
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const effectiveDay = Math.min(paymentDay, daysInMonth);
  const diff = effectiveDay - currentDay;
  if (diff < 0) return { label: "Vencido", color: "text-red-600 bg-red-50 border-red-200", icon: "red" };
  if (diff <= 3) return { label: "Próximo", color: "text-amber-600 bg-amber-50 border-amber-200", icon: "yellow" };
  return { label: "Em dia", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: "green" };
}

type CollabForm = {
  name: string;
  role: string;
  phone: string;
  email: string;
  type: "freelancer" | "fixed";
  monthlyCost: string;
  paymentDay: string;
  status: "active" | "inactive";
};

const emptyForm: CollabForm = {
  name: "", role: "", phone: "", email: "", type: "fixed", monthlyCost: "0", paymentDay: "", status: "active",
};

export default function CollaboratorsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CollabForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: collabs, isLoading } = trpc.collaborators.list.useQuery();
  const createMut = trpc.collaborators.create.useMutation({ onSuccess: () => { utils.collaborators.list.invalidate(); setOpen(false); toast.success("Colaborador adicionado!"); } });
  const updateMut = trpc.collaborators.update.useMutation({ onSuccess: () => { utils.collaborators.list.invalidate(); setOpen(false); toast.success("Colaborador atualizado!"); } });
  const deleteMut = trpc.collaborators.delete.useMutation({ onSuccess: () => { utils.collaborators.list.invalidate(); toast.success("Colaborador removido!"); } });
  const uploadPhotoMut = trpc.collaborators.uploadPhoto.useMutation({ onSuccess: () => { utils.collaborators.list.invalidate(); toast.success("Foto atualizada!"); } });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<number | null>(null);

  const filtered = collabs?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  function openNew() { setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(c: any) {
    setEditId(c.id);
    setForm({
      name: c.name, role: c.role, phone: c.phone || "", email: c.email || "",
      type: c.type, monthlyCost: c.monthlyCost || "0",
      paymentDay: c.paymentDay ? String(c.paymentDay) : "", status: c.status,
    });
    setOpen(true);
  }

  function handleSave() {
    const payload = {
      name: form.name, role: form.role,
      phone: form.phone || undefined, email: form.email || undefined,
      type: form.type, monthlyCost: form.monthlyCost,
      paymentDay: form.paymentDay ? parseInt(form.paymentDay) : undefined,
      status: form.status,
    };
    if (editId) updateMut.mutate({ id: editId, ...payload, paymentDay: form.paymentDay ? parseInt(form.paymentDay) : null });
    else createMut.mutate(payload);
  }

  function handlePhotoUpload(collabId: number) {
    setUploadingPhotoId(collabId);
    photoInputRef.current?.click();
  }

  async function onPhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingPhotoId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhotoMut.mutate({
        id: uploadingPhotoId,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPhotoFileChange} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground text-sm mt-1">Equipe e freelancers da agência</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Colaborador
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar colaboradores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum colaborador encontrado</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Adicione membros da equipe</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const payStatus = getPaymentStatus(c.paymentDay);
            return (
              <Card key={c.id} className="shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                        {c.photoUrl && <AvatarImage src={c.photoUrl} alt={c.name} />}
                        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-700 text-xs font-bold">
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={() => handlePhotoUpload(c.id)}
                        title="Alterar foto"
                      >
                        <Camera className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                          <p className="text-sm text-muted-foreground">{c.role}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">
                            {c.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {c.type === "freelancer" ? "Freelancer" : "Fixo"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
                    {c.paymentDay && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>Pagamento: dia {c.paymentDay}</span>
                        {payStatus && c.status === "active" && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${payStatus.color}`}>
                            {payStatus.icon === "red" && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                            {payStatus.label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-lg font-bold text-foreground">{formatCurrency(c.monthlyCost)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate({ id: c.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Função *</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Editor de vídeo" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custo Mensal (R$)</Label>
              <Input type="number" value={form.monthlyCost} onChange={e => setForm(f => ({ ...f, monthlyCost: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Dia de Pagamento</Label>
              <Input
                type="number" min={1} max={31} placeholder="Ex: 10"
                value={form.paymentDay}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
                    setForm(f => ({ ...f, paymentDay: val }));
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Dia do mês (1-31) para pagamento</p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.role || createMut.isPending || updateMut.isPending}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
              {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
