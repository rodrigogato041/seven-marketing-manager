import { describe, expect, it } from "vitest";
import { isWithinOperatingHours } from "./policy";

describe("operating window", () => {
  it("uses the configured timezone", () => {
    expect(isWithinOperatingHours(new Date("2026-10-23T15:00:00Z"), "09:00-18:00", "America/Sao_Paulo")).toBe(true);
    expect(isWithinOperatingHours(new Date("2026-10-23T23:00:00Z"), "09:00-18:00", "America/Sao_Paulo")).toBe(false);
  });
});
