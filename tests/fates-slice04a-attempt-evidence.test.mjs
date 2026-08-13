import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  appendAttemptEvent,
  attemptEvidencePaths,
  attemptIsReserved,
  finalizeAttempt,
  normalizeAttemptId,
  readAttemptEvents,
  reserveAttempt,
  resolveAttemptLineage,
} from "../scripts/fates-slice04a-attempt-evidence.mjs";

const schema = JSON.parse(
  readFileSync(
    new URL("../schemas/slice04a-live-evidence.schema.json", import.meta.url),
    "utf8",
  ),
);

function validEvidence(attemptId) {
  return {
    schemaVersion: 2,
    sliceId: "FATES-SLICE-004",
    subsliceId: "FATES-SLICE-004A",
    attemptId,
    classification: "FAIL_BOUNDED",
    lifecycle: {
      state: "failed",
      reservedAt: "2026-08-12T10:00:00.000Z",
      startedAt: "2026-08-12T10:00:01.000Z",
      finishedAt: "2026-08-12T10:00:02.000Z",
    },
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
    currentStage: "case A duplicate",
    cases: [
      {
        id: "A",
        status: "FAIL",
        providerOperationCount: null,
        providerOperationCountKnown: false,
        redispatchCount: null,
        lastStage: "case A duplicate",
      },
    ],
    processFacts: {
      processesStarted: 2,
      providerProcessesStarted: 1,
      starts: [{ role: "receipt-sink", startedAt: "2026-08-12T10:00:01.000Z" }],
    },
    providerFacts: {
      operationCountKnown: false,
      operationCount: null,
      operationDigests: [],
    },
    durableFacts: { observed: true, lastState: "dispatched_confirmed_success" },
    cleanup: { attempted: true, completed: true, processesRemaining: 0 },
    failure: {
      caseId: "A",
      errorClass: "Error",
      message: "bounded failure",
      stage: "case A duplicate",
    },
    unknowns: ["Provider operation count was not retained."],
    limitations: ["bounded disposable fixture"],
  };
}

test("004A lineage normalizes only positive three-digit attempt IDs", () => {
  for (const attemptId of ["001", "005", "042"]) {
    assert.equal(normalizeAttemptId(attemptId), attemptId);
  }
  for (const attemptId of ["000", "5", "05", "abcd", "", undefined]) {
    assert.throws(
      () => normalizeAttemptId(attemptId),
      /positive three-digit/,
    );
  }
});

test("004A lineage resolves immediate predecessor identity, classification, and canonical paths", () => {
  const root = mkdtempSync(join(tmpdir(), "fates-slice04a-lineage-"));
  try {
    const predecessor = attemptEvidencePaths(root, "004").finalPath;
    writeFileSync(
      predecessor,
      JSON.stringify({ attemptId: "004", classification: "FAIL_BOUNDED" }),
    );
    const lineage = resolveAttemptLineage(root, "005");
    assert.equal(lineage.attemptId, "005");
    assert.equal(lineage.predecessorAttemptId, "004");
    assert.equal(lineage.predecessorEvidencePath, predecessor);
    assert.equal(lineage.predecessorClassification, "FAIL_BOUNDED");
    assert.equal(
      lineage.evidencePath,
      attemptEvidencePaths(root, "005").finalPath,
    );
    assert.equal(
      lineage.journalPath,
      attemptEvidencePaths(root, "005").eventsPath,
    );
    assert.equal(existsSync(lineage.evidencePath), false);
    assert.equal(existsSync(lineage.journalPath), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("004A lineage derives future predecessors generically and fails closed on bad predecessor state", () => {
  const root = mkdtempSync(join(tmpdir(), "fates-slice04a-lineage-generic-"));
  try {
    const nine = attemptEvidencePaths(root, "009").finalPath;
    writeFileSync(
      nine,
      JSON.stringify({ attemptId: "009", classification: "INCOMPLETE" }),
    );
    const ten = resolveAttemptLineage(root, "010");
    assert.equal(ten.predecessorAttemptId, "009");
    assert.equal(ten.predecessorClassification, "INCOMPLETE");

    rmSync(nine);
    assert.throws(
      () => resolveAttemptLineage(root, "010"),
      /predecessor evidence is missing/,
    );

    writeFileSync(
      nine,
      JSON.stringify({ attemptId: "008", classification: "INCOMPLETE" }),
    );
    assert.throws(
      () => resolveAttemptLineage(root, "010"),
      /attempt ID mismatch/,
    );

    writeFileSync(
      nine,
      JSON.stringify({ attemptId: "009", classification: "UNKNOWN" }),
    );
    assert.throws(
      () => resolveAttemptLineage(root, "010"),
      /classification is missing or invalid/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("004A synthetic Attempt 005 lineage resolves paths without touching retained evidence", () => {
  const retainedEvidenceRoot = join(process.cwd(), "docs", "evidence");
  const retainedBefore = {
    evidence: attemptIsReserved(retainedEvidenceRoot, "005"),
  };
  const evidenceRoot = mkdtempSync(join(tmpdir(), "fates-slice04a-current-lineage-"));
  try {
    const predecessor = attemptEvidencePaths(evidenceRoot, "004").finalPath;
    writeFileSync(
      predecessor,
      JSON.stringify({ attemptId: "004", classification: "FAIL_BOUNDED" }),
    );
    const lineage = resolveAttemptLineage(evidenceRoot, "005");
    assert.deepEqual(
      {
        attemptId: lineage.attemptId,
        predecessorAttemptId: lineage.predecessorAttemptId,
        predecessorEvidencePath: lineage.predecessorEvidencePath,
        predecessorClassification: lineage.predecessorClassification,
        evidencePath: lineage.evidencePath,
        journalPath: lineage.journalPath,
      },
      {
        attemptId: "005",
        predecessorAttemptId: "004",
        predecessorEvidencePath: predecessor,
        predecessorClassification: "FAIL_BOUNDED",
        evidencePath: attemptEvidencePaths(evidenceRoot, "005").finalPath,
        journalPath: attemptEvidencePaths(evidenceRoot, "005").eventsPath,
      },
    );
    assert.equal(attemptIsReserved(evidenceRoot, "005"), false);
    assert.equal(existsSync(lineage.evidencePath), false);
    assert.equal(existsSync(lineage.journalPath), false);
  } finally {
    rmSync(evidenceRoot, { recursive: true, force: true });
  }
  assert.deepEqual(
    { evidence: attemptIsReserved(retainedEvidenceRoot, "005") },
    retainedBefore,
  );
});

test("004A evidence reservation is exclusive, append-only, and terminal records cannot be replaced", () => {
  const root = mkdtempSync(join(tmpdir(), "fates-slice04a-attempt-evidence-"));
  try {
    const handle = reserveAttempt({
      evidenceRoot: root,
      attemptId: "001",
      metadata: { sliceId: "FATES-SLICE-004", subsliceId: "FATES-SLICE-004A" },
    });
    assert.equal(attemptIsReserved(root, "001"), true);
    assert.throws(
      () =>
        reserveAttempt({ evidenceRoot: root, attemptId: "001", metadata: {} }),
      /already reserved|already exists/,
    );
    appendAttemptEvent(handle, { caseId: "A", stage: "case_started" });
    finalizeAttempt(handle, validEvidence("001"));
    assert.equal(existsSync(attemptEvidencePaths(root, "001").finalPath), true);
    assert.throws(
      () => appendAttemptEvent(handle, { stage: "overwrite" }),
      /terminal/,
    );
    assert.throws(
      () =>
        reserveAttempt({ evidenceRoot: root, attemptId: "001", metadata: {} }),
      /already reserved|already exists/,
    );
    assert.equal(
      readAttemptEvents(handle.eventsPath).at(-1).classification,
      "FAIL_BOUNDED",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("004A evidence survives cleanup and represents unknown provider facts explicitly", () => {
  const root = mkdtempSync(
    join(tmpdir(), "fates-slice04a-attempt-evidence-cleanup-"),
  );
  const handle = reserveAttempt({
    evidenceRoot: root,
    attemptId: "002",
    metadata: {},
  });
  finalizeAttempt(handle, validEvidence("002"));
  assert.equal(
    JSON.parse(readFileSync(handle.finalPath, "utf8")).providerFacts
      .operationCountKnown,
    false,
  );
  assert.equal(existsSync(handle.eventsPath), true);
  rmSync(join(root, "unrelated-temp-state"), { recursive: true, force: true });
  assert.equal(existsSync(handle.finalPath), true);
  rmSync(root, { recursive: true, force: true });
});

test("004A version 2 failure evidence validates and malformed terminal evidence fails", () => {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const evidence = validEvidence("001");
  assert.equal(validate(evidence), true);
  assert.equal(validate({ ...evidence, attemptId: "1" }), false);
  assert.equal(
    validate({ ...evidence, classification: "PASS_BOUNDED", failure: null }),
    true,
  );
});

test("004A future evidence accepts bounded child diagnostics and portable provenance", () => {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const evidence = validEvidence("003");
  evidence.execute = {
    mode: "execute",
    ownerAuthorized: true,
    runtime: "node",
    entrypoint: "scripts/fates-slice04a-live-acceptance.mjs",
    command: ["node", "scripts/fates-slice04a-live-acceptance.mjs", "--execute"],
    provenance: {
      runtime: "node",
      entrypoint: "scripts/fates-slice04a-live-acceptance.mjs",
      mode: "execute",
      attemptId: "003",
      approvedCheckpoints: {
        integration: "a".repeat(40),
        ananke: "b".repeat(40),
      },
      artifactHashes: {
        driver: "A".repeat(64),
        sink: "B".repeat(64),
        worker: "C".repeat(64),
      },
    },
  };
  evidence.processFacts.starts = [
    {
      role: "ananke",
      runtime: "node",
      entrypoint: "fixtures/slice-004a-ananke-process/server.mjs",
      startedAt: "2026-08-12T10:00:01.000Z",
      readinessReached: false,
      stdout: { status: "observed", tail: "READY", truncated: false },
      stderr: { status: "observed_empty", tail: "", truncated: false },
      exitCode: 7,
      signal: null,
      spawnError: null,
      markers: {
        READY: { status: "not_observed" },
        EXECUTION_MARKER: { status: "not_observed" },
      },
    },
  ];
  const httpDiagnostic = {
    httpStatus: 200,
    gatewayOutcome: "COMPLETED",
    reasonCode: null,
    errorCode: null,
    approvalRequested: true,
    approvalIdPresent: true,
    approvalIdDigest: "D".repeat(64),
    approvalExpiresAt: "2026-08-12T10:05:00.000Z",
    durableState: "dispatched_confirmed_success",
    providerInvoked: false,
    bindingMismatch: false,
    correlationIdDigest: "E".repeat(64),
  };
  evidence.cases[0].duplicateDiagnostics = {
    firstExecution: { ...httpDiagnostic, providerInvoked: true },
    duplicateExecution: httpDiagnostic,
    firstApproval: {
      requested: { ...httpDiagnostic, gatewayOutcome: "WAITING_FOR_APPROVAL" },
      approvalIdDigest: "F".repeat(64),
      expiresAt: "2026-08-12T10:05:00.000Z",
      decisionHttpStatus: 200,
      decisionStatus: "approved",
    },
    duplicateApproval: {
      requested: { ...httpDiagnostic, gatewayOutcome: "WAITING_FOR_APPROVAL" },
      approvalIdDigest: "A".repeat(64),
      expiresAt: "2026-08-12T10:05:00.100Z",
      decisionHttpStatus: 200,
      decisionStatus: "approved",
    },
    providerCountBefore: 1,
    providerCountAfter: 1,
    durableReuseResult: "reused_completed",
    bindingMismatchResult: "not_observed",
  };
  assert.equal(validate(evidence), true);
});

test("004A future reservation provenance is logical and portable", () => {
  const root = mkdtempSync(join(tmpdir(), "fates-slice04a-portable-reservation-"));
  try {
    const handle = reserveAttempt({
      evidenceRoot: root,
      attemptId: "004",
      metadata: {
        sliceId: "FATES-SLICE-004",
        subsliceId: "FATES-SLICE-004A",
        mode: "execute",
        runtime: "node",
        entrypoint: "scripts/fates-slice04a-live-acceptance.mjs",
        provenance: {
          runtime: "node",
          entrypoint: "scripts/fates-slice04a-live-acceptance.mjs",
          mode: "execute",
          attemptId: "004",
          approvedCheckpoints: { integration: "a".repeat(40), ananke: "b".repeat(40) },
          artifactHashes: {
            driver: "A".repeat(64),
            sink: "B".repeat(64),
            worker: "C".repeat(64),
          },
        },
      },
    });
    const text = readFileSync(handle.eventsPath, "utf8");
    const event = readAttemptEvents(handle.eventsPath)[0];
    assert.equal(event.runtime, "node");
    assert.equal(event.entrypoint, "scripts/fates-slice04a-live-acceptance.mjs");
    assert.equal(event.provenance.attemptId, "004");
    assert.deepEqual(event.provenance.approvedCheckpoints, {
      integration: "a".repeat(40),
      ananke: "b".repeat(40),
    });
    assert.match(text, /artifactHashes/);
    assert.doesNotMatch(text, /process\.argv|[A-Z]:\\\\|[A-Z]:\/|\/Users\/|\/home\//);
    const driver = readFileSync(
      new URL("../scripts/fates-slice04a-live-acceptance.mjs", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(driver, /command:\s*process\.argv/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("004A failure stages retain bounded failure evidence without inventing provider facts", () => {
  for (const [index, stage] of [
    "before Case A provider call",
    "after provider call",
    "during duplicate assertion",
    "during later acceptance case",
    "during cleanup",
  ].entries()) {
    const root = mkdtempSync(
      join(tmpdir(), `fates-slice04a-failure-${index}-`),
    );
    try {
      const attemptId = String(index + 10).padStart(3, "0");
      const handle = reserveAttempt({
        evidenceRoot: root,
        attemptId,
        metadata: {},
      });
      appendAttemptEvent(handle, {
        caseId: index === 0 ? "A" : "B",
        stage,
        known: true,
      });
      const evidence = validEvidence(attemptId);
      evidence.currentStage = stage;
      evidence.failure.stage = stage;
      evidence.providerFacts = {
        operationCountKnown: false,
        operationCount: null,
        operationDigests: [],
      };
      evidence.unknowns = [`Provider operation count unknown at ${stage}.`];
      finalizeAttempt(handle, evidence);
      assert.equal(
        JSON.parse(readFileSync(handle.finalPath, "utf8")).failure.stage,
        stage,
      );
      assert.equal(
        readAttemptEvents(handle.eventsPath).some(
          (event) => event.stage === stage,
        ),
        true,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("004A attempt numbering consumes 001 and permits only future syntactic IDs", () => {
  const root = mkdtempSync(join(tmpdir(), "fates-slice04a-numbering-"));
  try {
    const first = reserveAttempt({
      evidenceRoot: root,
      attemptId: "001",
      metadata: {},
    });
    assert.equal(attemptIsReserved(root, "001"), true);
    assert.throws(() =>
      reserveAttempt({ evidenceRoot: root, attemptId: "001", metadata: {} }),
    );
    const future = reserveAttempt({
      evidenceRoot: root,
      attemptId: "002",
      metadata: {},
    });
    assert.equal(attemptIsReserved(root, "002"), true);
    assert.notEqual(first.eventsPath, future.eventsPath);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
