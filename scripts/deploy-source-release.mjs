import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const [tag, directory] = process.argv.slice(2);
const subscription = process.env.AZURE_SUBSCRIPTION_ID;
if (!tag || !directory || !isAbsolute(directory) ||
    !/^[a-f0-9-]{36}$/i.test(subscription ?? ""))
  throw new Error("Provide tag, absolute artifact directory and AZURE_SUBSCRIPTION_ID.");

function command(program, args) {
  const result = spawnSync(program, args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${program} failed; protected output omitted.`);
  return result.stdout.trim();
}
const repository = "workshop-gbb/datacorp-sifap-modern";
const token = command("gh", ["auth", "token", "--hostname", "github.com"]);
const headers = new Headers({ Accept: "application/vnd.github+json" });
headers.set("Authorization", ["Bearer", token].join(" "));
const releaseResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
  { headers, redirect: "error", signal: AbortSignal.timeout(20000) },
);
if (!releaseResponse.ok) throw new Error(`Release lookup failed (${releaseResponse.status}).`);
const release = await releaseResponse.json();
const entry = release.assets.find(item => item.name === "source-final.tar.gz");
if (!entry) throw new Error("Source release artifact missing.");
const assetHeaders = new Headers(headers);
assetHeaders.set("Accept", "application/octet-stream");
const assetResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/assets/${entry.id}`,
  { headers: assetHeaders, redirect: "manual", signal: AbortSignal.timeout(20000) },
);
const location = assetResponse.headers.get("Location");
if (assetResponse.status !== 302 || !location) throw new Error("Scoped asset URL missing.");
const assetUrl = new URL(location);
if (assetUrl.protocol !== "https:" || assetUrl.hostname !== "release-assets.githubusercontent.com")
  throw new Error("Untrusted release asset origin.");
const bytes = readFileSync(resolve(directory, "source-final.tar.gz"));
if (bytes.length !== entry.size) throw new Error("Source artifact size mismatch.");
const sha = createHash("sha256").update(bytes).digest("hex");
const script = readFileSync(
  fileURLToPath(new URL("../infra/runtime/deploy-source-release.sh", import.meta.url)),
  "utf8",
);
const body = {
  location: "eastus2",
  properties: {
    source: { script },
    timeoutInSeconds: 1800,
    asyncExecution: false,
    parameters: [
      { name: "SIFAP_SOURCE_SHA", value: sha },
      { name: "SIFAP_HOST", value: "sifap-modern-fiepi9.eastus2.cloudapp.azure.com" },
      { name: "SIFAP_VAULT", value: "sifapmodfiepi9" },
    ],
    protectedParameters: [{ name: "SIFAP_SOURCE_URL", value: location }],
  },
};
const path = resolve(directory, "protected-source-command.json");
writeFileSync(path, JSON.stringify(body), { mode: 0o600, flag: "wx" });
try {
  command("az", ["rest", "--method", "put", "--url",
    `https://management.azure.com/subscriptions/${subscription}/resourceGroups/sifap-modern-rg-eus2/providers/Microsoft.Compute/virtualMachines/sifap-modern-vm/runCommands/deploy-credential-roles?api-version=2024-07-01`,
    "--body", `@${path}`, "--output", "none"]);
  console.log("Credential-role source release submitted. Verify executionState and exitCode.");
} finally { rmSync(path); }
