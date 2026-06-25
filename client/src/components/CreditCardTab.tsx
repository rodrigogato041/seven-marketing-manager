import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: string | number | null) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function formatDateUTC(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

type CreditCardTabProps = {
  selectedYear?: number;
  selectedMonth?: number;
};

export default function CreditCardTab({ selectedYear, selectedMonth }: CreditCardTabProps) {
  const currentDate = new Date();
  const year = selectedYear ?? currentDate.getFullYear();
  const month = selectedMonth ?? currentDate.getMonth() + 1;
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "", transactionDate: "", status: "pending" as "pending" | "paid" });
  const [filterStatus, setFilterStatus] = useState<"pending" | "paid" | "all">("all");

  const { data: transactions = [] } = trpc.creditCard.list.useQuery();
  const utils = trpc.useUtils();

  const periodRange = useMemo(() => ({
    start: Date.UTC(year, month - 1, 1),
    end: Date.UTC(year, month, 0, 23, 59, 59, 999),
  }), [year, month]);

  const periodTransactions = useMemo(() =>
    transactions.filter(transaction =>
      transaction.transactionDate >= periodRange.start && transaction.transactionDate <= periodRange.end
    ), [transactions, periodRange]);

  const periodSummary = useMemo(() => ({
    pending: periodTransactions
      .filter(transaction => transaction.status === "pending")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    paid: periodTransactions
      .filter(transaction => transaction.status === "paid")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
  }), [periodTransactions]);

  const createMut = trpc.creditCard.create.useMutation({
    onSuccess: () => {
      utils.creditCard.list.invalidate();
      utils.creditCard.getSummary.invalidate();
      setIsOpen(false);
      setForm({ description: "", amount: "", category: "", transactionDate: "", status: "pending" });
      toast.success("Transação registrada!");
    },
    onError: () => toast.error("Erro ao registrar transação"),
  });

  const deleteMut = trpc.creditCard.delete.useMutation({
    onSuccess: () => {
      utils.creditCard.list.invalidate();
      utils.creditCard.getSummary.invalidate();
      toast.success("Transação removida!");
    },
    onError: () => toast.error("Erro ao remover transação"),
  });

  const markAsPaidMut = trpc.creditCard.markAsPaid.useMutation({
    onSuccess: () => {
      utils.creditCard.list.invalidate();
      utils.creditCard.getSummary.invalidate();
      toast.success("Transação marcada como paga!");
    },
    onError: () => toast.error("Erro ao marcar como pago"),
  });

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.category || !form.transactionDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const transactionDate = parseDateInput(form.transactionDate);
    if (!transactionDate) {
      toast.error("Informe uma data válida");
      return;
    }
    createMut.mutate({
      description: form.description,
      amount: form.amount,
      category: form.category,
      transactionDate,
      status: form.status,
    });
  };

  const filteredTransactions = filterStatus === "all"
    ? periodTransactions
    : periodTransactions.filter(t => t.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Transacoes filtradas por {String(month).padStart(2, "0")}/{year}. Pendentes ajudam a prever saidas futuras; pagos ja representam desembolso registrado.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              A Pagar (Pendente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(periodSummary.pending)}</p>
            <p className="text-xs text-muted-foreground mt-1">Não impacta faturamento até pagamento</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Já Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(periodSummary.paid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <Button onClick={() => {
        setForm({ description: "", amount: "", category: "", transactionDate: `${year}-${String(month).padStart(2, "0")}-01`, status: "pending" });
        setIsOpen(true);
      }} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Nova Transação no Cartão
      </Button>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          onClick={() => setFilterStatus("all")}
        >
          Todas
        </Button>
        <Button
          variant={filterStatus === "pending" ? "default" : "outline"}
          onClick={() => setFilterStatus("pending")}
        >
          Pendentes
        </Button>
        <Button
          variant={filterStatus === "paid" ? "default" : "outline"}
          onClick={() => setFilterStatus("paid")}
        >
          Pagos
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transações do Cartão de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma transação registrada neste periodo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                    <th className="text-left py-3 px-4 font-semibold">Categoria</th>
                    <th className="text-right py-3 px-4 font-semibold">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((trans) => (
                    <tr key={trans.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{trans.description}</td>
                      <td className="py-3 px-4 text-muted-foreground">{trans.category}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(trans.amount)}</td>
                      <td className="py-3 px-4">{formatDateUTC(trans.transactionDate)}</td>
                      <td className="py-3 px-4">
                        <Badge className={trans.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                          {trans.status === "pending" ? "Pendente" : "Pago"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2 flex justify-center">
                        {trans.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsPaidMut.mutate({ id: trans.id })}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMut.mutate({ id: trans.id })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação no Cartão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Compra no supermercado"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: Alimentação, Transporte, etc"
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Data da Transação</Label>
              <Input
                type="date"
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Status Inicial</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as "pending" | "paid" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente (Não pago)</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
