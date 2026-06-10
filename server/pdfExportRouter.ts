import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod/v4";
import {
  getOrCreateMonthlyPeriod,
  getOrCreateMonthlyBudget,
  getFixedCosts,
  getVariableCosts,
  getPersonalExpenses,
  getBudgetCalculations,
  listExpenses,
} from "./db";

export const pdfExportRouter = router({
  // Generate budget planning report data
  getBudgetPlanningReportData: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const period = await getOrCreateMonthlyPeriod(input.year, input.month);
      const budget = await getOrCreateMonthlyBudget(period.id);
      
      const fixedCosts = await getFixedCosts(budget.id || 0);
      const variableCosts = await getVariableCosts(budget.id || 0);
      const personalExpenses = await getPersonalExpenses(budget.id || 0);
      const calculations = await getBudgetCalculations(budget.id || 0);
      
      const calc = calculations.length > 0 ? calculations[0] : null;

      return {
        period: {
          year: input.year,
          month: input.month,
          monthName: new Date(input.year, input.month - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" }),
        },
        budget: {
          id: budget.id,
          forecastedRevenue: parseFloat(budget.forecastedRevenue?.toString() || "0"),
        },
        costs: {
          fixed: fixedCosts.map(c => ({
            id: c.id,
            description: c.description,
            amount: parseFloat(c.amount.toString()),
            category: c.category,
            isRecurring: c.isRecurring,
          })),
          variable: variableCosts.map(c => ({
            id: c.id,
            description: c.description,
            amount: parseFloat(c.amount.toString()),
            category: c.category,
          })),
          personal: personalExpenses.map(e => ({
            id: e.id,
            description: e.description,
            amount: parseFloat(e.amount.toString()),
            category: e.category,
          })),
        },
        metrics: calc ? {
          forecastedRevenue: parseFloat(calc.forecastedRevenue.toString()),
          totalFixedCosts: parseFloat(calc.totalFixedCosts.toString()),
          totalVariableCosts: parseFloat(calc.totalVariableCosts.toString()),
          totalPersonalExpenses: parseFloat(calc.totalPersonalExpenses.toString()),
          totalCollaboratorCosts: parseFloat(calc.totalCollaboratorCosts.toString()),
          totalExpenses: parseFloat(calc.totalExpenses.toString()),
          netProfitForecast: parseFloat(calc.netProfitForecast.toString()),
          breakEvenPoint: parseFloat(calc.breakEvenPoint.toString()),
          safetyMargin: parseFloat(calc.safetyMargin.toString()),
          profitMarginPercentage: parseFloat(calc.profitMarginPercentage.toString()),
          status: calc.status,
        } : null,
      };
    }),

  // Generate expense analysis report data
  getExpenseAnalysisReportData: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const expenses = await listExpenses();
      
      // Filter expenses for the given month
      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getFullYear() === input.year && 
               expenseDate.getMonth() === input.month - 1;
      });

      // Group by category
      const byCategory: Record<string, { total: number; items: typeof monthExpenses }> = {};
      monthExpenses.forEach(expense => {
        if (!byCategory[expense.category]) {
          byCategory[expense.category] = { total: 0, items: [] };
        }
        byCategory[expense.category].total += parseFloat(expense.amount.toString());
        byCategory[expense.category].items.push(expense);
      });

      const totalExpenses = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

      return {
        period: {
          year: input.year,
          month: input.month,
          monthName: new Date(input.year, input.month - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" }),
        },
        summary: {
          totalExpenses,
          expenseCount: monthExpenses.length,
          categoryCount: Object.keys(byCategory).length,
        },
        byCategory: Object.entries(byCategory).map(([category, data]) => ({
          category,
          total: Math.round(data.total * 100) / 100,
          percentage: Math.round((data.total / totalExpenses) * 100 * 100) / 100,
          itemCount: data.items.length,
          items: data.items.map(item => ({
            description: item.description,
            amount: parseFloat(item.amount.toString()),
            date: item.date,
          })),
        })),
        expenses: monthExpenses.map(e => ({
          date: e.date,
          description: e.description,
          category: e.category,
          amount: parseFloat(e.amount.toString()),
        })),
      };
    }),
});
