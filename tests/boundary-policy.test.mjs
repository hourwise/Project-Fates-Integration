import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  IMMUTABLE_EVIDENCE_EXCEPTIONS,
  checkForLocalPathsObj,
  immutableEvidenceAllowedPaths,
} from "../scripts/boundary-policy.mjs";

const root = resolve(process.cwd());
const evidencePath = join(
  root,
  "docs",
  "evidence",
  "FATES-SLICE-004A-live-acceptance-attempt-002.json",
);
const evidenceRelativePath =
  "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-002.json";
const absolutePaths = [
  "C:\\Program Files\\nodejs\\node.exe",
  "D:\\Users\\fleur\\Project-Fates-Integration\\scripts\\fates-slice04a-live-acceptance.mjs",
];
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();

function findings(value, filePath, allowed = new Set()) {
  const errors = [];
  checkForLocalPathsObj(value, filePath, errors, allowed);
  return errors;
}

test("exact Attempt 002 evidence is exempt only at its pinned path and digest", () => {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const allowed = immutableEvidenceAllowedPaths(evidencePath, root);
  assert.deepEqual([...allowed], absolutePaths);
  assert.deepEqual(findings(evidence, evidenceRelativePath, allowed), []);
});

test("changing one evidence byte invalidates the immutable exception", () => {
  const tempRoot = resolve(root, "tests", ".tmp-boundary-evidence");
  const tempEvidence = join(tempRoot, evidenceRelativePath);
  try {
    mkdirSync(join(tempRoot, "docs", "evidence"), { recursive: true });
    copyFileSync(evidencePath, tempEvidence);
    appendFileSync(tempEvidence, " ");
    const evidence = JSON.parse(readFileSync(tempEvidence, "utf8"));
    const allowed = immutableEvidenceAllowedPaths(tempEvidence, tempRoot);
    assert.equal(allowed.size, 0);
    assert.equal(findings(evidence, evidenceRelativePath, allowed).length, 2);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("changing the registered digest invalidates the exception", () => {
  const registry = {
    ...IMMUTABLE_EVIDENCE_EXCEPTIONS,
    [evidenceRelativePath]: {
      ...IMMUTABLE_EVIDENCE_EXCEPTIONS[evidenceRelativePath],
      sha256: "0".repeat(64),
    },
  };
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const allowed = immutableEvidenceAllowedPaths(evidencePath, root, registry);
  assert.equal(allowed.size, 0);
  assert.equal(findings(evidence, evidenceRelativePath, allowed).length, 2);
});

test("same paths in another JSON, evidence, or Attempt 003 file still fail", () => {
  const value = { executable: absolutePaths[0], driver: absolutePaths[1] };
  for (const filePath of [
    "docs/other.json",
    "docs/evidence/other.json",
    "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-003.json",
  ]) {
    assert.equal(findings(value, filePath).length, 2);
  }
});

test("ordinary docs/config/source paths and existing boundary checks remain enforced", () => {
  const value = {
    ordinaryPath: absolutePaths[0],
    dependency: "file:../local-package",
    mutableBranch: "https://github.com/hourwise/Project-Ananke#main",
    mutableShorthand: "hourwise/Project-Ananke@main",
  };
  const errors = findings(value, "docs/ordinary.md");
  assert.equal(errors.length, 5);
  assert.match(errors[0], /absolute Windows path/);
  assert.match(errors[1], /forbidden "file:/);
  assert.match(errors[2], /mutable GitHub branch reference/);
  assert.match(errors[3], /mutable Fate repository reference/);
  assert.match(errors[4], /mutable Fate repository reference/);
});

test("the exception does not alter schema validation or the evidence bytes", () => {
  const schema = JSON.parse(
    readFileSync(
      join(root, "schemas", "slice04a-live-evidence.schema.json"),
      "utf8",
    ),
  );
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  assert.equal(ajv.compile(schema)(evidence), true);
  assert.equal(
    sha256(evidencePath),
    "CFF90A021CD5F9B13158D2376CCF290F6664D7FBC3C5C7CDCC7DB0FA9CD37F5E",
  );
});
