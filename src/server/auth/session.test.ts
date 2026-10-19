import { describe, expect, it } from "vitest";
import { applyDbUserToToken } from "./session-policy";
import type { AuthToken } from "./jwt";

const token: AuthToken = {
  sub: "user-1",
  email: "old@mbc.local",
  fullName: "Ancien nom",
  role: "SUPER_ADMIN",
};

describe("session — état en base", () => {
  it("refuse un compte introuvable", () => {
    expect(applyDbUserToToken(token, null)).toBeNull();
  });

  it("refuse un compte désactivé même si le jeton est encore valide", () => {
    expect(
      applyDbUserToToken(token, {
        isActive: false,
        role: "SUPER_ADMIN",
        email: "old@mbc.local",
        fullName: "Ancien nom",
      }),
    ).toBeNull();
  });

  it("applique le rôle actuel de la base, pas celui du jeton", () => {
    const session = applyDbUserToToken(token, {
      isActive: true,
      role: "MOTARD",
      email: "rider@mbc.local",
      fullName: "Livreur actuel",
    });
    expect(session?.role).toBe("MOTARD");
    expect(session?.email).toBe("rider@mbc.local");
    expect(session?.fullName).toBe("Livreur actuel");
    expect(session?.isActive).toBe(true);
  });
});
