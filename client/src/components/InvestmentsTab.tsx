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
import { Plus, Trash2, TrendingUp } from "lucide-react";
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

function formatInvestmentDate(value: number) {
  if (!Number.isFinite(value) || value < Date.UTC(2000, 0, 1)) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

type InvestmentsTabProps = {
  selectedYear?: number;
  selectedMonth?: number;
};

export default function InvestmentsTab({ selectedYear, selectedMonth }: InvestmentsTabProps) {
  const currentDate = new Date();
  const year = selectedYear ?? currentDate.getFullYear();
  const month = selectedMonth ?? currentDate.getMonth() + 1;
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "fixed" as "fixed" | "variable",
    amount: "",
    ticker: "",
    quantity: "",
    currentValue: "",
    description: "",
    date: "",
  });

  const { data: investments = [] } = trpc.investments.list.useQuery();
  const utils = trpc.useUtils();

  const periodRange = useMemo(() => ({
    start: Date.UTC(year, month - 1, 1),
    end: Date.UTC(year, month, 0, 23, 59, 59, 999),
  }), [year, month]);

  const periodInvestments = useMemo(() =>
    investments.filter(investment => investment.date >= periodRange.start && investment.date <= periodRange.end),
    [investments, periodRange]
  );

  const periodSummary = useMemo(() => {
    const fixed = periodInvestments
      .filter(investment => investment.type === "fixed")
      .reduce((sum, investment) => sum + Number(investment.amount || 0), 0);
    const variableInvested = periodInvestments
      .filter(investment => investment.type === "variable")
      .reduce((sum, investment) => sum + Number(investment.amount || 0), 0);
    const variableCurrent = periodInvestments
      .filter(investment => investment.type === "variable")
      .reduce((sum, investment: any) => sum + Number(investment.currentValue || investment.amount || 0), 0);
    const result = variableCurrent - variableInvested;
    return { fixed, variable: variableInvested, variableCurrent, result, total: fixed + variableCurrent };
  }, [periodInvestments]);

  const createMut = trpc.investments.create.useMutation({
    onSuccess: () => {
      utils.investments.list.invalidate();
      utils.investments.getSummary.invalidate();
      setIsOpen(false);
      setForm({ name: "", type: "fixed", amount: "", ticker: "", quantity: "", currentValue: "", description: "", date: "" });
      toast.success("Investimento registrado!");
    },
    onError: () => toast.error("Erro ao registrar investimento"),
  });

  const deleteMut = trpc.investments.delete.useMutation({
    onSuccess: () => {
      utils.investments.list.invalidate();
      utils.investments.getSummary.invalidate();
      toast.success("Investimento removido!");
    },
    onError: () => toast.error("Erro ao remover investimento"),
  });

  const handleSubmit = () => {
    if (!form.name || !form.amount || !form.date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const investmentDate = parseDateInput(form.date);
    if (!investmentDate) {
      toast.error("Informe uma data válida");
      return;
    }
    createMut.mutate({
      name: form.name,
      type: form.type,
      amount: form.amount,
      ticker: form.type === "variable" ? form.ticker || undefined : undefined,
      quantity: form.type === "variable" ? form.quantity || undefined : undefined,
      currentValue: form.type === "variable" ? form.currentValue || form.amount : undefined,
      description: form.description,
      date: investmentDate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Investimentos registrados em {String(month).padStart(2, "0")}/{year}. Estes valores sao informativos e nao entram no lucro, caixa ou despesas operacionais.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Renda Fixa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(periodSummary.fixed)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Renda Variável Investida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(periodSummary.variable)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Atual Variável</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan-700">{formatCurrency(periodSummary.variableCurrent)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Variável</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${periodSummary.result >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(periodSummary.result)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <Button onClick={() => {
        setForm({ name: "", type: "fixed", amount: "", ticker: "", quantity: "", currentValue: "", description: "", date: `${year}-${String(month).padStart(2, "0")}-01` });
        setIsOpen(true);
      }} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Novo Investimento
      </Button>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {periodInvestments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum investimento registrado neste periodo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-right py-3 px-4 font-semibold">Valor</th>
                    <th className="text-right py-3 px-4 font-semibold">Atual</th>
                    <th className="text-right py-3 px-4 font-semibold">Resultado</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                    <th className="text-center py-3 px-4 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {periodInvestments.map((inv: any) => {
                    const currentValue = Number(inv.currentValue || inv.amount || 0);
                    const investedValue = Number(inv.amount || 0);
                    const result = inv.type === "variable" ? currentValue - investedValue : 0;
                    return (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        <div>{inv.name}</div>
                        {inv.type === "variable" && (inv.ticker || inv.quantity) && (
                          <div className="text-xs text-muted-foreground">
                            {[inv.ticker, inv.quantity ? `${inv.quantity} un.` : null].filter(Boolean).join(" - ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={inv.type === "fixed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                          {inv.type === "fixed" ? "Renda Fixa" : "Renda Variável"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(inv.amount)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{inv.type === "variable" ? formatCurrency(currentValue) : "-"}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${result >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {inv.type === "variable" ? formatCurrency(result) : "-"}
                      </td>
                      <td className="py-3 px-4">{formatInvestmentDate(inv.date)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{inv.description || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMut.mutate({ id: inv.id })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  )})}
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
            <DialogTitle>Novo Investimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Investimento</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: CDB, Ação PETR4, Fundo Imobiliário"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as "fixed" | "variable" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Renda Fixa</SelectItem>
                  <SelectItem value="variable">Renda Variável</SelectItem>
                </SelectContent>
              </Select>
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
            {form.type === "variable" && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-blue-50/40 p-3 sm:grid-cols-3">
                <div>
                  <Label>Codigo/Ativo</Label>
                  <Input
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                    placeholder="Ex: PETR4"
                  />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Valor Atual (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.currentValue}
                    onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                    placeholder={form.amount || "0.00"}
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notas adicionais"
              />
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
