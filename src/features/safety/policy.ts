import { and, desc, eq, gte } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { messages } from "@/db/schema";
import type { AppEnv } from "@/config/env";

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

export function isWithinOperatingHours(date: Date, hours: string, timezone: string) {
  const [start, end] = hours.split("-").map((value) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  });
  const current = localParts(date, timezone).minutes;
  return current >= start && current < end;
}

export async function assertOutboundAllowed(db: AppDatabase, env: AppEnv, current = new Date()) {
  if (!isWithinOperatingHours(current, env.OPERATING_HOURS, env.OPERATING_TIMEZONE)) throw new Error("Outside configured operating hours");

  const since = new Date(current.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const recent = await db.select().from(messages).where(and(eq(messages.channel, "browser"), eq(messages.status, "sent"), gte(messages.createdAt, since))).orderBy(desc(messages.createdAt));
  const today = localParts(current, env.OPERATING_TIMEZONE).date;
  const sentToday = recent.filter((message) => localParts(new Date(message.createdAt), env.OPERATING_TIMEZONE).date === today);
  if (sentToday.length >= env.MAX_DMS_PER_DAY) throw new Error("Daily DM limit reached");

  const latest = recent[0];
  if (latest) {
    const elapsedSeconds = (current.getTime() - new Date(latest.createdAt).getTime()) / 1000;
    if (elapsedSeconds < env.MIN_SECONDS_BETWEEN_DMS) throw new Error("Minimum interval between DMs has not elapsed");
  }
}
