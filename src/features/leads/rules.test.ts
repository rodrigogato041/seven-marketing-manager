import { describe, expect, it } from "vitest";
import { assertPipelineTransition, messagePassesClaimGuard, normalizeInstagramHandle } from "./rules";

describe("lead rules", () => {
  it("normalizes an Instagram URL", () => {
    expect(normalizeInstagramHandle("https://www.instagram.com/Empresa.Exemplo/" )).toBe("@empresa.exemplo");
  });

  it("rejects a skipped pipeline transition", () => {
    expect(() => assertPipelineTransition("discovered", "active_customer")).toThrow("Invalid pipeline transition");
  });

  it("blocks unsupported guarantees", () => {
    expect(messagePassesClaimGuard("Garantimos aumento de faturamento", [])).toBe(false);
    expect(messagePassesClaimGuard("Posso entender seu momento?", ["somos a maior agência"])).toBe(true);
  });
});
