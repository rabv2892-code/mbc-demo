import { describe, expect, it } from "vitest";
import { assertRole, hasRole, PERMISSIONS } from "@/server/rbac";
import { AuthError } from "@/server/auth/errors";
import type { Role } from "@prisma/client";

function session(role: Role) {
  return { sub: "id", email: `${role}@mbc.local`, fullName: role, role, isActive: true };
}

describe("permissions API", () => {
  it("autorise le Super Admin sur le transport", () => {
    expect(() => assertRole(session("SUPER_ADMIN"), PERMISSIONS.transport.admin)).not.toThrow();
  });

  it("interdit au vendeur café de consulter le transport", () => {
    expect(() => assertRole(session("ADMIN_CAFE"), PERMISSIONS.transport.admin)).toThrow(AuthError);
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.transport.admin)).toBe(false);
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.cafe.access)).toBe(true);
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.water.access)).toBe(true);
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.lipton.access)).toBe(true);
  });

  it("interdit au livreur le café, l'eau et les utilisateurs", () => {
    expect(hasRole(session("MOTARD"), PERMISSIONS.cafe.access)).toBe(false);
    expect(hasRole(session("MOTARD"), PERMISSIONS.water.access)).toBe(false);
    expect(hasRole(session("MOTARD"), PERMISSIONS.lipton.access)).toBe(false);
    expect(hasRole(session("MOTARD"), PERMISSIONS.users.manage)).toBe(false);
    expect(hasRole(session("MOTARD"), PERMISSIONS.transport.ownDeliveries)).toBe(true);
  });

  it("le livreur n'a pas la liste globale des livraisons", () => {
    expect(hasRole(session("MOTARD"), PERMISSIONS.transport.admin)).toBe(false);
  });

  it("réserve prix eau, machines, fournitures et types retail au Super Admin", () => {
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.settings.access)).toBe(false);
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.catalog.manage)).toBe(false);
    expect(hasRole(session("MOTARD"), PERMISSIONS.catalog.manage)).toBe(false);
    expect(hasRole(session("SUPER_ADMIN"), PERMISSIONS.settings.access)).toBe(true);
    expect(hasRole(session("SUPER_ADMIN"), PERMISSIONS.catalog.manage)).toBe(true);
  });

  it("interdit au vendeur les achats et le stock d'administration", () => {
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.purchases.access)).toBe(false);
    expect(hasRole(session("ADMIN_CAFE"), PERMISSIONS.cafe.access)).toBe(true);
  });
});
