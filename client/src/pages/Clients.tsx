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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, Phone, Mail, Pencil, Trash2, Camera } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ClientHealthBadge, ClientIntelligenceDashboard } from "@/components/ClientIntelligenceDashboard";

function formatCurrency(value: string | number | null) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function formatInputDate(value?: number | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

type ClientForm = {
  companyName: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string;
  monthlyValue: string;
  startDate: string;
  contractRenewalDate: string;
  contractEndDate: string;
  contractPaymentMethod: string;
  contractDueDay: string;
  contractAdjustment: string;
  contractNotes: string;
  contractStatus: "active" | "pending" | "expired" | "cancelled";
  status: "active" | "paused" | "cancelled";
  metaAds: boolean;
  googleAds: boolean;
  socialMedia: boolean;
  videoQuantity: string;
  imageQuantity: string;
  otherServices: string;
  notes: string;
};

const emptyForm: ClientForm = {
  companyName: "", contactName: "", phone: "", whatsapp: "", email: "",
  monthlyValue: "0", startDate: "", status: "active",
  contractRenewalDate: "", contractEndDate: "", contractPaymentMethod: "",
  contractDueDay: "", contractAdjustment: "", contractNotes: "", contractStatus: "pending",
  metaAds: false, googleAds: false, socialMedia: false,
  videoQuantity: "0", imageQuantity: "0", otherServices: "", notes: "",
};

export default function ClientsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: clientsList, isLoading } = trpc.clients.list.useQuery();
  const { data: intelligence } = trpc.clients.intelligence.useQuery(undefined, { refetchInterval: 30000 });
  const refreshClientViews = () => {
    utils.clients.list.invalidate();
    utils.clients.intelligence.invalidate();
    utils.dashboard.today.invalidate();
  };
  const createMutation = trpc.clients.create.useMutation({ onSuccess: () => { refreshClientViews(); setOpen(false); toast.success("Cliente criado com sucesso!"); } });
  const updateMutation = trpc.clients.update.useMutation({ onSuccess: () => { refreshClientViews(); setOpen(false); toast.success("Cliente atualizado!"); } });
  const deleteMutation = trpc.clients.delete.useMutation({ onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente removido!"); } });
  const uploadLogoMutation = trpc.clients.uploadLogo.useMutation({ onSuccess: () => { utils.clients.list.invalidate(); toast.success("Logo atualizada!"); } });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogoId, setUploadingLogoId] = useState<number | null>(null);

  const filtered = clientsList?.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];
  const healthMap = new Map((intelligence?.health ?? []).map(item => [item.clientId, item]));

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: any) {
    setEditId(c.id);
    setForm({
      companyName: c.companyName,
      contactName: c.contactName,
      phone: c.phone || "",
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      monthlyValue: c.monthlyValue || "0",
      startDate: formatInputDate(c.startDate),
      contractRenewalDate: formatInputDate(c.contractRenewalDate),
      contractEndDate: formatInputDate(c.contractEndDate),
      contractPaymentMethod: c.contractPaymentMethod || "",
      contractDueDay: c.contractDueDay ? String(c.contractDueDay) : "",
      contractAdjustment: c.contractAdjustment || "",
      contractNotes: c.contractNotes || "",
      contractStatus: c.contractStatus || "pending",
      status: c.status,
      metaAds: c.metaAds,
      googleAds: c.googleAds,
      socialMedia: c.socialMedia,
      videoQuantity: String(c.videoQuantity || 0),
      imageQuantity: String(c.imageQuantity || 0),
      otherServices: c.otherServices || "",
      notes: c.notes || "",
    });
    setOpen(true);
  }

  function handleSave() {
    const payload = {
      companyName: form.companyName,
      contactName: form.contactName,
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      monthlyValue: form.monthlyValue,
      startDate: form.startDate ? parseLocalDate(form.startDate) : undefined,
      contractRenewalDate: form.contractRenewalDate ? parseLocalDate(form.contractRenewalDate) : null,
      contractEndDate: form.contractEndDate ? parseLocalDate(form.contractEndDate) : null,
      contractPaymentMethod: form.contractPaymentMethod || null,
      contractDueDay: form.contractDueDay ? parseInt(form.contractDueDay) : null,
      contractAdjustment: form.contractAdjustment || null,
      contractNotes: form.contractNotes || null,
      contractStatus: form.contractStatus,
      status: form.status,
      metaAds: form.metaAds,
      googleAds: form.googleAds,
      socialMedia: form.socialMedia,
      videoQuantity: parseInt(form.videoQuantity) || 0,
      imageQuantity: parseInt(form.imageQuantity) || 0,
      otherServices: form.otherServices || undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleLogoUpload(clientId: number) {
    setUploadingLogoId(clientId);
    logoInputRef.current?.click();
  }

  async function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingLogoId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogoMutation.mutate({
        id: uploadingLogoId,
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
      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onLogoFileChange} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Relacionamento e contratos
          </div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Carteira, contratos e serviços ativos da agência.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <ClientIntelligenceDashboard />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum cliente encontrado</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Adicione seu primeiro cliente para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const st = statusLabels[c.status] || statusLabels.active;
            return (
              <Card key={c.id} className="cursor-pointer group" onClick={() => setLocation(`/clientes/${c.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                        {c.logoUrl && <AvatarImage src={c.logoUrl} alt={c.companyName} />}
                        <AvatarFallback className="bg-cyan-50 text-cyan-700 text-xs font-bold">
                          {getInitials(c.companyName)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={e => { e.stopPropagation(); handleLogoUpload(c.id); }}
                        title="Alterar logo"
                      >
                        <Camera className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground truncate">{c.companyName}</h3>
                        <Badge variant={st.variant} className="shrink-0 text-xs ml-2">{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{c.contactName}</p>
                      <div className="mt-2">
                        <ClientHealthBadge health={healthMap.get(c.id)} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-lg font-bold text-foreground">{formatCurrency(c.monthlyValue)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(c); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); deleteMutation.mutate({ id: c.id }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Valor Mensal (R$)</Label>
              <Input type="number" value={form.monthlyValue} onChange={e => setForm(f => ({ ...f, monthlyValue: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Contrato</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status do Contrato</Label>
                  <Select value={form.contractStatus} onValueChange={v => setForm(f => ({ ...f, contractStatus: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="expired">Vencido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={form.contractDueDay}
                    onChange={e => setForm(f => ({ ...f, contractDueDay: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Renovação</Label>
                  <Input type="date" value={form.contractRenewalDate} onChange={e => setForm(f => ({ ...f, contractRenewalDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={form.contractEndDate} onChange={e => setForm(f => ({ ...f, contractEndDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Input value={form.contractPaymentMethod} onChange={e => setForm(f => ({ ...f, contractPaymentMethod: e.target.value }))} placeholder="PIX, boleto, cartão..." />
                </div>
                <div className="space-y-2">
                  <Label>Reajuste Previsto</Label>
                  <Input value={form.contractAdjustment} onChange={e => setForm(f => ({ ...f, contractAdjustment: e.target.value }))} placeholder="Ex.: 10% ao renovar" />
                </div>
                <div className="col-span-full space-y-2">
                  <Label>Observações Contratuais</Label>
                  <Textarea value={form.contractNotes} onChange={e => setForm(f => ({ ...f, contractNotes: e.target.value }))} rows={2} />
                </div>
              </div>
            </div>

            <div className="col-span-full">
              <p className="text-sm font-semibold text-foreground mb-3">Serviços Contratados</p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.metaAds} onCheckedChange={v => setForm(f => ({ ...f, metaAds: v }))} />
                  <Label>Meta Ads</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.googleAds} onCheckedChange={v => setForm(f => ({ ...f, googleAds: v }))} />
                  <Label>Google Ads</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.socialMedia} onCheckedChange={v => setForm(f => ({ ...f, socialMedia: v }))} />
                  <Label>Redes Sociais</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qtd. Vídeos/mês</Label>
              <Input type="number" value={form.videoQuantity} onChange={e => setForm(f => ({ ...f, videoQuantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Qtd. Imagens/mês</Label>
              <Input type="number" value={form.imageQuantity} onChange={e => setForm(f => ({ ...f, imageQuantity: e.target.value }))} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>Outros Serviços</Label>
              <Input value={form.otherServices} onChange={e => setForm(f => ({ ...f, otherServices: e.target.value }))} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.companyName || !form.contactName || createMutation.isPending || updateMutation.isPending}
              >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
