import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { checkForLocalPathsObj, immutableEvidenceAllowedPaths } from "../scripts/boundary-policy.mjs";

const root = process.cwd();
const driver = join(root, "scripts", "fates-slice04a-live-acceptance.mjs");
const sink = join(root, "fixtures", "slice-004a-receipt-sink", "server.mjs");
const worker = join(
  root,
  "fixtures",
  "slice-004a-ananke-process",
  "server.mjs",
);
const sha = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
const baseArgs = [
  "--plan",
  "--approved-integration-sha",
  "c9cf54c14dc4a16defd258576e23fb2907559a8c",
  "--approved-ananke-sha",
  "d74bccb51208ecb3b897b269082158153fd4e72f",
  "--approved-driver-sha256",
  sha(driver),
  "--approved-sink-sha256",
  sha(sink),
  "--approved-worker-sha256",
  sha(worker),
  "--sink-port",
  "34220",
  "--ananke-port",
  "34221",
];
const evidenceSchema = JSON.parse(
  readFileSync(
    join(root, "schemas", "slice04a-live-evidence.schema.json"),
    "utf8",
  ),
);

test("004A plan contract explicitly reports no attempt reservation", () => {
  const source = readFileSync(driver, "utf8");
  assert.match(source, /attemptReserved/);
  assert.match(source, /attemptReserved,\s*credentialsGenerated/);
  assert.match(source, /attemptReserved\s*=\s*Boolean\(/);
  assert.match(source, /plannedAttemptId\s*&&\s*attemptIsReserved\(/);
});

test("004A plan is side-effect-free and fails closed before any process action on an invalid checkpoint", () => {
  const invalidCheckpoint = [...baseArgs];
  invalidCheckpoint[
    invalidCheckpoint.indexOf("--approved-integration-sha") + 1
  ] = "0".repeat(40);
  const result = spawnSync(process.execPath, [driver, ...invalidCheckpoint], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}${result.stderr}`,
    /integration checkpoint mismatch/,
  );
  assert.doesNotMatch(
    `${result.stdout}${result.stderr}`,
    /ACCEPTANCE_COMPOSITION|READY /,
  );
});

test("004A plan rejects a wrong checkpoint, hash, and execute authorization omission", () => {
  const wrongSha = [...baseArgs];
  wrongSha[wrongSha.indexOf("--approved-ananke-sha") + 1] =
    "0000000000000000000000000000000000000000";
  assert.notEqual(
    spawnSync(process.execPath, [driver, ...wrongSha], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    }).status,
    0,
  );
  const wrongHash = [...baseArgs];
  wrongHash[wrongHash.indexOf("--approved-driver-sha256") + 1] = "0".repeat(64);
  assert.notEqual(
    spawnSync(process.execPath, [driver, ...wrongHash], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    }).status,
    0,
  );
  const execute = spawnSync(
    process.execPath,
    [driver, "--execute", "--attempt-id", "001"],
    { cwd: root, encoding: "utf8", shell: false },
  );
  assert.notEqual(execute.status, 0);
  assert.match(
    `${execute.stdout}${execute.stderr}`,
    /approved-integration-sha|owner-authorized/,
  );
});

test("004A acceptance composition contains no low-level execution import", () => {
  const source = readFileSync(worker, "utf8");
  assert.doesNotMatch(source, /executeTool|executorFor/);
  assert.match(source, /gateway\.start\(\)/);
  assert.match(source, /registerDurableReceiptSinkConsumer/);
});

test("004A future evidence uses portable logical process provenance", () => {
  const futureEvidence = {
    attemptId: "003",
    driverSha256: "A".repeat(64),
    integrationCheckpoint: "b".repeat(40),
    fixtureSha256: "C".repeat(64),
    workerSha256: "D".repeat(64),
    execute: {
      runtime: "node",
      entrypoint: "scripts/fates-slice04a-live-acceptance.mjs",
      command: ["node", "scripts/fates-slice04a-live-acceptance.mjs", "--execute"],
    },
    process: {
      runtime: "node",
      entrypoint: "fixtures/slice-004a-ananke-process/server.mjs",
    },
  };
  const errors = [];
  checkForLocalPathsObj(
    futureEvidence,
    "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-003.json",
    errors,
    immutableEvidenceAllowedPaths(
      join(root, "docs", "evidence", "FATES-SLICE-004A-live-acceptance-attempt-003.json"),
      root,
    ),
  );
  assert.deepEqual(errors, []);
  assert.equal(futureEvidence.execute.runtime, "node");
  assert.equal(futureEvidence.execute.entrypoint, "scripts/fates-slice04a-live-acceptance.mjs");
  assert.match(futureEvidence.driverSha256, /^[A-F0-9]{64}$/);
  assert.match(futureEvidence.integrationCheckpoint, /^[a-f0-9]{40}$/);
  assert.match(futureEvidence.fixtureSha256, /^[A-F0-9]{64}$/);
  assert.match(futureEvidence.workerSha256, /^[A-F0-9]{64}$/);
});

test("004A process-handle correction has no object-spread snapshot path", () => {
  const source = readFileSync(driver, "utf8");
  assert.equal((source.match(/processHandle\.baseUrl = baseUrl/g) ?? []).length, 2);
  assert.doesNotMatch(source, /return \{\.\.\.processHandle, baseUrl\}/);
  assert.match(source, /activeChildren\.add\(handle\)/);
});

test("004A evidence schema accepts bounded evidence and rejects malformed evidence", () => {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(evidenceSchema);
  const evidence = {
    schemaVersion: 2,
    sliceId: "FATES-SLICE-004",
    subsliceId: "FATES-SLICE-004A",
    attemptId: "001",
    classification: "PASS_BOUNDED",
    startingCheckpoints: {
      integration: "a".repeat(40),
      ananke: "b".repeat(40),
      horae: "c".repeat(40),
      moirae: "d".repeat(40),
      mnemosyne: "e".repeat(40),
      runtimeContracts: "f".repeat(40),
    },
    driverSha256: "A".repeat(64),
    fixtureSha256: "B".repeat(64),
    workerSha256: "C".repeat(64),
    lifecycle: {
      state: "passed",
      reservedAt: "2026-08-12T00:00:00.000Z",
      startedAt: "2026-08-12T00:00:01.000Z",
    },
    execute: {
      mode: "execute",
      ownerAuthorized: true,
      command: ["node", "driver.mjs"],
    },
    activeState: {
      status: "active",
      activeSliceId: "FATES-SLICE-004",
      activeSubsliceId: "FATES-SLICE-004A",
    },
    currentStage: "completed",
    processFacts: {
      processesStarted: 0,
      providerProcessesStarted: 0,
      starts: [],
    },
    providerFacts: {
      operationCountKnown: true,
      operationCount: 0,
      operationDigests: [],
    },
    durableFacts: { observed: false, lastState: null },
    cleanup: { attempted: true, completed: true, processesRemaining: 0 },
    failure: null,
    unknowns: [],
    cases: ["A", "B", "C", "D", "E"].map((id) => ({
      id,
      status: "PASS",
      providerOperationCount: 0,
      providerOperationCountKnown: true,
      redispatchCount: 0,
    })),
    limitations: ["bounded fixture only"],
  };
  assert.equal(validate(evidence), true);
  const malformed = { ...evidence, attemptId: "1" };
  assert.equal(validate(malformed), false);
});
