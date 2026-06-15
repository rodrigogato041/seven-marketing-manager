import { describe, expect, it } from "vitest";
import { buildContractInsight } from "./db";

const referenceDate = new Date(2026, 5, 15, 12, 0, 0, 0);

describe("contract insight", () => {
  it("marks clients without contract data as missing", () => {
    const insight = buildContractInsight({ id: 1, companyName: "Sem Contrato" }, [], referenceDate);

    expect(insight.key).toBe("missing");
    expect(insight.severity).toBe("warning");
    expect(insight.label).toBe("Sem contrato cadastrado");
  });

  it("flags contracts that are close to the end date", () => {
    const endDate = new Date(2026, 5, 20, 12, 0, 0, 0).getTime();
    const insight = buildContractInsight({ id: 2, companyName: "Renovar", contractStatus: "active", contractEndDate: endDate }, [], referenceDate);

    expect(insight.key).toBe("due_7");
    expect(insight.severity).toBe("critical");
    expect(insight.daysUntil).toBe(5);
  });

  it("flags expired contracts as critical", () => {
    const endDate = new Date(2026, 5, 10, 12, 0, 0, 0).getTime();
    const insight = buildContractInsight({ id: 3, companyName: "Vencido", contractStatus: "active", contractEndDate: endDate }, [], referenceDate);

    expect(insight.key).toBe("expired");
    expect(insight.severity).toBe("critical");
    expect(insight.label).toBe("Contrato vencido");
  });

  it("accepts a contract document as proof of registered contract", () => {
    const insight = buildContractInsight(
      { id: 4, companyName: "Documento", contractStatus: "active" },
      [{ id: 10, clientId: 4, category: "contract" }],
      referenceDate
    );

    expect(insight.hasContract).toBe(true);
    expect(insight.hasContractDocument).toBe(true);
    expect(insight.key).toBe("active");
  });
});
