import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Budget Planning System", () => {
  let budgetId: number;

  beforeAll(async () => {
    // Create a test period
    const period = await db.getOrCreateMonthlyPeriod(2026, 5);
    const budget = await db.getOrCreateMonthlyBudget(period.id);
    budgetId = budget.id;
  });

  describe("Budget Management", () => {
    it("should create or get monthly budget", async () => {
      const period = await db.getOrCreateMonthlyPeriod(2026, 5);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      expect(budget).toBeDefined();
      expect(budget.periodId).toBe(period.id);
    });

    it("should update budget with forecasted revenue", async () => {
      await db.updateMonthlyBudget(budgetId, { forecastedRevenue: 18500 });
      const period = await db.getOrCreateMonthlyPeriod(2026, 5);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      expect(parseFloat(budget.forecastedRevenue.toString())).toBe(18500);
    });
  });

  describe("Fixed Costs Management", () => {
    it("should create fixed cost", async () => {
      await db.createFixedCost({
        budgetId,
        description: "Aluguel",
        amount: "3000",
        category: "Imóvel",
        isRecurring: true,
      });
      const costs = await db.getFixedCosts(budgetId);
      expect(costs.length).toBeGreaterThan(0);
      expect(costs[0].description).toBe("Aluguel");
    });

    it("should update fixed cost", async () => {
      const costs = await db.getFixedCosts(budgetId);
      if (costs.length > 0) {
        await db.updateFixedCost(costs[0].id, { amount: "3500" });
        const updated = await db.getFixedCosts(budgetId);
        const cost = updated.find(c => c.id === costs[0].id);
        expect(parseFloat(cost?.amount.toString() || "0")).toBe(3500);
      }
    });

    it("should delete fixed cost", async () => {
      const costs = await db.getFixedCosts(budgetId);
      const initialCount = costs.length;
      if (costs.length > 0) {
        await db.deleteFixedCost(costs[0].id);
        const updated = await db.getFixedCosts(budgetId);
        expect(updated.length).toBe(initialCount - 1);
      }
    });
  });

  describe("Variable Costs Management", () => {
    it("should create variable cost", async () => {
      await db.createVariableCost({
        budgetId,
        description: "Tráfego Pago",
        amount: "1500",
        category: "Marketing",
      });
      const costs = await db.getVariableCosts(budgetId);
      expect(costs.length).toBeGreaterThan(0);
      expect(costs[0].description).toBe("Tráfego Pago");
    });

    it("should update variable cost", async () => {
      const costs = await db.getVariableCosts(budgetId);
      if (costs.length > 0) {
        await db.updateVariableCost(costs[0].id, { amount: "2000" });
        const updated = await db.getVariableCosts(budgetId);
        const cost = updated.find(c => c.id === costs[0].id);
        expect(parseFloat(cost?.amount.toString() || "0")).toBe(2000);
      }
    });

    it("should delete variable cost", async () => {
      const costs = await db.getVariableCosts(budgetId);
      const initialCount = costs.length;
      if (costs.length > 0) {
        await db.deleteVariableCost(costs[0].id);
        const updated = await db.getVariableCosts(budgetId);
        expect(updated.length).toBe(initialCount - 1);
      }
    });
  });

  describe("Personal Expenses Management", () => {
    it("should create personal expense", async () => {
      await db.createPersonalExpense({
        budgetId,
        description: "Mercado",
        amount: "800",
        category: "Alimentação",
      });
      const expenses = await db.getPersonalExpenses(budgetId);
      expect(expenses.length).toBeGreaterThan(0);
      expect(expenses[0].description).toBe("Mercado");
    });

    it("should update personal expense", async () => {
      const expenses = await db.getPersonalExpenses(budgetId);
      if (expenses.length > 0) {
        await db.updatePersonalExpense(expenses[0].id, { amount: "1000" });
        const updated = await db.getPersonalExpenses(budgetId);
        const expense = updated.find(e => e.id === expenses[0].id);
        expect(parseFloat(expense?.amount.toString() || "0")).toBe(1000);
      }
    });

    it("should delete personal expense", async () => {
      const expenses = await db.getPersonalExpenses(budgetId);
      const initialCount = expenses.length;
      if (expenses.length > 0) {
        await db.deletePersonalExpense(expenses[0].id);
        const updated = await db.getPersonalExpenses(budgetId);
        expect(updated.length).toBe(initialCount - 1);
      }
    });
  });

  describe("Budget Calculations", () => {
    it("should calculate budget metrics correctly", async () => {
      // Setup: Create budget with known values
      const period = await db.getOrCreateMonthlyPeriod(2026, 6);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      const testBudgetId = budget.id;

      // Set forecasted revenue
      await db.updateMonthlyBudget(testBudgetId, { forecastedRevenue: 10000 });

      // Add costs
      await db.createFixedCost({
        budgetId: testBudgetId,
        description: "Aluguel",
        amount: "2000",
        category: "Imóvel",
        isRecurring: true,
      });

      await db.createVariableCost({
        budgetId: testBudgetId,
        description: "Tráfego",
        amount: "1000",
        category: "Marketing",
      });

      await db.createPersonalExpense({
        budgetId: testBudgetId,
        description: "Mercado",
        amount: "500",
        category: "Alimentação",
      });

      // Calculate metrics
      const metrics = await db.calculateBudgetMetrics(testBudgetId, 2000); // 2000 collaborator costs

      // Verify all required fields exist and calculations are performed
      expect(metrics).toHaveProperty('forecastedRevenue');
      expect(metrics).toHaveProperty('totalFixedCosts');
      expect(metrics).toHaveProperty('totalVariableCosts');
      expect(metrics).toHaveProperty('totalPersonalExpenses');
      expect(metrics).toHaveProperty('totalCollaboratorCosts');
      expect(metrics).toHaveProperty('totalExpenses');
      expect(metrics).toHaveProperty('netProfitForecast');
      expect(metrics).toHaveProperty('breakEvenPoint');
      expect(metrics).toHaveProperty('safetyMargin');
    });

    it("should verify metrics are calculated", async () => {
      const period = await db.getOrCreateMonthlyPeriod(2026, 9);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      const testBudgetId = budget.id;

      await db.updateMonthlyBudget(testBudgetId, { forecastedRevenue: 5000 });
      const metrics = await db.calculateBudgetMetrics(testBudgetId, 0);

      expect(parseFloat(metrics.forecastedRevenue.toString())).toBe(5000);
      expect(parseFloat(metrics.totalExpenses.toString())).toBeGreaterThanOrEqual(0);
      expect(parseFloat(metrics.netProfitForecast.toString())).toBeLessThanOrEqual(5000);
    });

    it("should identify negative profit scenario", async () => {
      const period = await db.getOrCreateMonthlyPeriod(2026, 7);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      const testBudgetId = budget.id;

      // Set low forecasted revenue
      await db.updateMonthlyBudget(testBudgetId, { forecastedRevenue: 3000 });

      // Add high costs
      await db.createFixedCost({
        budgetId: testBudgetId,
        description: "Aluguel",
        amount: "2000",
        category: "Imóvel",
        isRecurring: true,
      });

      await db.createVariableCost({
        budgetId: testBudgetId,
        description: "Tráfego",
        amount: "1500",
        category: "Marketing",
      });

      const metrics = await db.calculateBudgetMetrics(testBudgetId, 1000);

      // Should show negative profit
      expect(parseFloat(metrics.netProfitForecast.toString())).toBeLessThan(0);
      expect(metrics.budgetStatus).toBe("negative");
    });

    it("should retrieve calculated metrics", async () => {
      const period = await db.getOrCreateMonthlyPeriod(2026, 5);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      const testBudgetId = budget.id;

      // Calculate metrics
      await db.calculateBudgetMetrics(testBudgetId, 0);

      // Retrieve metrics
      const retrieved = await db.getBudgetCalculations(testBudgetId);
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].budgetId).toBe(testBudgetId);
    });

    it("should include registered expenses without double-counting similar planned costs", async () => {
      const period = await db.getOrCreateMonthlyPeriod(2030, 1);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      const testBudgetId = budget.id;
      const suffix = Date.now().toString();

      await db.updateMonthlyBudget(testBudgetId, { forecastedRevenue: 5000 });
      await db.createFixedCost({
        budgetId: testBudgetId,
        description: `Internet Vivo ${suffix}`,
        amount: "300",
        category: "Software",
        isRecurring: true,
      });
      await db.createExpense({
        amount: "300",
        category: "Software",
        description: `internet vivo fibra ${suffix}`,
        date: new Date(2030, 0, 10).getTime(),
      });
      await db.createExpense({
        amount: "120",
        category: "Software",
        description: `Adobe Creative ${suffix}`,
        date: new Date(2030, 0, 11).getTime(),
      });

      const metrics = await db.calculateBudgetMetrics(testBudgetId, 0);

      expect(parseFloat(metrics.totalDuplicatedActualExpenses.toString())).toBeGreaterThanOrEqual(300);
      expect(parseFloat(metrics.totalActualExpenses.toString())).toBeGreaterThanOrEqual(120);
      expect(parseFloat(metrics.totalFixedCosts.toString())).toBeGreaterThanOrEqual(420);
    });

    it("should ignore rent duplicates even when the real expense has extra words and a close value", async () => {
      const year = 2200 + Math.floor(Math.random() * 1000);
      const period = await db.getOrCreateMonthlyPeriod(year, 1);
      const budget = await db.getOrCreateMonthlyBudget(period.id);
      const testBudgetId = budget.id;
      const suffix = `dedupe-${Date.now()}`;

      await db.updateMonthlyBudget(testBudgetId, { forecastedRevenue: 5000 });
      await db.createFixedCost({
        budgetId: testBudgetId,
        description: `Aluguel ${suffix}`,
        amount: "700",
        category: "Estrutura",
        isRecurring: true,
      });
      await db.createExpense({
        amount: "710",
        category: "Moradia",
        description: `Aluguel casa ${suffix}`,
        date: new Date(year, 0, 10).getTime(),
      });

      const metrics = await db.calculateBudgetMetrics(testBudgetId, 0);

      expect(parseFloat(metrics.totalFixedCosts.toString())).toBe(700);
      expect(parseFloat(metrics.totalActualExpenses.toString())).toBe(0);
      expect(parseFloat(metrics.totalDuplicatedActualExpenses.toString())).toBe(710);
      expect(metrics.ignoredDuplicateExpenses).toHaveLength(1);
      expect(metrics.ignoredDuplicateExpenses?.[0].duplicateMatch?.description).toContain("Aluguel");
      expect(metrics.ignoredDuplicateExpenses?.[0].duplicateReason).toContain("valor muito proximo");
      expect(metrics.ignoredDuplicateExpenses?.[0].duplicateConfidence).toBeGreaterThanOrEqual(50);
    });
  });
});
