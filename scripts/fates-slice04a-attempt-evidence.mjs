import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export const ATTEMPT_EVIDENCE_SCHEMA_VERSION = 2;
const TERMINAL_CLASSIFICATIONS = new Set([
  "PASS_BOUNDED",
  "FAIL_BOUNDED",
  "INCOMPLETE",
  "ABORTED",
]);

function validateAttemptId(attemptId) {
  if (!/^\d{3}$/.test(attemptId))
    throw new Error("attempt ID must be exactly three digits");
}

function pathsFor(evidenceRoot, attemptId) {
  validateAttemptId(attemptId);
  const stem = `FATES-SLICE-004A-live-acceptance-attempt-${attemptId}`;
  return {
    eventsPath: join(evidenceRoot, `${stem}.events.ndjson`),
    finalPath: join(evidenceRoot, `${stem}.json`),
  };
}

function lineFor(event) {
  return `${JSON.stringify({ schemaVersion: ATTEMPT_EVIDENCE_SCHEMA_VERSION, ...event })}\n`;
}

export function attemptEvidencePaths(evidenceRoot, attemptId) {
  return pathsFor(evidenceRoot, attemptId);
}

export function attemptIsReserved(evidenceRoot, attemptId) {
  const { eventsPath, finalPath } = pathsFor(evidenceRoot, attemptId);
  return existsSync(eventsPath) || existsSync(finalPath);
}

/**
 * Reserve an attempt with an exclusive append-only journal. The journal is
 * the reservation record; the final JSON is created separately with wx.
 */
export function reserveAttempt({ evidenceRoot, attemptId, metadata }) {
  const { eventsPath, finalPath } = pathsFor(evidenceRoot, attemptId);
  mkdirSync(evidenceRoot, { recursive: true });
  if (existsSync(finalPath))
    throw new Error(`attempt evidence already exists: ${finalPath}`);
  writeFileSync(
    eventsPath,
    lineFor({
      event: "reserved",
      at: new Date().toISOString(),
      attemptId,
      ...metadata,
    }),
    { encoding: "utf8", flag: "wx" },
  );
  return { attemptId, eventsPath, finalPath, terminal: false };
}

export function appendAttemptEvent(handle, event) {
  if (!handle || handle.terminal)
    throw new Error("attempt evidence is already terminal");
  appendFileSync(
    handle.eventsPath,
    lineFor({ event: "progress", at: new Date().toISOString(), ...event }),
    "utf8",
  );
}

/**
 * Create the terminal JSON exactly once. The exclusive write prevents a later
 * attempt or cleanup path from replacing a retained failure or pass record.
 */
export function finalizeAttempt(handle, evidence) {
  if (!handle || handle.terminal)
    throw new Error("attempt evidence is already terminal");
  if (!TERMINAL_CLASSIFICATIONS.has(evidence.classification)) {
    throw new Error(
      `invalid terminal classification: ${evidence.classification}`,
    );
  }
  writeFileSync(handle.finalPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  appendAttemptEvent(handle, {
    lifecycle: "terminal",
    classification: evidence.classification,
  });
  handle.terminal = true;
}

export function readAttemptEvents(eventsPath) {
  return readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
