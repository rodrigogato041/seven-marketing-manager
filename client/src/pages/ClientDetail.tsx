import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, MessageCircle, FileText, Plus, Trash2, Download, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

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

const paymentStatusMap: Record<string, { label: string; icon: any; color: string }> = {
  paid: { label: "Pago", icon: CheckCircle, color: "text-emerald-600" },
  pending: { label: "Pendente", icon: Clock, color: "text-amber-600" },
  overdue: { label: "Atrasado", icon: AlertTriangle, color: "text-destructive" },
};

function ProductionTab({ clientId, client }: { clientId: number; client: any }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: production, isLoading: prodLoading } = trpc.contentProduction.get.useQuery({ clientId, month: currentMonth });
  const updateProduction = trpc.contentProduction.upsert.useMutation({
    onSuccess: () => { trpc.useUtils().contentProduction.get.invalidate(); toast.success("Produção atualizada!"); },
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
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
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

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", dueDate: "", status: "pending" as string, description: "" });
  const createPayment = trpc.payments.create.useMutation({
    onSuccess: () => { utils.payments.list.invalidate(); setPayOpen(false); toast.success("Pagamento registrado!"); },
  });
  const updatePayment = trpc.payments.update.useMutation({ onSuccess: () => utils.payments.list.invalidate() });
  const deletePayment = trpc.payments.delete.useMutation({ onSuccess: () => { utils.payments.list.invalidate(); toast.success("Pagamento removido!"); } });

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
          <h1 className="text-2xl font-bold tracking-tight">{client.companyName}</h1>
          <p className="text-muted-foreground text-sm mt-1">{client.contactName}</p>
        </div>
        <Badge variant={client.status === "active" ? "default" : client.status === "paused" ? "secondary" : "destructive"}>
          {statusLabels[client.status]}
        </Badge>
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

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Serviços</TabsTrigger>
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
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs">
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
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <StIcon className={`h-4 w-4 ${st.color}`} />
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                            <p className="text-xs text-muted-foreground">Vencimento: {formatDate(p.dueDate)}{p.description ? ` - ${p.description}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.status !== "paid" && (
                            <Button variant="ghost" size="sm" className="text-xs text-emerald-600" onClick={() => updatePayment.mutate({ id: p.id, status: "paid", paidDate: Date.now() })}>
                              Marcar Pago
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
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs">
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
                dueDate: new Date(payForm.dueDate).getTime(),
                status: "pending",
                description: payForm.description || undefined,
              });
            }} disabled={!payForm.amount || !payForm.dueDate || createPayment.isPending}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              {createPayment.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
