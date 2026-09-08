import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const privateFile = process.argv[2];
if (!privateFile)
  throw new Error("Provide the protected workshop credential file.");
const secret = JSON.parse(readFileSync(privateFile, "utf8"));
if (typeof secret.SIFAP_VIEWER_PASSWORD !== "string")
  throw new Error("Viewer credential missing.");
const repo = "workshop-gbb/datacorp-sifap-modern";
const variable = spawnSync(
  "gh",
  [
    "variable",
    "set",
    "SIFAP_BASE_URL",
    "--repo",
    repo,
    "--body",
    "https://sifap-modern-fiepi9.eastus2.cloudapp.azure.com",
  ],
  { stdio: "inherit" },
);
if (variable.status !== 0) process.exit(variable.status ?? 1);
const password = spawnSync(
  "gh",
  ["secret", "set", "SIFAP_VIEWER_PASSWORD", "--repo", repo],
  { input: secret.SIFAP_VIEWER_PASSWORD, encoding: "utf8" },
);
if (password.status !== 0)
  throw new Error("Could not configure the protected CI viewer credential.");
console.log(
  "Live test URL and encrypted GitHub viewer secret configured. No credential printed.",
);
