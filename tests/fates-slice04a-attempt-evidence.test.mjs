import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
  readAttemptEvents,
  reserveAttempt,
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
