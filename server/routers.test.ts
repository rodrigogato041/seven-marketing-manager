import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://cdn.example.com/test.pdf" }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-owner",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("clients router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.clients.list()).rejects.toThrow();
  });

  it("requires authentication for create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clients.create({ companyName: "Test", contactName: "John" })
    ).rejects.toThrow();
  });
});

describe("collaborators router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.collaborators.list()).rejects.toThrow();
  });

  it("requires authentication for create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaborators.create({ name: "Test", role: "Editor" })
    ).rejects.toThrow();
  });
});

describe("tasks router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tasks.list()).rejects.toThrow();
  });

  it("requires authentication for create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tasks.create({ title: "Test Task" })
    ).rejects.toThrow();
  });

  it("requires authentication for addComment", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tasks.addComment({ id: 1, text: "Comentário interno" })
    ).rejects.toThrow();
  });
});

describe("payments router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payments.list()).rejects.toThrow();
  });
});

describe("content production router", () => {
  it("requires authentication for listContent", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contentProduction.listContent()).rejects.toThrow();
  });

  it("requires authentication for createContent", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contentProduction.createContent({
        clientId: 1,
        contentType: "Reel",
        theme: "Tema de teste",
      })
    ).rejects.toThrow();
  });
});

describe("expenses router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.expenses.list()).rejects.toThrow();
  });
});

describe("documents router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.documents.list()).rejects.toThrow();
  });
});

describe("dashboard router", () => {
  it("requires authentication for stats", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });

  it("requires authentication for executive", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.executive()).rejects.toThrow();
  });

  it("requires authentication for monthlyRevenue", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.monthlyRevenue()).rejects.toThrow();
  });

  it("requires authentication for topServices", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.topServices()).rejects.toThrow();
  });
});

describe("events router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.events.list()).rejects.toThrow();
  });

  it("requires authentication for create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.events.create({ title: "Test Event", startTime: Date.now() })
    ).rejects.toThrow();
  });

  it("rejects event create with empty title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.events.create({ title: "", startTime: Date.now() })
    ).rejects.toThrow();
  });
});

describe("notifications router", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("requires authentication for unreadCount", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.unreadCount()).rejects.toThrow();
  });

  it("requires authentication for markAllRead", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.markAllRead()).rejects.toThrow();
  });
});

describe("dashboard extended", () => {
  it("requires authentication for paymentAlerts", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.paymentAlerts()).rejects.toThrow();
  });

  it("requires authentication for weeklySummary", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.weeklySummary()).rejects.toThrow();
  });
});

describe("router structure", () => {
  it("has all expected routers", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.auth).toBeDefined();
    expect(caller.clients).toBeDefined();
    expect(caller.collaborators).toBeDefined();
    expect(caller.tasks).toBeDefined();
    expect(caller.payments).toBeDefined();
    expect(caller.expenses).toBeDefined();
    expect(caller.documents).toBeDefined();
    expect(caller.events).toBeDefined();
    expect(caller.notifications).toBeDefined();
    expect(caller.dashboard).toBeDefined();
    expect(caller.system).toBeDefined();
  });
});

describe("payments financial v3", () => {
  it("requires authentication for billingForecast", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payments.billingForecast({ year: 2026, month: 3 })).rejects.toThrow();
  });

  it("requires authentication for confirm", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payments.confirm({ id: 1 })).rejects.toThrow();
  });

  it("requires authentication for undo", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payments.undo({ id: 1 })).rejects.toThrow();
  });

  it("requires authentication for delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payments.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("dashboard monthlyExpenses", () => {
  it("requires authentication for monthlyExpenses", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.monthlyExpenses()).rejects.toThrow();
  });
});

describe("clients cascade deletion", () => {
  it("requires authentication for delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.clients.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("dashboard v5 - revenueVsExpenses", () => {
  it("requires authentication for revenueVsExpenses", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.revenueVsExpenses()).rejects.toThrow();
  });
});

describe("clients uploadLogo", () => {
  it("requires authentication for uploadLogo", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clients.uploadLogo({ id: 1, fileBase64: "abc", fileName: "logo.png", mimeType: "image/png" })
    ).rejects.toThrow();
  });
});

describe("collaborators uploadPhoto", () => {
  it("requires authentication for uploadPhoto", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaborators.uploadPhoto({ id: 1, fileBase64: "abc", fileName: "photo.png", mimeType: "image/png" })
    ).rejects.toThrow();
  });
});

describe("dashboard exportData", () => {
  it("requires authentication for exportData", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.exportData()).rejects.toThrow();
  });
});

describe("input validation", () => {
  it("rejects client create with empty companyName", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clients.create({ companyName: "", contactName: "John" })
    ).rejects.toThrow();
  });

  it("rejects collaborator create with empty name", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaborators.create({ name: "", role: "Editor" })
    ).rejects.toThrow();
  });

  it("rejects task create with empty title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tasks.create({ title: "" })
    ).rejects.toThrow();
  });
});
