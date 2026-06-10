import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod/v4";
import * as db from "./db";

export const monthlyPeriodsRouter = router({
  getOrCreate: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
    .mutation(({ input }) => db.getOrCreateMonthlyPeriod(input.year, input.month)),
  
  list: protectedProcedure.query(() => db.listMonthlyPeriods()),
  
  getById: protectedProcedure.input(z.object({ id: z.number() }))
    .query(({ input }) => db.getMonthlyPeriodById(input.id)),
  
  updateStatus: protectedProcedure.input(z.object({ 
    id: z.number(), 
    status: z.enum(["active", "closed", "archived"]) 
  })).mutation(({ input }) => db.updateMonthlyPeriodStatus(input.id, input.status)),
  
  getFinancialSummary: protectedProcedure.input(z.object({ periodId: z.number() }))
    .query(({ input }) => db.getOrCreateMonthlyFinancialSummary(input.periodId)),
  
  calculateFinancialSummary: protectedProcedure.input(z.object({ periodId: z.number() }))
    .mutation(({ input }) => db.calculateMonthlyFinancialSummary(input.periodId)),
});
