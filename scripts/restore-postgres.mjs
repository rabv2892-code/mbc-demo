import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage : npm run db:restore -- backups/mbc-AAAA-MM-JJ.sql");
  process.exit(1);
}

const sql = readFileSync(resolve(input));
execFileSync("docker", ["exec", "-i", "mbc-postgres", "psql", "-U", "mbc", "-d", "mbc", "-v", "ON_ERROR_STOP=1"], {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});
console.log("Restauration terminée.");
