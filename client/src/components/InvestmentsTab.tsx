import { useState } from "react";
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

export default function InvestmentsTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "fixed" as "fixed" | "variable", amount: "", description: "", date: "" });

  const { data: investments = [] } = trpc.investments.list.useQuery();
  const { data: summary } = trpc.investments.getSummary.useQuery();
  const utils = trpc.useUtils();

  const createMut = trpc.investments.create.useMutation({
    onSuccess: () => {
      utils.investments.list.invalidate();
      utils.investments.getSummary.invalidate();
      setIsOpen(false);
      setForm({ name: "", type: "fixed", amount: "", description: "", date: "" });
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
    createMut.mutate({
      name: form.name,
      type: form.type,
      amount: form.amount,
      description: form.description,
      date: parseInt(form.date),
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Renda Fixa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.fixed ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Renda Variável</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.variable ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary?.total ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <Button onClick={() => setIsOpen(true)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
        <Plus className="w-4 h-4 mr-2" />
        Novo Investimento
      </Button>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum investimento registrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-right py-3 px-4 font-semibold">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                    <th className="text-center py-3 px-4 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{inv.name}</td>
                      <td className="py-3 px-4">
                        <Badge className={inv.type === "fixed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                          {inv.type === "fixed" ? "Renda Fixa" : "Renda Variável"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(inv.amount)}</td>
                      <td className="py-3 px-4">{new Date(inv.date).toLocaleDateString("pt-BR")}</td>
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
