import { RetailKind } from "@prisma/client";

export function parseKind(raw: string): RetailKind | null {
  const value = raw.toUpperCase();
  if (value === "CIGARETTE" || value === "CIGARETTES") return "CIGARETTE";
  if (value === "JUICE" || value === "JUS") return "JUICE";
  return null;
}
