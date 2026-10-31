import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { clientSafeMessage } from "@/server/client-message";
import { createUserSchema } from "@/server/users/service";
import { seedFixtureData } from "../../prisma/seed-fixtures";

describe("mots de passe des nouveaux comptes", () => {
  it("refuse moins de 12 caractères, les mots de démo et les mots courants", () => {
    expect(() =>
      createUserSchema.parse({
        email: "vendeur@societe.test",
        fullName: "Vendeur",
        password: "Admin1234!",
        role: "ADMIN_CAFE",
      }),
    ).toThrow(ZodError);
    expect(() =>
      createUserSchema.parse({
        email: "vendeur@societe.test",
        fullName: "Vendeur",
        password: "password1234",
        role: "ADMIN_CAFE",
      }),
    ).toThrow(/courant/);
    expect(
      createUserSchema.parse({
        email: "vendeur@societe.test",
        fullName: "Vendeur",
        password: "phrase-unique-de-magasin",
        role: "ADMIN_CAFE",
      }).password,
    ).toBe("phrase-unique-de-magasin");
  });
});

describe("réponses d'erreur", () => {
  it("masque une chaîne de connexion et un jeton", () => {
    expect(clientSafeMessage("postgresql://user:secret@hote/db", "générique")).toBe("générique");
    expect(clientSafeMessage("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature", "générique")).toBe("générique");
    expect(clientSafeMessage("JWT_SECRET=valeur-secrete", "générique")).toBe("générique");
    expect(clientSafeMessage("Le mot de passe est trop court (12 caractères minimum).", "générique")).toMatch(/trop court/);
  });
});

describe("seed fictif", () => {
  it("n'écrit rien quand la variable n'est pas true", async () => {
    vi.stubEnv("SEED_FIXTURE_DATA", "false");
    const db = new Proxy(
      {},
      {
        get() {
          throw new Error("base touchée");
        },
      },
    );
    await expect(seedFixtureData(db as PrismaClient)).resolves.toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("refuse Neon même si la variable est true", async () => {
    vi.stubEnv("SEED_FIXTURE_DATA", "true");
    vi.stubEnv("DATABASE_URL", "postgresql://user:secret@ep.example.neon.tech/neondb");
    vi.stubEnv("MBC_ENV", "");
    vi.stubEnv("NODE_ENV", "test");
    await expect(seedFixtureData({} as PrismaClient)).rejects.toThrow(/Neon/);
    vi.unstubAllEnvs();
  });

  it("prépare uniquement le retrait des deux défauts SQL", () => {
    const sql = readFileSync(
      resolve(__dirname, "../../prisma/migrations/20261031043000_water_purchase_drop_defaults/migration.sql"),
      "utf8",
    );
    expect(sql).toContain('ALTER TABLE "WaterPurchase" ALTER COLUMN "packCount" DROP DEFAULT;');
    expect(sql).toContain('ALTER TABLE "WaterPurchase" ALTER COLUMN "sachetsPerPack" DROP DEFAULT;');
    expect(sql).not.toMatch(/DROP TABLE|DELETE FROM|INSERT INTO|db push/i);
  });
});
