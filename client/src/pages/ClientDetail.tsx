import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, MessageCircle, FileText, Plus, Trash2, Download, CheckCircle, Clock, AlertTriangle, Undo2, CalendarClock, FileCheck2, TrendingUp, Pencil } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Client360Overview } from "@/components/ClientIntelligenceDashboard";

function formatCurrency(value: string | number | null) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(ts: number | null) {
  if (!ts) return "-";
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function formatInputDate(ts: number | null | undefined) {
  if (!ts) return "";
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function quickFormFromClient(client: any) {
  return {
    companyName: client?.companyName || "",
    contactName: client?.contactName || "",
    phone: client?.phone || "",
    whatsapp: client?.whatsapp || "",
    email: client?.email || "",
    monthlyValue: client?.monthlyValue ? String(client.monthlyValue) : "",
    startDate: formatInputDate(client?.startDate),
    contractRenewalDate: formatInputDate(client?.contractRenewalDate),
    contractEndDate: formatInputDate(client?.contractEndDate),
    contractPaymentMethod: client?.contractPaymentMethod || "",
    contractDueDay: client?.contractDueDay ? String(client.contractDueDay) : "",
    contractAdjustment: client?.contractAdjustment || "",
    contractNotes: client?.contractNotes || "",
    contractStatus: client?.contractStatus || "pending",
    status: client?.status || "active",
    metaAds: Boolean(client?.metaAds),
    googleAds: Boolean(client?.googleAds),
    socialMedia: Boolean(client?.socialMedia),
    videoQuantity: client?.videoQuantity ? String(client.videoQuantity) : "0",
    imageQuantity: client?.imageQuantity ? String(client.imageQuantity) : "0",
    otherServices: client?.otherServices || "",
    notes: client?.notes || "",
  };
}

const paymentStatusMap: Record<string, { label: string; icon: any; color: string }> = {
  paid: { label: "Pago", icon: CheckCircle, color: "text-emerald-600" },
  pending: { label: "Pendente", icon: Clock, color: "text-amber-600" },
  overdue: { label: "Atrasado", icon: AlertTriangle, color: "text-destructive" },
};

const contractStatusMap: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  pending: { label: "Pendente", className: "border-amber-200 bg-amber-50 text-amber-700" },
  expired: { label: "Vencido", className: "border-rose-200 bg-rose-50 text-rose-700" },
  cancelled: { label: "Cancelado", className: "border-muted bg-muted text-muted-foreground" },
};

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value || "-"}</p>
    </div>
  );
}

function ProductionTab({ clientId, client }: { clientId: number; client: any }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const utils = trpc.useUtils();
  const { data: production, isLoading: prodLoading } = trpc.contentProduction.get.useQuery({ clientId, month: currentMonth });
  const updateProduction = trpc.contentProduction.upsert.useMutation({
    onSuccess: () => {
      utils.contentProduction.get.invalidate({ clientId, month: currentMonth });
      utils.clients.health.invalidate({ id: clientId });
      utils.clients.intelligence.invalidate();
      utils.dashboard.today.invalidate();
      toast.success("Produção atualizada!");
    },
  });

  const [videosProduced, setVideosProduced] = useState<number>(0);
  const [imagesProduced, setImagesProduced] = useState<number>(0);

  useEffect(() => {
    if (production) {
      setVideosProduced(production.videosProduced ?? 0);
      setImagesProduced(production.imagesProduced ?? 0);
    }
  }, [production]);

  const videoQuota = client.videoQuantity ?? 0;
  const imageQuota = client.imageQuantity ?? 0;
  const videoPercent = videoQuota > 0 ? Math.min((videosProduced / videoQuota) * 100, 100) : 0;
  const imagePercent = imageQuota > 0 ? Math.min((imagesProduced / imageQuota) * 100, 100) : 0;

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleSave = () => {
    if (videoQuota === 0 && imageQuota === 0) {
      toast.error("Cliente sem cota de vídeos/imagens definida");
      return;
    }
    updateProduction.mutate({
      clientId,
      month: currentMonth,
      videosProduced,
      imagesProduced,
    });
  };

  if (prodLoading) return <div className="text-center text-muted-foreground py-8">Carregando...</div>;

  return (
    <Card className="shadow-sm">
      <CardHeader><CardTitle className="text-sm">Controle de Produção - {currentMonth}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Vídeos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Vídeos Produzidos</Label>
            <span className="text-sm font-semibold text-muted-foreground">{videosProduced} / {videoQuota}</span>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min="0"
              max={videoQuota}
              value={videosProduced}
              onChange={e => setVideosProduced(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 text-sm"
            />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full transition-all ${getProgressColor(videoPercent)}`} style={{ width: `${videoPercent}%` }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-12 text-right">{Math.round(videoPercent)}%</span>
          </div>
        </div>

        {/* Imagens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Imagens Produzidas</Label>
            <span className="text-sm font-semibold text-muted-foreground">{imagesProduced} / {imageQuota}</span>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min="0"
              max={imageQuota}
              value={imagesProduced}
              onChange={e => setImagesProduced(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 text-sm"
            />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full transition-all ${getProgressColor(imagePercent)}`} style={{ width: `${imagePercent}%` }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-12 text-right">{Math.round(imagePercent)}%</span>
          </div>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={updateProduction.isPending}
          className="w-full"
        >
          {updateProduction.isPending ? "Salvando..." : "Salvar Produção"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(params.id || "0");

  const { data: client, isLoading } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: paymentsList } = trpc.payments.list.useQuery({ clientId });
  const { data: docsList } = trpc.documents.list.useQuery({ clientId });

  const utils = trpc.useUtils();
  const refreshClientIntelligence = async () => {
    await Promise.all([
      utils.clients.getById.invalidate({ id: clientId }),
      utils.clients.list.invalidate(),
      utils.clients.health.invalidate({ id: clientId }),
      utils.clients.intelligence.invalidate(),
      utils.dashboard.today.invalidate(),
      utils.dashboard.stats.invalidate(),
      utils.payments.billingForecast.invalidate(),
      utils.strategicFinance.summary.invalidate(),
    ]);
  };

  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickForm, setQuickForm] = useState(() => quickFormFromClient(null));
  useEffect(() => {
    if (client && !quickEditOpen) setQuickForm(quickFormFromClient(client));
  }, [client, quickEditOpen]);
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: async () => {
      await refreshClientIntelligence();
      setQuickEditOpen(false);
      toast.success("Cliente atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar cliente"),
  });

  function openQuickEdit() {
    setQuickForm(quickFormFromClient(client));
    setQuickEditOpen(true);
  }

  function saveQuickEdit() {
    updateClient.mutate({
      id: clientId,
      companyName: quickForm.companyName.trim(),
      contactName: quickForm.contactName.trim(),
      phone: quickForm.phone || undefined,
      whatsapp: quickForm.whatsapp || undefined,
      email: quickForm.email || undefined,
      monthlyValue: quickForm.monthlyValue || "0",
      startDate: quickForm.startDate ? parseLocalDate(quickForm.startDate) : undefined,
      contractRenewalDate: quickForm.contractRenewalDate ? parseLocalDate(quickForm.contractRenewalDate) : null,
      contractEndDate: quickForm.contractEndDate ? parseLocalDate(quickForm.contractEndDate) : null,
      contractPaymentMethod: quickForm.contractPaymentMethod || null,
      contractDueDay: quickForm.contractDueDay ? parseInt(quickForm.contractDueDay) : null,
      contractAdjustment: quickForm.contractAdjustment || null,
      contractNotes: quickForm.contractNotes || null,
      contractStatus: quickForm.contractStatus as any,
      status: quickForm.status as any,
      metaAds: quickForm.metaAds,
      googleAds: quickForm.googleAds,
      socialMedia: quickForm.socialMedia,
      videoQuantity: parseInt(quickForm.videoQuantity) || 0,
      imageQuantity: parseInt(quickForm.imageQuantity) || 0,
      otherServices: quickForm.otherServices || undefined,
      notes: quickForm.notes || undefined,
    });
  }

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", dueDate: "", status: "pending" as string, description: "" });
  const createPayment = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.payments.billingForecast.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      refreshClientIntelligence();
      setPayOpen(false);
      toast.success("Pagamento registrado!");
    },
  });
  const confirmPayment = trpc.payments.confirm.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.payments.billingForecast.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      refreshClientIntelligence();
      toast.success("Pagamento confirmado!");
    },
    onError: () => toast.error("Erro ao confirmar pagamento"),
  });
  const undoPayment = trpc.payments.undo.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.payments.billingForecast.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      refreshClientIntelligence();
      toast.success("Baixa desfeita. Pagamento voltou para pendente.");
    },
    onError: () => toast.error("Erro ao desfazer baixa"),
  });
  const deletePayment = trpc.payments.delete.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.payments.billingForecast.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlyRevenue.invalidate();
      refreshClientIntelligence();
      toast.success("Pagamento removido!");
    },
  });

  // Document upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docCategory, setDocCategory] = useState<string>("other");
  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Documento enviado!"); },
    onError: () => toast.error("Erro ao enviar documento"),
  });
  const deleteDoc = trpc.documents.delete.useMutation({ onSuccess: () => { utils.documents.list.invalidate(); toast.success("Documento removido!"); } });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDoc.mutate({
        clientId,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
        fileSize: file.size,
        category: docCategory as any,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/clientes")}>Voltar</Button>
      </div>
    );
  }

  const statusLabels: Record<string, string> = { active: "Ativo", paused: "Pausado", cancelled: "Cancelado" };

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="text-muted-foreground -ml-2" onClick={() => setLocation("/clientes")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Clientes
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            Cliente
          </div>
          <h1 className="text-2xl font-semibold">{client.companyName}</h1>
          <p className="text-muted-foreground text-sm mt-1">{client.contactName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openQuickEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar rapido
          </Button>
          <Badge variant={client.status === "active" ? "default" : client.status === "paused" ? "secondary" : "destructive"}>
            {statusLabels[client.status]}
          </Badge>
        </div>
      </div>

      {/* Contact Info */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-wrap gap-6">
          {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
          {client.whatsapp && <div className="flex items-center gap-2 text-sm"><MessageCircle className="h-4 w-4 text-muted-foreground" />{client.whatsapp}</div>}
          {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
          <div className="text-sm"><span className="text-muted-foreground">Valor mensal:</span> <span className="font-semibold">{formatCurrency(client.monthlyValue)}</span></div>
          {client.startDate && <div className="text-sm"><span className="text-muted-foreground">Início:</span> {formatDate(client.startDate)}</div>}
        </CardContent>
      </Card>

      <Client360Overview clientId={clientId} />

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="contract">Contrato</TabsTrigger>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="production">Produção</TabsTrigger>
          <TabsTrigger value="payments">Financeiro</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm">Serviços Contratados</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant={client.metaAds ? "default" : "outline"}>{client.metaAds ? "Meta Ads" : "Meta Ads (não)"}</Badge>
              <Badge variant={client.googleAds ? "default" : "outline"}>{client.googleAds ? "Google Ads" : "Google Ads (não)"}</Badge>
              <Badge variant={client.socialMedia ? "default" : "outline"}>{client.socialMedia ? "Redes Sociais" : "Redes Sociais (não)"}</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  Controle de Contrato
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Renovação, vencimento, cobrança, reajuste e observações formais do cliente.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={openQuickEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar contrato
                </Button>
                <Badge variant="outline" className={contractStatusMap[client.contractStatus || "pending"]?.className}>
                  {contractStatusMap[client.contractStatus || "pending"]?.label ?? "Pendente"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <FieldRow label="Data de início" value={client.startDate ? formatDate(client.startDate) : "-"} />
                <FieldRow label="Data de renovação" value={client.contractRenewalDate ? formatDate(client.contractRenewalDate) : "-"} />
                <FieldRow label="Data de vencimento" value={client.contractEndDate ? formatDate(client.contractEndDate) : "-"} />
                <FieldRow label="Valor contratado" value={formatCurrency(client.monthlyValue)} />
                <FieldRow label="Dia de vencimento" value={client.contractDueDay ? `Dia ${client.contractDueDay}` : "-"} />
                <FieldRow label="Forma de pagamento" value={client.contractPaymentMethod || "-"} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <p className="text-xs font-medium uppercase">Reajuste previsto</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{client.contractAdjustment || "-"}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    <p className="text-xs font-medium uppercase">Próximo marco</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {client.contractEndDate ? `Vencimento em ${formatDate(client.contractEndDate)}` : client.contractRenewalDate ? `Renovação em ${formatDate(client.contractRenewalDate)}` : "Sem data contratual"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Observações contratuais</p>
                <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">{client.contractNotes || "Nenhuma observação contratual registrada."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm">Entregas Mensais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Vídeos</span><span className="font-semibold">{client.videoQuantity ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Imagens</span><span className="font-semibold">{client.imageQuantity ?? 0}</span></div>
              {client.otherServices && <div className="text-sm"><span className="text-muted-foreground">Outros:</span> {client.otherServices}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <ProductionTab clientId={clientId} client={client} />
        </TabsContent>

        <TabsContent value="payments">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Histórico de Pagamentos</CardTitle>
              <Button size="sm" onClick={() => { setPayForm({ amount: "", dueDate: "", status: "pending", description: "" }); setPayOpen(true); }}
                className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Novo Pagamento
              </Button>
            </CardHeader>
            <CardContent>
              {!paymentsList || paymentsList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {paymentsList.map(p => {
                    const st = paymentStatusMap[p.status] || paymentStatusMap.pending;
                    const StIcon = st.icon;
                    return (
                      <div key={p.id} className="flex flex-col gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <StIcon className={`h-4 w-4 ${st.color}`} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                              <Badge variant="outline" className="text-[10px]">{st.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Vencimento: {formatDate(p.dueDate)}
                              {p.status === "paid" && p.paidDate ? ` - Pago em: ${formatDate(p.paidDate)}` : ""}
                              {p.description ? ` - ${p.description}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {p.status === "paid" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                              onClick={() => undoPayment.mutate({ id: p.id })}
                              disabled={undoPayment.isPending}
                            >
                              <Undo2 className="h-3.5 w-3.5 mr-1" />
                              Desfazer baixa
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => confirmPayment.mutate({ id: p.id })}
                              disabled={confirmPayment.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Confirmar pagamento
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePayment.mutate({ id: p.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Documentos</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={docCategory} onValueChange={setDocCategory}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contrato</SelectItem>
                    <SelectItem value="proposal">Proposta</SelectItem>
                    <SelectItem value="report">Relatório</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadDoc.isPending}
                  className="text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> {uploadDoc.isPending ? "Enviando..." : "Upload"}
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>
            </CardHeader>
            <CardContent>
              {!docsList || docsList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento enviado</p>
              ) : (
                <div className="space-y-2">
                  {docsList.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{d.fileName}</p>
                          <p className="text-xs text-muted-foreground">{d.category} {d.fileSize ? `- ${(d.fileSize / 1024).toFixed(0)} KB` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(d.url, "_blank")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDoc.mutate({ id: d.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm">Observações Estratégicas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes || "Nenhuma observação registrada."}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Edit Dialog */}
      <Dialog open={quickEditOpen} onOpenChange={setQuickEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente rapidamente</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Empresa</Label>
                <Input value={quickForm.companyName} onChange={e => setQuickForm(f => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status do cliente</Label>
                <Select value={quickForm.status} onValueChange={value => setQuickForm(f => ({ ...f, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={quickForm.contactName} onChange={e => setQuickForm(f => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={quickForm.phone} onChange={e => setQuickForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={quickForm.whatsapp} onChange={e => setQuickForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>E-mail</Label>
                <Input value={quickForm.email} onChange={e => setQuickForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-semibold">Servicos e entregas</p>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" checked={quickForm.metaAds} onChange={e => setQuickForm(f => ({ ...f, metaAds: e.target.checked }))} />
                  Meta Ads
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" checked={quickForm.googleAds} onChange={e => setQuickForm(f => ({ ...f, googleAds: e.target.checked }))} />
                  Google Ads
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" checked={quickForm.socialMedia} onChange={e => setQuickForm(f => ({ ...f, socialMedia: e.target.checked }))} />
                  Redes sociais
                </label>
                <div className="space-y-2">
                  <Label>Videos por mes</Label>
                  <Input type="number" min="0" value={quickForm.videoQuantity} onChange={e => setQuickForm(f => ({ ...f, videoQuantity: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Imagens por mes</Label>
                  <Input type="number" min="0" value={quickForm.imageQuantity} onChange={e => setQuickForm(f => ({ ...f, imageQuantity: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Outros servicos</Label>
                  <Input value={quickForm.otherServices} onChange={e => setQuickForm(f => ({ ...f, otherServices: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-semibold">Contrato e cobranca</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Valor mensal</Label>
                  <Input type="number" min="0" step="0.01" value={quickForm.monthlyValue} onChange={e => setQuickForm(f => ({ ...f, monthlyValue: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Inicio</Label>
                  <Input type="date" value={quickForm.startDate} onChange={e => setQuickForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Status do contrato</Label>
                  <Select value={quickForm.contractStatus} onValueChange={value => setQuickForm(f => ({ ...f, contractStatus: value }))}>
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
                  <Label>Dia de vencimento</Label>
                  <Input type="number" min="1" max="31" value={quickForm.contractDueDay} onChange={e => setQuickForm(f => ({ ...f, contractDueDay: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Renovacao</Label>
                  <Input type="date" value={quickForm.contractRenewalDate} onChange={e => setQuickForm(f => ({ ...f, contractRenewalDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento do contrato</Label>
                  <Input type="date" value={quickForm.contractEndDate} onChange={e => setQuickForm(f => ({ ...f, contractEndDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Input value={quickForm.contractPaymentMethod} onChange={e => setQuickForm(f => ({ ...f, contractPaymentMethod: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Reajuste previsto</Label>
                  <Input value={quickForm.contractAdjustment} onChange={e => setQuickForm(f => ({ ...f, contractAdjustment: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Observacoes contratuais</Label>
                  <Textarea rows={3} value={quickForm.contractNotes} onChange={e => setQuickForm(f => ({ ...f, contractNotes: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observacoes gerais</Label>
              <Textarea rows={4} value={quickForm.notes} onChange={e => setQuickForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveQuickEdit} disabled={!quickForm.companyName.trim() || !quickForm.contactName.trim() || updateClient.isPending}>
              {updateClient.isPending ? "Salvando..." : "Salvar alteracoes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={payForm.dueDate} onChange={e => setPayForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={payForm.description} onChange={e => setPayForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              createPayment.mutate({
                clientId,
                amount: payForm.amount,
                dueDate: parseLocalDate(payForm.dueDate),
                status: "pending",
                description: payForm.description || undefined,
              });
            }} disabled={!payForm.amount || !payForm.dueDate || createPayment.isPending}
              >
              {createPayment.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
