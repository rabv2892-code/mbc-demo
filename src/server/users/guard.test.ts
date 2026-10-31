import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AuthError } from "@/server/auth/errors";
import { applyDbUserToToken } from "@/server/auth/session-policy";
import type { AuthToken } from "@/server/auth/jwt";
import { guardAppPage } from "@/server/auth/page-guard";
import { assertKeepsLastSuperAdmin, lastSuperAdminViolation } from "@/server/users/last-admin";

const token: AuthToken = {
  sub: "admin-1",
  email: "patron@societe.test",
  fullName: "Patron",
  role: "SUPER_ADMIN",
};

describe("rôle effectif des pages", () => {
  it("applique tout de suite la rétrogradation stockée en base", () => {
    const session = applyDbUserToToken(token, {
      isActive: true,
      role: "MOTARD",
      email: "livreur@societe.test",
      fullName: "Livreur",
    });
    expect(guardAppPage(session, "/users")).toEqual({ redirect: "/transport/deliveries" });
    expect(guardAppPage(session, "/transport/deliveries")).toBe("allow");
  });

  it("ferme la session dès que le compte est désactivé", () => {
    const session = applyDbUserToToken(token, {
      isActive: false,
      role: "SUPER_ADMIN",
      email: token.email,
      fullName: token.fullName,
    });
    expect(guardAppPage(session, "/dashboard")).toBe("login");
  });
});

describe("dernier Super Admin", () => {
  const last = {
    operation: "update" as const,
    existingRole: "SUPER_ADMIN" as const,
    existingActive: true,
    nextRole: "ADMIN_CAFE" as const,
    nextActive: true,
    otherActiveSuperAdmins: 0,
  };

  it("interdit la rétrogradation, la désactivation et la suppression du dernier actif", () => {
    expect(lastSuperAdminViolation(last)).toBe(true);
    expect(lastSuperAdminViolation({ ...last, nextRole: "SUPER_ADMIN", nextActive: false })).toBe(true);
    expect(lastSuperAdminViolation({ ...last, operation: "delete", nextRole: "SUPER_ADMIN", nextActive: true })).toBe(true);
    expect(() => assertKeepsLastSuperAdmin(last)).toThrow(AuthError);
  });

  it("autorise l'opération s'il reste un autre Super Admin actif", () => {
    expect(lastSuperAdminViolation({ ...last, otherActiveSuperAdmins: 1 })).toBe(false);
  });

  it("sérialise deux rétrogradations concurrentes pour conserver un actif", async () => {
    const admins: { id: string; role: "SUPER_ADMIN" | "ADMIN_CAFE"; active: boolean }[] = [
      { id: "a", role: "SUPER_ADMIN" as const, active: true },
      { id: "b", role: "SUPER_ADMIN" as const, active: true },
    ];
    const mutex = createMutex();

    async function demote(id: string) {
      await mutex.run(async () => {
        const existing = admins.find((admin) => admin.id === id);
        if (!existing) throw new Error("introuvable");
        const others = admins.filter((admin) => admin.id !== id && admin.role === "SUPER_ADMIN" && admin.active).length;
        assertKeepsLastSuperAdmin({
          operation: "update",
          existingRole: existing.role,
          existingActive: existing.active,
          nextRole: "ADMIN_CAFE",
          nextActive: true,
          otherActiveSuperAdmins: others,
        });
        existing.role = "ADMIN_CAFE";
      });
    }

    const results = await Promise.allSettled([demote("a"), demote("b")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(admins.filter((admin) => admin.role === "SUPER_ADMIN" && admin.active)).toHaveLength(1);
  });

  it("prépare le déclencheur SQL et le verrou transactionnel", () => {
    const sql = readFileSync(
      resolve(__dirname, "../../../prisma/migrations/20261031043100_auth_guardrails/migration.sql"),
      "utf8",
    );
    const service = readFileSync(resolve(__dirname, "./service.ts"), "utf8");
    expect(sql).toContain("mbc:last-super-admin");
    expect(sql).toContain("BEFORE UPDATE OR DELETE");
    expect(sql).toContain("LAST_SUPER_ADMIN");
    expect(sql).toContain("LoginThrottle");
    expect(service).toContain("pg_advisory_xact_lock");
    expect(service).toContain("assertKeepsLastSuperAdmin");
  });
});

function createMutex() {
  let chain = Promise.resolve();
  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      const run = chain.then(fn, fn);
      chain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}
