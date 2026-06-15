import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

interface ExpenseData {
  id: number;
  amount: string | number;
  category: string;
  description?: string | null;
  date: number;
}

interface ExpensesPieChartProps {
  expenses: ExpenseData[];
  height?: number;
}

const COLORS: Record<string, string> = {
  // Despesas operacionais comuns
  "Mercado": "#ea580c",           // Laranja
  "Água": "#06b6d4",              // Cyan
  "Luz": "#fbbf24",               // Âmbar
  "Internet": "#3b82f6",          // Azul
  "Telefone": "#8b5cf6",          // Roxo
  "Aluguel": "#ef4444",           // Vermelho
  "Combustível": "#f97316",       // Laranja escuro
  "Transporte": "#10b981",        // Verde
  "Hospedagem": "#ec4899",        // Rosa
  "Domínio": "#6366f1",           // Índigo
  "Certificado SSL": "#14b8a6",   // Teal
  "Ferramentas": "#f43f5e",       // Rose
  "Software": "#06b6d4",          // Cyan
  "Publicidade": "#a855f7",       // Roxo
  "Marketing": "#8b5cf6",         // Roxo
  "Salário": "#22c55e",           // Verde
  "Freelancer": "#84cc16",        // Lime
  "Colaborador": "#ea580c",       // Laranja
  "Operacional": "#f59e0b",       // Âmbar
  "Outro": "#6b7280",             // Cinza
};

const DEFAULT_COLORS = [
  "#ea580c", "#06b6d4", "#8b5cf6", "#f59e0b", "#6b7280",
  "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#f97316",
  "#fbbf24", "#14b8a6", "#f43f5e", "#a855f7", "#22c55e",
  "#84cc16", "#6366f1", "#f97316", "#22d3ee", "#a78bfa",
];

export default function ExpensesPieChart({ expenses, height = 400 }: ExpensesPieChartProps) {
  const [viewMode, setViewMode] = useState<"detailed" | "category">("detailed");

  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const detailMap = new Map<string, number>();

    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      
      if (viewMode === "detailed") {
        // Usar descrição como chave principal, com fallback para categoria
        const key = exp.description && exp.description.trim() ? exp.description.trim() : exp.category;
        const current = detailMap.get(key) || 0;
        detailMap.set(key, current + amount);
      } else {
        // Usar categoria como chave
        const current = detailMap.get(exp.category) || 0;
        detailMap.set(exp.category, current + amount);
      }
    });

    return Array.from(detailMap.entries())
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, viewMode]);

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const getColor = (name: string, index: number) => {
    return COLORS[name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-sm text-foreground">{data.name}</p>
          <p className="text-sm font-bold text-primary">
            R$ {data.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">{percentage}% do total</p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Não mostrar labels para fatias muito pequenas

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-bold text-xs drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <p>Nenhuma despesa registrada para exibir o gráfico</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Botões de visualização */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={viewMode === "detailed" ? "default" : "outline"}
          onClick={() => setViewMode("detailed")}
          className={viewMode === "detailed" ? "" : ""}
        >
          Visualização Detalhada
        </Button>
        <Button
          size="sm"
          variant={viewMode === "category" ? "default" : "outline"}
          onClick={() => setViewMode("category")}
          className={viewMode === "category" ? "" : ""}
        >
          Por Categoria
        </Button>
      </div>

      {/* Gráfico de Pizza */}
      <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Detalhes */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-muted/40">
          <h3 className="font-semibold text-sm text-foreground">
            {viewMode === "detailed" ? "Resumo Detalhado de Despesas" : "Resumo por Categoria"}
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {chartData.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            const color = getColor(item.name, index);
            return (
              <div key={item.name} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{percentage}% do total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="p-4 bg-muted/40 flex items-center justify-between font-semibold">
            <p className="text-sm text-foreground">Total de Despesas</p>
            <p className="text-lg text-orange-600">
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
