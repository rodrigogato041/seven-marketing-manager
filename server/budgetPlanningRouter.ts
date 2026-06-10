import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getOrCreateMonthlyBudget,
  updateMonthlyBudget,
  createFixedCost,
  getFixedCosts,
  updateFixedCost,
  deleteFixedCost,
  createVariableCost,
  getVariableCosts,
  updateVariableCost,
  deleteVariableCost,
  createPersonalExpense,
  getPersonalExpenses,
  updatePersonalExpense,
  deletePersonalExpense,
  calculateBudgetMetrics,
  getBudgetCalculations,
  getOrCreateMonthlyPeriod,
  listCollaborators,
} from "./db";

export const budgetPlanningRouter = router({
  // Budget Management
  getOrCreateBudget: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const period = await getOrCreateMonthlyPeriod(input.year, input.month);
      const budget = await getOrCreateMonthlyBudget(period.id);
      return budget;
    }),

  updateBudget: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      forecastedRevenue: z.number().optional(),
      profitTarget: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateMonthlyBudget(input.budgetId, {
        forecastedRevenue: input.forecastedRevenue,
        profitTarget: input.profitTarget,
        notes: input.notes,
      });
      return { success: true };
    }),

  // Fixed Costs
  createFixedCost: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      description: z.string(),
      amount: z.number(),
      category: z.string(),
      isRecurring: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      await createFixedCost({
        budgetId: input.budgetId,
        description: input.description,
        amount: input.amount.toString(),
        category: input.category,
        isRecurring: input.isRecurring,
      });
      return { success: true };
    }),

  getFixedCosts: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      const costs = await getFixedCosts(input.budgetId);
      return costs.map(c => ({
        ...c,
        amount: parseFloat(c.amount.toString()),
      }));
    }),

  updateFixedCost: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      amount: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updateData: any = {};
      if (input.description) updateData.description = input.description;
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.category) updateData.category = input.category;
      await updateFixedCost(input.id, updateData);
      return { success: true };
    }),

  deleteFixedCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFixedCost(input.id);
      return { success: true };
    }),

  // Variable Costs
  createVariableCost: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      description: z.string(),
      amount: z.number(),
      category: z.string(),
    }))
    .mutation(async ({ input }) => {
      await createVariableCost({
        budgetId: input.budgetId,
        description: input.description,
        amount: input.amount.toString(),
        category: input.category,
      });
      return { success: true };
    }),

  getVariableCosts: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      const costs = await getVariableCosts(input.budgetId);
      return costs.map(c => ({
        ...c,
        amount: parseFloat(c.amount.toString()),
      }));
    }),

  updateVariableCost: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      amount: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updateData: any = {};
      if (input.description) updateData.description = input.description;
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.category) updateData.category = input.category;
      await updateVariableCost(input.id, updateData);
      return { success: true };
    }),

  deleteVariableCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteVariableCost(input.id);
      return { success: true };
    }),

  // Personal Expenses
  createPersonalExpense: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      description: z.string(),
      amount: z.number(),
      category: z.string(),
    }))
    .mutation(async ({ input }) => {
      await createPersonalExpense({
        budgetId: input.budgetId,
        description: input.description,
        amount: input.amount.toString(),
        category: input.category,
      });
      return { success: true };
    }),

  getPersonalExpenses: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      const expenses = await getPersonalExpenses(input.budgetId);
      return expenses.map(e => ({
        ...e,
        amount: parseFloat(e.amount.toString()),
      }));
    }),

  updatePersonalExpense: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      amount: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updateData: any = {};
      if (input.description) updateData.description = input.description;
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.category) updateData.category = input.category;
      await updatePersonalExpense(input.id, updateData);
      return { success: true };
    }),

  deletePersonalExpense: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePersonalExpense(input.id);
      return { success: true };
    }),

  // Budget Calculations
  calculateMetrics: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .mutation(async ({ input }) => {
      // Get collaborator costs
      const collaborators = await listCollaborators();
      const collaboratorCosts = collaborators.reduce((sum: number, c: any) => sum + parseFloat(c.monthlyCost.toString()), 0);
      
      const metrics = await calculateBudgetMetrics(input.budgetId, collaboratorCosts);
      return {
        ...metrics,
        forecastedRevenue: parseFloat(metrics.forecastedRevenue.toString()),
        totalFixedCosts: parseFloat(metrics.totalFixedCosts.toString()),
        totalVariableCosts: parseFloat(metrics.totalVariableCosts.toString()),
        totalPersonalExpenses: parseFloat(metrics.totalPersonalExpenses.toString()),
        totalCollaboratorCosts: parseFloat(metrics.totalCollaboratorCosts.toString()),
        totalExpenses: parseFloat(metrics.totalExpenses.toString()),
        netProfitForecast: parseFloat(metrics.netProfitForecast.toString()),
        breakEvenPoint: parseFloat(metrics.breakEvenPoint.toString()),
        safetyMargin: parseFloat(metrics.safetyMargin.toString()),
        profitMarginPercentage: parseFloat(metrics.profitMarginPercentage.toString()),
      };
    }),

  getMetrics: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      const calcs = await getBudgetCalculations(input.budgetId);
      if (!calcs.length) return null;
      const calc = calcs[0];
      return {
        ...calc,
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
      };
    }),
});
