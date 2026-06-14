import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ScenarioAnalysisProps {
  baseRevenue: number;
  totalExpenses: number;
  breakEvenPoint: number;
  actualExpenses?: number;
  duplicatedExpenses?: number;
  financialValue?: (value: string) => string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ScenarioAnalysis({
  baseRevenue,
  totalExpenses,
  breakEvenPoint,
  actualExpenses = 0,
  duplicatedExpenses = 0,
  financialValue = value => value,
}: ScenarioAnalysisProps) {
  const [revenueVariation, setRevenueVariation] = useState(0); // percentage
  const [expenseVariation, setExpenseVariation] = useState(0); // percentage

  // Calculate scenarios
  const scenarios = useMemo(() => {
    const variations = [-30, -20, -10, 0, 10, 20, 30];
    const committedExpenses = Math.min(actualExpenses, totalExpenses);
    const flexibleExpenses = Math.max(totalExpenses - committedExpenses, 0);
    
    return variations.map(variation => {
      const adjustedRevenue = baseRevenue * (1 + variation / 100);
      const adjustedExpenses = committedExpenses + (flexibleExpenses * (1 + expenseVariation / 100));
      const profit = adjustedRevenue - adjustedExpenses;
      const profitMargin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0;
      const status = profit > 0 ? "positive" : profit > -1000 ? "warning" : "negative";

      return {
        variation,
        revenue: Math.round(adjustedRevenue * 100) / 100,
        expenses: adjustedExpenses,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        status,
      };
    });
  }, [baseRevenue, totalExpenses, actualExpenses, expenseVariation]);

  const currentScenario = scenarios.find(s => s.variation === 0);
  const selectedScenario = scenarios.find(s => s.variation === revenueVariation);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Simulador de Cenários (What-If)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Variation */}
            <div className="space-y-3">
              <Label htmlFor="revenue-variation">
                Variação de Receita: <strong>{revenueVariation > 0 ? "+" : ""}{revenueVariation}%</strong>
              </Label>
              <input
                id="revenue-variation"
                type="range"
                min="-50"
                max="50"
                step="5"
                value={revenueVariation}
                onChange={(e) => setRevenueVariation(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Base: {financialValue(formatCurrency(baseRevenue))}</div>
                <div>Cenário: {financialValue(formatCurrency((baseRevenue * (1 + revenueVariation / 100))))}</div>
              </div>
            </div>

            {/* Expense Variation */}
            <div className="space-y-3">
              <Label htmlFor="expense-variation">
                Variação de Despesas: <strong>{expenseVariation > 0 ? "+" : ""}{expenseVariation}%</strong>
              </Label>
              <input
                id="expense-variation"
                type="range"
                min="-30"
                max="50"
                step="5"
                value={expenseVariation}
                onChange={(e) => setExpenseVariation(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Base: {financialValue(formatCurrency(totalExpenses))}</div>
                <div>Cenário: {financialValue(formatCurrency((totalExpenses * (1 + expenseVariation / 100))))}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current vs Selected Scenario */}
      {selectedScenario && currentScenario && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Scenario */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Cenário Atual (Base)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Lucro Previsto</p>
                <p className={`text-2xl font-bold ${currentScenario.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {financialValue(formatCurrency(currentScenario.profit))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem de Lucro</p>
                <p className="text-lg font-semibold text-blue-600">{currentScenario.profitMargin.toFixed(1)}%</p>
              </div>
              <Badge variant={currentScenario.status === "positive" ? "default" : "destructive"}>
                {currentScenario.status === "positive" ? "✓ Lucro" : currentScenario.status === "warning" ? "⚠ Atenção" : "✗ Prejuízo"}
              </Badge>
            </CardContent>
          </Card>

          {/* Selected Scenario */}
          <Card className={`${selectedScenario.profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Cenário Simulado ({revenueVariation > 0 ? "+" : ""}{revenueVariation}% Receita, {expenseVariation > 0 ? "+" : ""}{expenseVariation}% Despesas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Lucro Previsto</p>
                <p className={`text-2xl font-bold ${selectedScenario.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {financialValue(formatCurrency(selectedScenario.profit))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem de Lucro</p>
                <p className="text-lg font-semibold" style={{ color: selectedScenario.profit >= 0 ? "#059669" : "#dc2626" }}>
                  {selectedScenario.profitMargin.toFixed(1)}%
                </p>
              </div>
              <Badge variant={selectedScenario.status === "positive" ? "default" : "destructive"}>
                {selectedScenario.status === "positive" ? "✓ Lucro" : selectedScenario.status === "warning" ? "⚠ Atenção" : "✗ Prejuízo"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Despesas Reais Travadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-700">{financialValue(formatCurrency(actualExpenses))}</p>
            <p className="text-xs text-muted-foreground mt-1">Ja registradas no mes; nao variam no simulador</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Despesas Projetadas Flexiveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{financialValue(formatCurrency(Math.max(totalExpenses - actualExpenses, 0)))}</p>
            <p className="text-xs text-muted-foreground mt-1">Parte afetada pela variacao de despesas</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Duplicidade Evitada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{financialValue(formatCurrency(duplicatedExpenses))}</p>
            <p className="text-xs text-muted-foreground mt-1">Despesas reais semelhantes a custos ja planejados</p>
          </CardContent>
        </Card>
      </div>

      {/* Scenarios Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Análise de Lucro por Variação de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scenarios} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="variation"
                label={{ value: "Variação de Receita (%)", position: "insideBottomRight", offset: -5 }}
                stroke="#9ca3af"
              />
              <YAxis
                label={{ value: "Lucro (R$)", angle: -90, position: "insideLeft" }}
                stroke="#9ca3af"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid #374151",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(10px)",
                }}
                formatter={(value: number) => financialValue(formatCurrency(value))}
                labelFormatter={(label) => `${label > 0 ? "+" : ""}${label}%`}
              />
              <Bar
                dataKey="profit"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scenarios Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tabela de Cenários Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold">Variação</th>
                  <th className="text-right py-2 px-2 font-semibold">Receita</th>
                  <th className="text-right py-2 px-2 font-semibold">Despesas</th>
                  <th className="text-right py-2 px-2 font-semibold">Lucro</th>
                  <th className="text-right py-2 px-2 font-semibold">Margem</th>
                  <th className="text-center py-2 px-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr
                    key={scenario.variation}
                    className={`border-b border-border hover:bg-muted/50 ${
                      scenario.variation === revenueVariation ? "bg-yellow-50" : ""
                    }`}
                  >
                    <td className="py-2 px-2 font-medium">
                      {scenario.variation > 0 ? "+" : ""}{scenario.variation}%
                    </td>
                    <td className="text-right py-2 px-2 text-orange-600">
                      {financialValue(formatCurrency(scenario.revenue))}
                    </td>
                    <td className="text-right py-2 px-2 text-cyan-600">
                      {financialValue(formatCurrency(scenario.expenses))}
                    </td>
                    <td className={`text-right py-2 px-2 font-bold ${scenario.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {financialValue(formatCurrency(scenario.profit))}
                    </td>
                    <td className="text-right py-2 px-2 font-medium">
                      {scenario.profitMargin.toFixed(1)}%
                    </td>
                    <td className="text-center py-2 px-2">
                      <Badge variant={scenario.status === "positive" ? "default" : "destructive"}>
                        {scenario.status === "positive" ? "✓" : scenario.status === "warning" ? "⚠" : "✗"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Break-even Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Análise de Ponto de Equilíbrio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Ponto de Equilíbrio</p>
              <p className="text-2xl font-bold text-amber-600">{financialValue(formatCurrency(breakEvenPoint))}</p>
              <p className="text-xs text-muted-foreground mt-1">Faturamento mínimo necessário</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margem até Equilíbrio</p>
              <p className="text-2xl font-bold text-blue-600">
                {financialValue(formatCurrency(Math.max(0, baseRevenue - breakEvenPoint)))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Quanto pode reduzir</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Percentual de Segurança</p>
              <p className="text-2xl font-bold text-green-600">
                {baseRevenue > 0 ? (((baseRevenue - breakEvenPoint) / baseRevenue) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Redução possível</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
