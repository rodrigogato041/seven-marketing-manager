import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as db from "./db";
import { sql } from "drizzle-orm";

describe("Content Production Tracking", () => {
  const testClientId = 999;
  const testYear = 2026;
  const testMonth = 4;

  beforeEach(async () => {
    // Limpar dados de teste anteriores
    try {
      await db.database.execute(
        sql`DELETE FROM content_production WHERE client_id = ${testClientId}`
      );
    } catch (e) {
      // Tabela pode não existir ainda
    }
  });

  afterEach(async () => {
    // Limpar dados de teste
    try {
      await db.database.execute(
        sql`DELETE FROM content_production WHERE client_id = ${testClientId}`
      );
    } catch (e) {
      // Tabela pode não existir ainda
    }
  });

  it("should get production tracking for a client (new record)", async () => {
    const result = await db.getProductionTrackingForClient(
      testClientId,
      testYear,
      testMonth
    );

    // Se não existir, deve retornar null ou um objeto vazio
    expect(result).toBeDefined();
  });

  it("should update production tracking", async () => {
    const videosProduced = 3;
    const imagesProduced = 5;

    const result = await db.updateProductionTracking(
      testClientId,
      testYear,
      testMonth,
      videosProduced,
      imagesProduced
    );

    expect(result).toBeDefined();

    // Verificar se foi salvo
    const retrieved = await db.getProductionTrackingForClient(
      testClientId,
      testYear,
      testMonth
    );

    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(retrieved.videosProduced).toBe(videosProduced);
      expect(retrieved.imagesProduced).toBe(imagesProduced);
    }
  });

  it("should update existing production tracking", async () => {
    // Primeira inserção
    await db.updateProductionTracking(testClientId, testYear, testMonth, 2, 3);

    // Segunda atualização
    const result = await db.updateProductionTracking(
      testClientId,
      testYear,
      testMonth,
      5,
      8
    );

    expect(result).toBeDefined();

    // Verificar se foi atualizado (não duplicado)
    const retrieved = await db.getProductionTrackingForClient(
      testClientId,
      testYear,
      testMonth
    );

    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(retrieved.videosProduced).toBe(5);
      expect(retrieved.imagesProduced).toBe(8);
    }
  });

  it("should handle zero production values", async () => {
    const result = await db.updateProductionTracking(
      testClientId,
      testYear,
      testMonth,
      0,
      0
    );

    expect(result).toBeDefined();

    const retrieved = await db.getProductionTrackingForClient(
      testClientId,
      testYear,
      testMonth
    );

    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(retrieved.videosProduced).toBe(0);
      expect(retrieved.imagesProduced).toBe(0);
    }
  });

  it("should handle large production values", async () => {
    const largeNumber = 999;

    const result = await db.updateProductionTracking(
      testClientId,
      testYear,
      testMonth,
      largeNumber,
      largeNumber
    );

    expect(result).toBeDefined();

    const retrieved = await db.getProductionTrackingForClient(
      testClientId,
      testYear,
      testMonth
    );

    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(retrieved.videosProduced).toBe(largeNumber);
      expect(retrieved.imagesProduced).toBe(largeNumber);
    }
  });
});
