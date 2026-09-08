import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const file = process.argv[2];
if (!file) throw new Error("Provide the private workshop-secrets.json path.");
const secrets = JSON.parse(readFileSync(file, "utf8"));
const result = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    "compose.yaml",
    "-f",
    "compose.local.yaml",
    "up",
    "-d",
    "--no-build",
    "--wait",
    "--wait-timeout",
    "240",
    ...process.argv.slice(3),
  ],
  {
    env: { ...process.env, ...secrets, SIFAP_HOST: "localhost" },
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);
