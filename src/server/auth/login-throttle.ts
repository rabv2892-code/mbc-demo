import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

export const LOGIN_LIMITS = {
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
  maxEmailFailures: 5,
  maxIpFailures: 20,
};

export type ThrottleSnapshot = {
  failures: number;
  windowStartMs: number;
  lockedUntilMs: number | null;
};

export function throttleBucket(kind: "email" | "ip", value: string): string {
  const digest = createHash("sha256").update(`${kind}\n${value.trim().toLowerCase()}`).digest("hex");
  return `${kind}:${digest}`;
}

export function isBucketLocked(snapshot: ThrottleSnapshot | null, now: number): boolean {
  return snapshot?.lockedUntilMs != null && snapshot.lockedUntilMs > now;
}

export function nextFailure(
  snapshot: ThrottleSnapshot | null,
  now: number,
  maxFailures: number,
  windowMs = LOGIN_LIMITS.windowMs,
  lockMs = LOGIN_LIMITS.lockMs,
): ThrottleSnapshot {
  const expired = !snapshot || now - snapshot.windowStartMs >= windowMs;
  const failures = expired ? 1 : snapshot.failures + 1;
  const windowStartMs = expired ? now : snapshot.windowStartMs;
  const previousLock = !expired && snapshot?.lockedUntilMs != null && snapshot.lockedUntilMs > now ? snapshot.lockedUntilMs : null;
  const lockedUntilMs = failures >= maxFailures ? now + lockMs : previousLock;
  return { failures, windowStartMs, lockedUntilMs };
}

function toSnapshot(row: { failures: number; windowStart: Date; lockedUntil: Date | null }): ThrottleSnapshot {
  return {
    failures: row.failures,
    windowStartMs: row.windowStart.getTime(),
    lockedUntilMs: row.lockedUntil ? row.lockedUntil.getTime() : null,
  };
}

export function createPrismaThrottle(db: PrismaClient) {
  return {
    async isLocked(email: string, ip: string | null, now: number): Promise<boolean> {
      const buckets = [throttleBucket("email", email)];
      if (ip) buckets.push(throttleBucket("ip", ip));
      for (const bucket of buckets) {
        const row = await db.loginThrottle.findUnique({ where: { bucket } });
        if (isBucketLocked(row ? toSnapshot(row) : null, now)) return true;
      }
      return false;
    },

    async recordFailure(email: string, ip: string | null, now: number): Promise<void> {
      const targets = [
        { bucket: throttleBucket("email", email), max: LOGIN_LIMITS.maxEmailFailures },
        ...(ip ? [{ bucket: throttleBucket("ip", ip), max: LOGIN_LIMITS.maxIpFailures }] : []),
      ].sort((a, b) => a.bucket.localeCompare(b.bucket));

      await db.$transaction(async (tx) => {
        for (const target of targets) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(CAST(hashtext(${target.bucket}) AS bigint))`;
          const row = await tx.loginThrottle.findUnique({ where: { bucket: target.bucket } });
          const next = nextFailure(row ? toSnapshot(row) : null, now, target.max);
          await tx.loginThrottle.upsert({
            where: { bucket: target.bucket },
            create: {
              bucket: target.bucket,
              failures: next.failures,
              windowStart: new Date(next.windowStartMs),
              lockedUntil: next.lockedUntilMs ? new Date(next.lockedUntilMs) : null,
            },
            update: {
              failures: next.failures,
              windowStart: new Date(next.windowStartMs),
              lockedUntil: next.lockedUntilMs ? new Date(next.lockedUntilMs) : null,
            },
          });
        }
      });
    },

    async clearEmail(email: string): Promise<void> {
      const bucket = throttleBucket("email", email);
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(CAST(hashtext(${bucket}) AS bigint))`;
        await tx.loginThrottle.deleteMany({ where: { bucket } });
      });
    },
  };
}

export function isMissingThrottleTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return message.includes("LoginThrottle") && /does not exist|n'existe pas/i.test(message);
}
