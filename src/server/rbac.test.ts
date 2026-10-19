import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";
import { canAccessPath, hasRole, homePathForRole, navItemsForRole, PERMISSIONS } from "@/lib/rbac";

function user(role: Role) {
  return {
    sub: "u1",
    email: "test@mbc.local",
    fullName: "Test",
    role,
    isActive: true,
  };
}

describe("RBAC", () => {
  it("donne tout au Super Admin", () => {
    expect(canAccessPath("SUPER_ADMIN", "/transport/motorcycles")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/users")).toBe(true);
    expect(hasRole(user("SUPER_ADMIN"), PERMISSIONS.transport.admin)).toBe(true);
    expect(homePathForRole("SUPER_ADMIN")).toBe("/dashboard");
  });

  it("limite le vendeur café aux ventes uniquement", () => {
    expect(canAccessPath("ADMIN_CAFE", "/cafe/sales")).toBe(true);
    expect(canAccessPath("ADMIN_CAFE", "/cafe/purchases")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/water/sales")).toBe(true);
    expect(canAccessPath("ADMIN_CAFE", "/water/purchases")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/lipton/sales")).toBe(true);
    expect(canAccessPath("ADMIN_CAFE", "/cigarettes/sales")).toBe(true);
    expect(canAccessPath("ADMIN_CAFE", "/juice/sales")).toBe(true);
    expect(canAccessPath("ADMIN_CAFE", "/transport/deliveries")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/transport/motorcycles")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/dashboard")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/users")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/cafe/settings")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/cafe/stock")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/machines")).toBe(false);
    expect(canAccessPath("ADMIN_CAFE", "/juice/types")).toBe(false);
    expect(hasRole(user("ADMIN_CAFE"), PERMISSIONS.transport.admin)).toBe(false);
    expect(homePathForRole("ADMIN_CAFE")).toBe("/cafe/sales");
    const hrefs = navItemsForRole("ADMIN_CAFE").map((i) => i.href);
    expect(hrefs).toEqual([
      "/cafe/sales",
      "/water/sales",
      "/lipton/sales",
      "/cigarettes/sales",
      "/juice/sales",
    ]);
    expect(hrefs).not.toContain("/cafe/purchases");
    expect(hrefs).not.toContain("/dashboard");
    expect(hrefs).not.toContain("/transport/deliveries");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).not.toContain("/cafe/settings");
  });

  it("limite le livreur à la page Livraisons", () => {
    expect(canAccessPath("MOTARD", "/transport/deliveries")).toBe(true);
    expect(canAccessPath("MOTARD", "/my-deliveries")).toBe(true);
    expect(canAccessPath("MOTARD", "/cafe/sales")).toBe(false);
    expect(canAccessPath("MOTARD", "/water/sales")).toBe(false);
    expect(canAccessPath("MOTARD", "/lipton/sales")).toBe(false);
    expect(canAccessPath("MOTARD", "/users")).toBe(false);
    expect(canAccessPath("MOTARD", "/dashboard")).toBe(false);
    expect(canAccessPath("MOTARD", "/transport/motorcycles")).toBe(false);
    expect(homePathForRole("MOTARD")).toBe("/transport/deliveries");
    expect(navItemsForRole("MOTARD").map((i) => i.href)).toEqual(["/transport/deliveries"]);
  });
});
