import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("configuration de production", () => {
  it("expose le script prisma migrate deploy", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["db:migrate:deploy"]).toBe("prisma migrate deploy");
  });

  it("lie PostgreSQL local à localhost uniquement", () => {
    expect(read("docker-compose.yml")).toMatch(/127\.0\.0\.1:55434:5432/);
  });

  it("n'expose pas le port Postgres dans le compose de production", () => {
    const prod = read("docker-compose.prod.yml");
    expect(prod).not.toMatch(/5432:5432/);
    expect(prod).toMatch(/mbc-app/);
  });

  it("utilise le provider PostgreSQL pour les migrations", () => {
    expect(read("prisma/migrations/migration_lock.toml")).toMatch(/provider = "postgresql"/);
  });

  it("documente JWT_SECRET sans valeur secrète réelle", () => {
    const example = read(".env.example");
    expect(example).toMatch(/JWT_SECRET=/);
    expect(example).not.toMatch(/mbc-dev-jwt-secret-change-in-production-32chars/);
  });

  it("prépare le démarrage hébergé sur le port fourni", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["start:hosted"]).toBe("node scripts/start-hosted.mjs");
    expect(read("scripts/start-hosted.mjs")).toMatch(/process\.env\.PORT/);
    expect(read("scripts/start-hosted.mjs")).toMatch(/0\.0\.0\.0/);
  });

  it("ignore les secrets, dumps et .env dans Git", () => {
    const ignore = read(".gitignore");
    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toMatch(/^\.env\.\*$/m);
    expect(ignore).toMatch(/^\*\.sql$/m);
    expect(ignore).toMatch(/^!prisma\/migrations\/\*\*\/\*\.sql$/m);
    expect(ignore).toMatch(/^backups$/m);
    expect(ignore).toMatch(/^tsconfig\.tsbuildinfo$/m);
  });

  it("n'embarque pas d'identifiants locaux connus dans le seed", () => {
    const seed = read("prisma/seed.ts");
    expect(seed).not.toMatch(/admin@mbc\.local/);
    expect(seed).not.toMatch(/cafe@mbc\.local/);
    expect(seed).not.toMatch(/motard@mbc\.local/);
    expect(seed).not.toMatch(/Admin1234/);
    expect(seed).not.toMatch(/Cafe1234/);
    expect(seed).not.toMatch(/Moto1234/);
  });

  it("décrit un service Render de démo sans secret", () => {
    const render = read("render.yaml");
    expect(render).toMatch(/healthCheckPath: \/api\/health/);
    expect(render).toMatch(/start:hosted/);
    expect(render).not.toMatch(/Admin1234/);
    expect(render).not.toMatch(/postgresql:\/\//);
  });
});
