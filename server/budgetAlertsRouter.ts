import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod/v4";
import {
  getOrCreateMonthlyPeriod,
  getOrCreateMonthlyBudget,
  getFixedCosts,
  getVariableCosts,
  getPersonalExpenses,
  listBudgetLimits,
  upsertBudgetLimit,
} from "./db";

export const budgetAlertsRouter = router({
  // Check if expenses exceed budget limits
  checkBudgetAlerts: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const period = await getOrCreateMonthlyPeriod(input.year, input.month);
      const budget = await getOrCreateMonthlyBudget(period.id);
      
      const fixedCosts = await getFixedCosts(budget.id || 0);
      const variableCosts = await getVariableCosts(budget.id || 0);
      const personalExpenses = await getPersonalExpenses(budget.id || 0);

      const limits = await listBudgetLimits();
      const limitMap: Record<string, Record<string, number>> = {};
      
      limits.forEach(limit => {
        if (!limitMap[limit.costType]) {
          limitMap[limit.costType] = {};
        }
        limitMap[limit.costType][limit.category] = parseFloat(limit.limitAmount.toString());
      });

      const alerts: Array<{
        type: "warning" | "critical";
        category: string;
        message: string;
        current: number;
        limit?: number;
        percentage?: number;
      }> = [];

      // Check fixed costs by category
      const fixedByCategory: Record<string, number> = {};
      fixedCosts.forEach(cost => {
        if (!fixedByCategory[cost.category]) {
          fixedByCategory[cost.category] = 0;
        }
        fixedByCategory[cost.category] += parseFloat(cost.amount.toString());
      });

      // Check variable costs by category
      const variableByCategory: Record<string, number> = {};
      variableCosts.forEach(cost => {
        if (!variableByCategory[cost.category]) {
          variableByCategory[cost.category] = 0;
        }
        variableByCategory[cost.category] += parseFloat(cost.amount.toString());
      });

      // Check personal expenses by category
      const personalByCategory: Record<string, number> = {};
      personalExpenses.forEach(expense => {
        if (!personalByCategory[expense.category]) {
          personalByCategory[expense.category] = 0;
        }
        personalByCategory[expense.category] += parseFloat(expense.amount.toString());
      });

      // Check fixed costs against limits
      Object.entries(fixedByCategory).forEach(([category, total]) => {
        const limit = limitMap["fixed"]?.[category];
        if (limit) {
          const percentage = (total / limit) * 100;
          if (percentage > 100) {
            alerts.push({
              type: "critical",
              category: `Custo Fixo: ${category}`,
              message: `Custo fixo "${category}" excedeu o limite em ${(percentage - 100).toFixed(1)}%`,
              current: total,
              limit,
              percentage,
            });
          } else if (percentage > 80) {
            alerts.push({
              type: "warning",
              category: `Custo Fixo: ${category}`,
              message: `Custo fixo "${category}" está em ${percentage.toFixed(1)}% do limite`,
              current: total,
              limit,
              percentage,
            });
          }
        }
      });

      // Check variable costs against limits
      Object.entries(variableByCategory).forEach(([category, total]) => {
        const limit = limitMap["variable"]?.[category];
        if (limit) {
          const percentage = (total / limit) * 100;
          if (percentage > 100) {
            alerts.push({
              type: "critical",
              category: `Custo Variável: ${category}`,
              message: `Custo variável "${category}" excedeu o limite em ${(percentage - 100).toFixed(1)}%`,
              current: total,
              limit,
              percentage,
            });
          } else if (percentage > 80) {
            alerts.push({
              type: "warning",
              category: `Custo Variável: ${category}`,
              message: `Custo variável "${category}" está em ${percentage.toFixed(1)}% do limite`,
              current: total,
              limit,
              percentage,
            });
          }
        }
      });

      // Check personal expenses against limits
      Object.entries(personalByCategory).forEach(([category, total]) => {
        const limit = limitMap["personal"]?.[category];
        if (limit) {
          const percentage = (total / limit) * 100;
          if (percentage > 100) {
            alerts.push({
              type: "critical",
              category: `Despesa Pessoal: ${category}`,
              message: `Despesa pessoal "${category}" excedeu o limite em ${(percentage - 100).toFixed(1)}%`,
              current: total,
              limit,
              percentage,
            });
          } else if (percentage > 80) {
            alerts.push({
              type: "warning",
              category: `Despesa Pessoal: ${category}`,
              message: `Despesa pessoal "${category}" está em ${percentage.toFixed(1)}% do limite`,
              current: total,
              limit,
              percentage,
            });
          }
        }
      });

      return {
        period: {
          year: input.year,
          month: input.month,
        },
        alerts: alerts.sort((a, b) => {
          // Sort by type (critical first) then by percentage
          if (a.type !== b.type) {
            return a.type === "critical" ? -1 : 1;
          }
          return (b.percentage || 0) - (a.percentage || 0);
        }),
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.type === "critical").length,
          warning: alerts.filter(a => a.type === "warning").length,
        },
      };
    }),

  // Get all budget limits
  getBudgetLimits: protectedProcedure.query(async () => {
    const limits = await listBudgetLimits();
    
    const limitsByType: Record<string, Array<{ category: string; limit: number; description: string }>> = {
      fixed: [],
      variable: [],
      personal: [],
    };

    limits.forEach(limit => {
      limitsByType[limit.costType as keyof typeof limitsByType].push({
        category: limit.category,
        limit: parseFloat(limit.limitAmount.toString()),
        description: limit.description || "",
      });
    });

    return limitsByType;
  }),

  // Update a budget limit
  updateBudgetLimit: protectedProcedure
    .input(z.object({
      category: z.string(),
      costType: z.enum(["fixed", "variable", "personal"]),
      limitAmount: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      await upsertBudgetLimit(input);
      return { success: true, message: "Limite atualizado com sucesso" };
    }),
});
