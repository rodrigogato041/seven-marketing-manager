import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ProjectedCashFlowProps {
  forecastedRevenue: number;
  totalExpenses: number;
  daysInMonth: number;
  expenseItems?: Array<{
    source: string;
    amount: number;
    date?: number | null;
  }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ProjectedCashFlow({
  forecastedRevenue,
  totalExpenses,
  daysInMonth,
  expenseItems = [],
}: ProjectedCashFlowProps) {
  // Generate daily projection data
  const data = useMemo(() => {
    const dailyRevenue = forecastedRevenue / daysInMonth;
    const actualExpensesByDay = new Map<number, number>();
    for (const item of expenseItems) {
      if (item.source !== "actual" || !item.date) continue;
      const day = new Date(item.date).getUTCDate();
      actualExpensesByDay.set(day, (actualExpensesByDay.get(day) ?? 0) + item.amount);
    }
    const datedActualExpenses = Array.from(actualExpensesByDay.values()).reduce((sum, value) => sum + value, 0);
    const dailyPlannedExpenses = Math.max(totalExpenses - datedActualExpenses, 0) / daysInMonth;
    
    const projectionData = [];
    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;
    let cumulativeBalance = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const actualExpenseForDay = actualExpensesByDay.get(day) ?? 0;
      const expenseForDay = dailyPlannedExpenses + actualExpenseForDay;
      cumulativeRevenue += dailyRevenue;
      cumulativeExpenses += expenseForDay;
      cumulativeBalance = cumulativeRevenue - cumulativeExpenses;

      projectionData.push({
        day,
        dailyExpense: Math.round(expenseForDay * 100) / 100,
        actualExpense: Math.round(actualExpenseForDay * 100) / 100,
        revenue: Math.round(cumulativeRevenue * 100) / 100,
        expenses: Math.round(cumulativeExpenses * 100) / 100,
        balance: Math.round(cumulativeBalance * 100) / 100,
      });
    }

    return projectionData;
  }, [forecastedRevenue, totalExpenses, daysInMonth, expenseItems]);

  const finalBalance = data[data.length - 1]?.balance || 0;
  const minBalance = Math.min(...data.map(d => d.balance));
  const maxBalance = Math.max(...data.map(d => d.balance));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Saldo Final Projetado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${finalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(finalBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {finalBalance >= 0 ? "✓ Superávit" : "✗ Déficit"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Saldo Mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${minBalance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {formatCurrency(minBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {minBalance >= 0 ? "Sem risco" : "Atenção: saldo negativo"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Saldo Máximo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(maxBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pico de caixa no mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projected Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Projetado - Tendência até Final do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="day"
                label={{ value: "Dia do Mês", position: "insideBottomRight", offset: -5 }}
                stroke="#9ca3af"
              />
              <YAxis
                label={{ value: "Valor (R$)", angle: -90, position: "insideLeft" }}
                stroke="#9ca3af"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid #374151",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(10px)",
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                name="Receita Acumulada"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#colorExpenses)"
                name="Despesa Acumulada"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#colorBalance)"
                name="Saldo Líquido"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Projeção Diária Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold">Dia</th>
                  <th className="text-right py-2 px-2 font-semibold">Receita Acum.</th>
                  <th className="text-right py-2 px-2 font-semibold">Despesa Dia</th>
                  <th className="text-right py-2 px-2 font-semibold">Despesa Acum.</th>
                  <th className="text-right py-2 px-2 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((_, i) => i % Math.ceil(daysInMonth / 10) === 0 || i === data.length - 1)
                  .map((row) => (
                    <tr key={row.day} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2 px-2">{row.day}</td>
                      <td className="text-right py-2 px-2 text-orange-600 font-medium">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="text-right py-2 px-2 text-slate-600 font-medium">
                        {formatCurrency(row.dailyExpense)}
                      </td>
                      <td className="text-right py-2 px-2 text-cyan-600 font-medium">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td className={`text-right py-2 px-2 font-bold ${row.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
