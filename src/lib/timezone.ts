import { formatInTimeZone } from "date-fns-tz";

export const APP_TZ = process.env.APP_TZ || "Africa/Conakry";

export function nowServer(): Date {
  return new Date();
}

export function formatDate(date: Date | string): string {
  return formatInTimeZone(new Date(date), APP_TZ, "dd/MM/yyyy");
}

export function formatTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), APP_TZ, "HH:mm");
}

export function formatDateTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), APP_TZ, "dd/MM/yyyy — HH:mm");
}

export function startOfDayTz(date: Date): Date {
  const ymd = formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function endOfDayTz(date: Date): Date {
  const ymd = formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
  return new Date(`${ymd}T23:59:59.999Z`);
}
