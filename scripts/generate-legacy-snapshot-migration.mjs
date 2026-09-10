import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const [sourcePath, destinationPath] = process.argv.slice(2);
if (!sourcePath || !destinationPath || !isAbsolute(sourcePath) || !isAbsolute(destinationPath)) {
  throw new Error("Provide absolute source JSON and destination SQL paths.");
}

const EXPECTED = {
  schemaVersion: 1,
  snapshotDate: "2018-03-14",
  generatorSha256: "1e5ca9ca29ca80f3922d795854332247094c007c6d5a3c140aaddd1b5ec7b1a1",
  sourceContentSha256: "e47a0914fd70b3519bc47f6fe28a24f20ea95ec133598298d5263f9f0427b5b9",
  legacyCommit: "b87992324dda18bdfc86e6507c3f99b86b99e35d",
  snapshotKey: "legacy-2018-03-14-e47a0914",
  counts: { programs: 6, beneficiaries: 500, payments: 2000, audits: 200, periods: 4 },
};

const PROGRAMS = new Map([
  ["PBF1", { name: "BOLSA FAMILIA SYNTHETIC", type: "A", status: "A" }],
  ["BPC1", { name: "CONTINUOUS CASH BENEFIT SYNTHETIC", type: "A", status: "A" }],
  ["PETI", { name: "CHILD LABOR ERADICATION SYNTHETIC", type: "A", status: "A" }],
  ["AUX1", { name: "EMERGENCY ASSISTANCE SYNTHETIC", type: "A", status: "A" }],
  ["GASF", { name: "GAS FOOD SUPPORT SYNTHETIC", type: "A", status: "A" }],
  ["IDOS", { name: "ELDERLY SUPPORT SYNTHETIC", type: "A", status: "A" }],
]);

const bytes = readFileSync(resolve(sourcePath));
const contentHash = createHash("sha256").update(bytes).digest("hex");
if (contentHash !== EXPECTED.sourceContentSha256) {
  throw new Error(`Unexpected legacy snapshot hash: ${contentHash}`);
}

const snapshot = JSON.parse(bytes.toString("utf8"));
const arrayCount = (key) => {
  if (!Array.isArray(snapshot[key])) throw new Error(`Missing array: ${key}`);
  return snapshot[key].length;
};

if (
  snapshot.schemaVersion !== EXPECTED.schemaVersion ||
  snapshot.synthetic !== true ||
  snapshot.snapshotDate !== EXPECTED.snapshotDate ||
  snapshot.generatorSha256 !== EXPECTED.generatorSha256
) {
  throw new Error("Legacy snapshot metadata does not match the approved source.");
}

for (const [key, count] of Object.entries(EXPECTED.counts)) {
  if (arrayCount(key) !== count) {
    throw new Error(`Unexpected ${key} count: ${arrayCount(key)}`);
  }
}

const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const decimal = (cents) => {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`Invalid cents value: ${cents}`);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
const rowHash = (value) => hash(JSON.stringify(value));
const cpfMask = (cpf) => {
  if (!/^\d{11}$/.test(cpf)) throw new Error("Invalid synthetic CPF shape.");
  return Number(cpf) < 10_000_000_000
    ? `${cpf.slice(0, 3)}.***.***-**`
    : `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
};
const nisMask = (nis) => {
  if (!/^\d{11}$/.test(nis)) throw new Error("Invalid synthetic NIS shape.");
  return `***.*****.${nis.slice(8, 10)}-${nis.slice(10)}`;
};
const values = (rows) => rows.map((row) => `    (${row.join(", ")})`).join(",\n");

const expectedProgramCodes = [...PROGRAMS.keys()];
if (snapshot.programs.map(({ code }) => code).join(",") !== expectedProgramCodes.join(",")) {
  throw new Error("Legacy program codes or ordering changed.");
}

const beneficiaryByCpf = new Map();
const beneficiaryRows = snapshot.beneficiaries.map((beneficiary, index) => {
  if (beneficiaryByCpf.has(beneficiary.cpf)) throw new Error("Duplicate synthetic CPF.");
  const id = `BEN-${String(index + 1).padStart(6, "0")}`;
  beneficiaryByCpf.set(beneficiary.cpf, id);
  return [
    sqlString(EXPECTED.snapshotKey),
    sqlString(id),
    sqlString(hash(`${beneficiary.cpf}\0${beneficiary.nis}`)),
    sqlString(cpfMask(beneficiary.cpf)),
    sqlString(nisMask(beneficiary.nis)),
    sqlString(beneficiary.name),
    sqlString(beneficiary.birthDate),
    sqlString(beneficiary.program),
    sqlString(beneficiary.uf),
    sqlString(beneficiary.city),
    sqlString(beneficiary.region),
    sqlString(beneficiary.status),
    sqlString(beneficiary.registeredAt),
    String(beneficiary.dependents),
    decimal(beneficiary.familyIncomeCents),
    sqlString(rowHash(beneficiary)),
  ];
});

const paymentRows = snapshot.payments.map((payment) => {
  const beneficiaryId = beneficiaryByCpf.get(payment.cpf);
  if (!beneficiaryId) throw new Error(`Payment ${payment.id} has no beneficiary.`);
  return [
    sqlString(EXPECTED.snapshotKey),
    sqlString(payment.id),
    sqlString(beneficiaryId),
    sqlString(payment.period),
    decimal(payment.grossCents),
    decimal(payment.discountCents),
    decimal(payment.netCents),
    sqlString(payment.status),
    sqlString(payment.type),
    sqlString(rowHash(payment)),
  ];
});

const programRows = snapshot.programs.map(({ code }) => {
  const program = PROGRAMS.get(code);
  return [
    sqlString(EXPECTED.snapshotKey),
    sqlString(code),
    sqlString(program.name),
    sqlString(program.type),
    sqlString(program.status),
    sqlString(rowHash({ code, ...program })),
  ];
});

const periodRows = snapshot.periods.map((period, index) => [
  sqlString(EXPECTED.snapshotKey),
  sqlString(period),
  String(index + 1),
]);

const auditRows = snapshot.audits.map((audit) => [
  sqlString(EXPECTED.snapshotKey),
  sqlString(audit.id),
  sqlString(audit.date),
  sqlString(audit.module),
  sqlString(audit.action),
  sqlString(audit.entity),
  sqlString(rowHash(audit)),
]);

const sql = `-- Generated by scripts/generate-legacy-snapshot-migration.mjs.
-- Source: workshop-gbb/datacorp-sifap-legacy@${EXPECTED.legacyCommit}
-- Generator SHA-256: ${EXPECTED.generatorSha256}
-- Normalized snapshot SHA-256: ${EXPECTED.sourceContentSha256}
-- Full CPF and NIS values are used only in memory to resolve relationships and are not persisted.

INSERT INTO legacy_snapshot (
    snapshot_key, source_schema_version, synthetic, snapshot_date, legacy_commit,
    generator_sha256, source_content_sha256, natural_version, adabas_version, adabas_dbid
) VALUES (
    ${sqlString(EXPECTED.snapshotKey)}, ${snapshot.schemaVersion}, TRUE,
    ${sqlString(snapshot.snapshotDate)}, ${sqlString(EXPECTED.legacyCommit)},
    ${sqlString(snapshot.generatorSha256)}, ${sqlString(EXPECTED.sourceContentSha256)},
    ${sqlString(snapshot.versions.natural)}, ${sqlString(snapshot.versions.adabas)},
    ${snapshot.versions.dbid}
);

INSERT INTO legacy_snapshot_period (snapshot_key, period, display_order) VALUES
${values(periodRows)};

INSERT INTO legacy_snapshot_program (
    snapshot_key, program_code, display_name, type_code, status_code, source_row_sha256
) VALUES
${values(programRows)};

INSERT INTO legacy_snapshot_beneficiary (
    snapshot_key, beneficiary_key, source_identity_digest, document_masked, nis_masked,
    full_name, birth_date, program_code, state, city, region, status_code, enrolled_at,
    dependents, family_income, source_row_sha256
) VALUES
${values(beneficiaryRows)};

INSERT INTO legacy_snapshot_payment (
    snapshot_key, payment_id, beneficiary_key, period, gross_amount, discount_amount,
    net_amount, status_code, type_code, source_row_sha256
) VALUES
${values(paymentRows)};

INSERT INTO legacy_snapshot_audit_event (
    snapshot_key, audit_id, event_date, module_code, action_code, entity_code, source_row_sha256
) VALUES
${values(auditRows)};
`;

for (const beneficiary of snapshot.beneficiaries) {
  if (sql.includes(beneficiary.cpf) || sql.includes(beneficiary.nis)) {
    throw new Error("Generated migration contains an unmasked personal identifier.");
  }
}

writeFileSync(resolve(destinationPath), sql, { encoding: "utf8", flag: "w" });
console.log(
  `Generated ${destinationPath}: ${snapshot.programs.length} programs, ` +
    `${snapshot.beneficiaries.length} beneficiaries, ${snapshot.payments.length} payments, ` +
    `${snapshot.audits.length} audits.`,
);
