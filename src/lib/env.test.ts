import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allowDemoAccounts,
  assertPublicAdminPassword,
  assertSeedEmail,
  assertServerEnv,
  fixtureDataBlockReason,
  isPlaceholderJwtSecret,
  passwordRejectionReason,
  requireJwtSecret,
} from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("JWT_SECRET", () => {
  it("refuse une valeur absente", () => {
    expect(() => requireJwtSecret("")).toThrow(/JWT_SECRET manquant/);
    expect(() => requireJwtSecret(undefined)).toThrow(/JWT_SECRET manquant/);
  });

  it("refuse un secret trop court", () => {
    expect(() => requireJwtSecret("short-secret")).toThrow(/trop court/);
  });

  it("refuse le secret de secours historique", () => {
    expect(isPlaceholderJwtSecret("mbc-dev-jwt-secret-change-in-production-32chars")).toBe(true);
    expect(() => requireJwtSecret("mbc-dev-jwt-secret-change-in-production-32chars")).toThrow(/invalide/);
  });

  it("accepte un secret unique assez long", () => {
    const secret = "a".repeat(48);
    expect(requireJwtSecret(secret)).toBe(secret);
  });
});

describe("comptes de démonstration", () => {
  it("interdit les comptes démo en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(allowDemoAccounts()).toBe(false);
  });

  it("interdit les comptes démo sur une instance de démonstration publique", () => {
    vi.stubEnv("MBC_ENV", "demo");
    expect(allowDemoAccounts()).toBe(false);
  });

  it("refuse un mot de passe de développement local pour un admin public", () => {
    expect(() => assertPublicAdminPassword("Admin1234!")).toThrow(/interdit/);
    expect(() => assertPublicAdminPassword("court")).toThrow(/trop court/);
    expect(() => assertPublicAdminPassword("un-mot-de-passe-unique")).not.toThrow();
  });

  it("refuse un mot de passe courant ou trop court pour un nouvel utilisateur", () => {
    expect(passwordRejectionReason("password1234")).toMatch(/courant/);
    expect(passwordRejectionReason("Cafe1234!")).toMatch(/interdit/);
    expect(passwordRejectionReason("court")).toMatch(/trop court/);
    expect(passwordRejectionReason("phrase-unique-de-magasin", "phrase-unique-de-magasin@societe.test")).toMatch(/e-mail/);
    expect(passwordRejectionReason("phrase-unique-de-magasin", "autre@societe.test")).toBeNull();
  });

  it("refuse les e-mails de développement ou d'exemple", () => {
    expect(() => assertSeedEmail("admin@mbc.local")).toThrow(/interdite/);
    expect(() => assertSeedEmail("admin@exemple.com")).toThrow(/interdite/);
    expect(assertSeedEmail("patron@societe.test")).toBe("patron@societe.test");
  });
});

describe("environnement serveur", () => {
  it("refuse DATABASE_URL manquant", () => {
    vi.stubEnv("JWT_SECRET", "a".repeat(48));
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("MBC_ENV", "production");
    expect(() => assertServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("refuse le mot de passe Postgres de développement en production", () => {
    vi.stubEnv("JWT_SECRET", "a".repeat(48));
    vi.stubEnv("DATABASE_URL", "postgresql://mbc:mbc_dev_password@db:5432/mbc");
    vi.stubEnv("MBC_ENV", "production");
    expect(() => assertServerEnv()).toThrow(/développement interdits/);
  });
});

describe("données fictives", () => {
  it("reste désactivé quand la variable n'est pas true", () => {
    expect(fixtureDataBlockReason({ SEED_FIXTURE_DATA: "false", DATABASE_URL: "postgresql://ep.neon.tech/neondb" })).toBeNull();
    expect(fixtureDataBlockReason({})).toBeNull();
  });

  it("refuse une variable true sur Neon, en démo ou en production", () => {
    expect(fixtureDataBlockReason({ SEED_FIXTURE_DATA: "true", MBC_ENV: "demo" })).toMatch(/interdites/);
    expect(fixtureDataBlockReason({ SEED_FIXTURE_DATA: "true", MBC_ENV: "production" })).toMatch(/interdites/);
    expect(fixtureDataBlockReason({ SEED_FIXTURE_DATA: "true", NODE_ENV: "production" })).toMatch(/interdites/);
    expect(
      fixtureDataBlockReason({
        SEED_FIXTURE_DATA: "true",
        DATABASE_URL: "postgresql://user:secret@ep.example.neon.tech/neondb",
      }),
    ).toMatch(/Neon/);
  });
});
