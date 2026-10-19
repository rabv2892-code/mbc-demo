import { describe, expect, it } from "vitest";
import { formatDate, formatTime, nowServer } from "@/lib/timezone";

describe("dates automatiques", () => {
  it("génère une date serveur et la formate", () => {
    const now = nowServer();
    expect(now).toBeInstanceOf(Date);
    expect(formatDate(now)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(formatTime(now)).toMatch(/^\d{2}:\d{2}$/);
  });
});
