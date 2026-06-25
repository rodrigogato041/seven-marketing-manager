import { describe, expect, it } from "vitest";
import { buildExpectedContractReceivables, getContractDueDateForWindow } from "./db";

describe("strategic finance cashflow", () => {
  it("creates expected receivables from active client contracts", () => {
    const reference = new Date(2026, 5, 24, 0, 0, 0, 0).getTime();
    const windowEnd = new Date(2026, 5, 30, 23, 59, 59, 999).getTime();
    const clients = [
      {
        id: 1,
        status: "active",
        companyName: "Sorria Odontologia",
        monthlyValue: "1000",
        contractDueDay: 28,
      },
    ];

    const items = buildExpectedContractReceivables(clients as any[], [], reference, windowEnd);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "contract_expected",
      label: "Sorria Odontologia",
      amount: 1000,
      status: "Previsto",
    });
  });

  it("does not duplicate expected receivable when a pending payment already exists for the same client month", () => {
    const reference = new Date(2026, 5, 24, 0, 0, 0, 0).getTime();
    const windowEnd = new Date(2026, 5, 30, 23, 59, 59, 999).getTime();
    const clients = [
      {
        id: 1,
        status: "active",
        companyName: "Sorria Odontologia",
        monthlyValue: "1000",
        contractDueDay: 28,
      },
    ];
    const payments = [
      {
        id: 10,
        clientId: 1,
        status: "pending",
        amount: "1000",
        dueDate: new Date(2026, 5, 28, 12, 0, 0, 0).getTime(),
      },
    ];

    const items = buildExpectedContractReceivables(clients as any[], payments as any[], reference, windowEnd);

    expect(items).toHaveLength(0);
  });

  it("keeps day 31 contracts inside shorter months using the last valid day", () => {
    const reference = new Date(2026, 1, 20, 0, 0, 0, 0).getTime();
    const windowEnd = new Date(2026, 1, 28, 23, 59, 59, 999).getTime();
    const client = {
      id: 1,
      status: "active",
      companyName: "Cliente dia 31",
      monthlyValue: "900",
      contractDueDay: 31,
    };

    const dueDate = getContractDueDateForWindow(client as any, reference, windowEnd);

    expect(new Date(dueDate as number).getDate()).toBe(28);
  });
});
