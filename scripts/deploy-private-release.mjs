import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const [tag, directory] = process.argv.slice(2);
if (!tag || !directory || !isAbsolute(directory))
  throw new Error(
    "Provide the release tag and the absolute private artifact directory.",
  );
const repository = "workshop-gbb/datacorp-sifap-modern";
function command(program, args) {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`${program} failed; no protected output printed.`);
  return result.stdout.trim();
}
const token = command("gh", ["auth", "token", "--hostname", "github.com"]);
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
};
const releaseResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
  { headers, redirect: "error", signal: AbortSignal.timeout(20000) },
);
if (!releaseResponse.ok)
  throw new Error(`Release lookup failed (${releaseResponse.status}).`);
const release = await releaseResponse.json();

async function asset(name) {
  const metadata = release.assets.find((value) => value.name === name);
  if (!metadata)
    throw new Error("Required private release artifact is missing.");
  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/assets/${metadata.id}`,
    {
      headers: { ...headers, Accept: "application/octet-stream" },
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    },
  );
  const location = response.headers.get("location");
  if (response.status !== 302 || !location)
    throw new Error("No scoped, expiring artifact URL was returned.");
  const url = new URL(location);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "release-assets.githubusercontent.com"
  )
    throw new Error("Artifact download host is not trusted.");
  const bytes = readFileSync(resolve(directory, name));
  if (bytes.length !== metadata.size)
    throw new Error("Local and published artifact sizes differ.");
  return {
    url: location,
    sha: createHash("sha256").update(bytes).digest("hex"),
  };
}
const image = await asset("images-final.tar.gz");
const runtime = await asset("runtime-final.tar.gz");
const script = readFileSync(
  fileURLToPath(new URL("../infra/runtime/deploy-release.sh", import.meta.url)),
  "utf8",
);
const body = {
  location: "eastus2",
  properties: {
    source: { script },
    timeoutInSeconds: 900,
    asyncExecution: false,
    parameters: [
      { name: "SIFAP_IMAGE_SHA", value: image.sha },
      { name: "SIFAP_RUNTIME_SHA", value: runtime.sha },
      {
        name: "SIFAP_HOST",
        value: "sifap-modern-fiepi9.eastus2.cloudapp.azure.com",
      },
      { name: "SIFAP_VAULT", value: "sifapmodfiepi9" },
    ],
    protectedParameters: [
      { name: "SIFAP_IMAGE_URL", value: image.url },
      { name: "SIFAP_RUNTIME_URL", value: runtime.url },
    ],
  },
};
const bodyPath = resolve(directory, "protected-release-command.json");
writeFileSync(bodyPath, JSON.stringify(body), { mode: 0o600, flag: "wx" });
try {
  command("az", [
    "rest",
    "--method",
    "put",
    "--url",
    "https://management.azure.com/subscriptions/bf39c110-94c5-4bfa-959d-216b1f971d81/resourceGroups/sifap-modern-rg-eus2/providers/Microsoft.Compute/virtualMachines/sifap-modern-vm/runCommands/deploy-viewer-release?api-version=2024-07-01",
    "--body",
    `@${bodyPath}`,
    "--output",
    "none",
  ]);
  console.log(
    "Release submitted through Azure Run Command. Verify instanceView executionState and exitCode.",
  );
} finally {
  rmSync(bodyPath);
}
