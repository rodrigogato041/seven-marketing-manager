import { describe, it, expect } from "vitest";

describe("Expense Analysis - Pie Chart Data", () => {
  interface ExpenseData {
    id: number;
    amount: string | number;
    category: string;
    description?: string | null;
    date: number;
  }

  const mockExpenses: ExpenseData[] = [
    { id: 1, amount: 1000, category: "Colaborador", description: "Salário", date: Date.now() },
    { id: 2, amount: 500, category: "Software", description: "Ferramentas", date: Date.now() },
    { id: 3, amount: 300, category: "Marketing", description: "Anúncios", date: Date.now() },
    { id: 4, amount: 200, category: "Operacional", description: "Aluguel", date: Date.now() },
    { id: 5, amount: 150, category: "Colaborador", description: "Freelancer", date: Date.now() },
  ];

  it("should aggregate expenses by category", () => {
    const categoryMap = new Map<string, number>();

    mockExpenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    expect(categoryMap.get("Colaborador")).toBe(1150);
    expect(categoryMap.get("Software")).toBe(500);
    expect(categoryMap.get("Marketing")).toBe(300);
    expect(categoryMap.get("Operacional")).toBe(200);
  });

  it("should calculate total expenses", () => {
    const total = mockExpenses.reduce((sum, exp) => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      return sum + amount;
    }, 0);

    expect(total).toBe(2150);
  });

  it("should calculate percentage for each category", () => {
    const categoryMap = new Map<string, number>();
    mockExpenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    const total = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);

    const percentages: Record<string, number> = {};
    categoryMap.forEach((value, key) => {
      percentages[key] = (value / total) * 100;
    });

    expect(percentages["Colaborador"]).toBeCloseTo(53.49, 1);
    expect(percentages["Software"]).toBeCloseTo(23.26, 1);
    expect(percentages["Marketing"]).toBeCloseTo(13.95, 1);
    expect(percentages["Operacional"]).toBeCloseTo(9.30, 1);
  });

  it("should sort categories by value descending", () => {
    const categoryMap = new Map<string, number>();
    mockExpenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    const sorted = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    expect(sorted[0].name).toBe("Colaborador");
    expect(sorted[1].name).toBe("Software");
    expect(sorted[2].name).toBe("Marketing");
    expect(sorted[3].name).toBe("Operacional");
  });

  it("should handle empty expenses list", () => {
    const emptyExpenses: ExpenseData[] = [];
    const categoryMap = new Map<string, number>();

    emptyExpenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    expect(categoryMap.size).toBe(0);
  });

  it("should handle single expense", () => {
    const singleExpense: ExpenseData[] = [
      { id: 1, amount: 500, category: "Software", description: "Ferramentas", date: Date.now() },
    ];

    const categoryMap = new Map<string, number>();
    singleExpense.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    const total = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);

    expect(categoryMap.get("Software")).toBe(500);
    expect(total).toBe(500);
  });

  it("should handle expenses with string amounts", () => {
    const stringExpenses: ExpenseData[] = [
      { id: 1, amount: "1000.50", category: "Colaborador", description: "Salário", date: Date.now() },
      { id: 2, amount: "500.25", category: "Software", description: "Ferramentas", date: Date.now() },
    ];

    const categoryMap = new Map<string, number>();
    stringExpenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    expect(categoryMap.get("Colaborador")).toBeCloseTo(1000.50, 2);
    expect(categoryMap.get("Software")).toBeCloseTo(500.25, 2);
  });

  it("should calculate correct percentage with multiple same categories", () => {
    const expenses: ExpenseData[] = [
      { id: 1, amount: 1000, category: "Colaborador", description: "Salário 1", date: Date.now() },
      { id: 2, amount: 500, category: "Colaborador", description: "Salário 2", date: Date.now() },
      { id: 3, amount: 1500, category: "Outro", description: "Despesa", date: Date.now() },
    ];

    const categoryMap = new Map<string, number>();
    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + amount);
    });

    const total = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
    const colaboradorPercent = (categoryMap.get("Colaborador")! / total) * 100;
    const outroPercent = (categoryMap.get("Outro")! / total) * 100;

    expect(colaboradorPercent).toBeCloseTo(50, 1);
    expect(outroPercent).toBeCloseTo(50, 1);
  });

  it("should aggregate by description when available (detailed view)", () => {
    const expenses: ExpenseData[] = [
      { id: 1, amount: 150, category: "Operacional", description: "Mercado", date: Date.now() },
      { id: 2, amount: 80, category: "Operacional", description: "Água", date: Date.now() },
      { id: 3, amount: 120, category: "Operacional", description: "Luz", date: Date.now() },
      { id: 4, amount: 100, category: "Operacional", description: "Internet", date: Date.now() },
    ];

    const detailMap = new Map<string, number>();
    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const key = exp.description && exp.description.trim() ? exp.description.trim() : exp.category;
      const current = detailMap.get(key) || 0;
      detailMap.set(key, current + amount);
    });

    expect(detailMap.get("Mercado")).toBe(150);
    expect(detailMap.get("Água")).toBe(80);
    expect(detailMap.get("Luz")).toBe(120);
    expect(detailMap.get("Internet")).toBe(100);
  });

  it("should fallback to category when description is empty", () => {
    const expenses: ExpenseData[] = [
      { id: 1, amount: 200, category: "Software", description: "Ferramentas", date: Date.now() },
      { id: 2, amount: 300, category: "Software", description: null, date: Date.now() },
      { id: 3, amount: 150, category: "Software", description: "", date: Date.now() },
    ];

    const detailMap = new Map<string, number>();
    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const key = exp.description && exp.description.trim() ? exp.description.trim() : exp.category;
      const current = detailMap.get(key) || 0;
      detailMap.set(key, current + amount);
    });

    expect(detailMap.get("Ferramentas")).toBe(200);
    expect(detailMap.get("Software")).toBe(450);
  });

  it("should handle detailed view with mixed descriptions", () => {
    const expenses: ExpenseData[] = [
      { id: 1, amount: 500, category: "Colaborador", description: "Salário", date: Date.now() },
      { id: 2, amount: 300, category: "Colaborador", description: "Freelancer", date: Date.now() },
      { id: 3, amount: 200, category: "Operacional", description: "Mercado", date: Date.now() },
      { id: 4, amount: 150, category: "Operacional", description: "Mercado", date: Date.now() },
    ];

    const detailMap = new Map<string, number>();
    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const key = exp.description && exp.description.trim() ? exp.description.trim() : exp.category;
      const current = detailMap.get(key) || 0;
      detailMap.set(key, current + amount);
    });

    expect(detailMap.get("Salário")).toBe(500);
    expect(detailMap.get("Freelancer")).toBe(300);
    expect(detailMap.get("Mercado")).toBe(350);
    expect(detailMap.size).toBe(3);
  });

  it("should aggregate multiple items with same description", () => {
    const expenses: ExpenseData[] = [
      { id: 1, amount: 100, category: "Operacional", description: "Mercado", date: Date.now() },
      { id: 2, amount: 150, category: "Operacional", description: "Mercado", date: Date.now() },
      { id: 3, amount: 200, category: "Operacional", description: "Mercado", date: Date.now() },
    ];

    const detailMap = new Map<string, number>();
    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const key = exp.description && exp.description.trim() ? exp.description.trim() : exp.category;
      const current = detailMap.get(key) || 0;
      detailMap.set(key, current + amount);
    });

    expect(detailMap.get("Mercado")).toBe(450);
    expect(detailMap.size).toBe(1);
  });

  it("should calculate percentages correctly in detailed view", () => {
    const expenses: ExpenseData[] = [
      { id: 1, amount: 500, category: "Operacional", description: "Mercado", date: Date.now() },
      { id: 2, amount: 300, category: "Operacional", description: "Água", date: Date.now() },
      { id: 3, amount: 200, category: "Operacional", description: "Luz", date: Date.now() },
    ];

    const detailMap = new Map<string, number>();
    expenses.forEach(exp => {
      const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
      const key = exp.description && exp.description.trim() ? exp.description.trim() : exp.category;
      const current = detailMap.get(key) || 0;
      detailMap.set(key, current + amount);
    });

    const total = Array.from(detailMap.values()).reduce((a, b) => a + b, 0);
    const mercadoPercent = (detailMap.get("Mercado")! / total) * 100;
    const aguaPercent = (detailMap.get("Água")! / total) * 100;
    const luzPercent = (detailMap.get("Luz")! / total) * 100;

    expect(mercadoPercent).toBeCloseTo(50, 1);
    expect(aguaPercent).toBeCloseTo(30, 1);
    expect(luzPercent).toBeCloseTo(20, 1);
  });
});
