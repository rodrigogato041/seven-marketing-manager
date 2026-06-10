import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { User } from "../drizzle/schema";

// Mock authenticated context
function createAuthContext() {
  const mockUser: User = {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "oauth",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: mockUser,
    req: { headers: {} } as any,
    res: { setHeader: () => {}, clearCookie: () => {} } as any,
  };
}

function createUnauthContext() {
  return {
    user: null,
    req: { headers: {} } as any,
    res: { setHeader: () => {}, clearCookie: () => {} } as any,
  };
}

describe("Financial Routers - Investments & Credit Card", () => {
  describe("Investments Router - Authentication", () => {
    it("should require authentication for investments.create", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.investments.create({
          name: "Test Investment",
          type: "fixed",
          amount: "1000.00",
          date: Date.now(),
        });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should validate investment type enum", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      try {
        await caller.investments.create({
          name: "Test",
          type: "invalid" as any,
          amount: "1000.00",
          date: Date.now(),
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should require name for investments.create", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      try {
        await caller.investments.create({
          name: "",
          type: "fixed",
          amount: "1000.00",
          date: Date.now(),
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should require authentication for investments.delete", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.investments.delete({ id: 1 });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should require authentication for investments.update", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.investments.update({ id: 1, name: "Updated" });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("Credit Card Router - Authentication", () => {
    it("should require authentication for creditCard.create", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.creditCard.create({
          description: "Test Transaction",
          amount: "100.00",
          category: "Alimentação",
          transactionDate: Date.now(),
        });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should validate credit card status enum", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      try {
        await caller.creditCard.create({
          description: "Test",
          amount: "100.00",
          category: "Test",
          transactionDate: Date.now(),
          status: "invalid" as any,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should require description for creditCard.create", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      try {
        await caller.creditCard.create({
          description: "",
          amount: "100.00",
          category: "Test",
          transactionDate: Date.now(),
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should require authentication for creditCard.delete", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.creditCard.delete({ id: 1 });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should require authentication for creditCard.markAsPaid", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.creditCard.markAsPaid({ id: 1 });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should require authentication for creditCard.getByStatus", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      try {
        await caller.creditCard.getByStatus({ status: "pending" });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should validate status parameter in getByStatus", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      try {
        await caller.creditCard.getByStatus({ status: "invalid" as any });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });
});
