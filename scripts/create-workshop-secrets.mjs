import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, isAbsolute, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const directory = process.argv[2];
if (!directory || !isAbsolute(directory))
  throw new Error(
    "Provide an absolute private output directory outside the repository.",
  );
const project = fileURLToPath(new URL("../", import.meta.url));
const within = relative(project, directory);
if (
  within === "" ||
  (!within.startsWith(`..${sep}`) && within !== ".." && !isAbsolute(within))
)
  throw new Error(
    "Runtime credentials must be written outside the repository.",
  );
const destination = resolve(directory, "workshop-secrets.json");
if (existsSync(destination))
  throw new Error("Refusing to overwrite existing workshop credentials.");
const password = randomBytes(24).toString("base64url");
const hash = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "-i",
    "--network=none",
    "--read-only",
    "--entrypoint",
    "java",
    process.env.SIFAP_API_IMAGE ?? "sifap-api:workshop-v1",
    "-Dloader.main=br.com.datacorp.sifap.auth.HashPassword",
    "-cp",
    "/app/app.jar",
    "org.springframework.boot.loader.launch.PropertiesLauncher",
  ],
  {
    input: password + "\n",
    encoding: "utf8",
    maxBuffer: 65536,
  },
);
if (hash.status !== 0 || !/^\$2[aby]\$\d{2}\$.{53}$/.test(hash.stdout.trim()))
  throw new Error(
    "The image password-hash utility failed; no credentials were saved.",
  );
mkdirSync(directory, { recursive: true, mode: 0o700 });
writeFileSync(
  destination,
  JSON.stringify(
    {
      DB_PASSWORD: randomBytes(32).toString("hex"),
      SIFAP_JWT_SECRET: randomBytes(48).toString("base64url"),
      SIFAP_VIEWER_USERNAME: "viewer",
      SIFAP_VIEWER_PASSWORD_HASH: hash.stdout.trim(),
      SIFAP_VIEWER_PASSWORD: password,
    },
    null,
    2,
  ),
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Workshop credentials generated in the private operator directory. No secret printed.",
);
