import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Commande de démarrage interrompue."));
    });
  });
}

await run("npx", ["prisma", "migrate", "deploy"]);
await run("npx", ["next", "start", "--hostname", "0.0.0.0", "--port", String(port)]);
