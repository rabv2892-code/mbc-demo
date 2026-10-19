import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("backups");
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = resolve(dir, `mbc-${stamp}.sql`);

const dump = execFileSync(
  "docker",
  ["exec", "mbc-postgres", "pg_dump", "-U", "mbc", "--no-owner", "--no-acl", "mbc"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
writeFileSync(file, dump);
console.log(`Sauvegarde créée : backups/mbc-${stamp}.sql`);
