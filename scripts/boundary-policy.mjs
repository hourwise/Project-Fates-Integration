import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

const forbiddenPrefixes = ["file:", "link:", "workspace:", "git+file:"];
const forbiddenBranchPattern =
  /^https:\/\/github\.com\/hourwise\/Project-[A-Za-z-]+#/;
const fateRepos = [
  "Project-Adrasteia",
  "Project-Ananke",
  "Project-Mnemosyne",
  "Project-Horae",
  "Project-Moirae-Code",
];

export const IMMUTABLE_EVIDENCE_EXCEPTIONS = Object.freeze({
  "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-002.json":
    Object.freeze({
      sha256:
        "CFF90A021CD5F9B13158D2376CCF290F6664D7FBC3C5C7CDCC7DB0FA9CD37F5E",
      allowedAbsolutePaths: Object.freeze([
        "C:\\Program Files\\nodejs\\node.exe",
        "D:\\Users\\fleur\\Project-Fates-Integration\\scripts\\fates-slice04a-live-acceptance.mjs",
      ]),
    }),
});

function sha256File(path) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex")
    .toUpperCase();
}

function relativeRepositoryPath(filePath, root) {
  return relative(root, filePath).replace(/\\/g, "/");
}

export function immutableEvidenceAllowedPaths(
  filePath,
  root,
  registry = IMMUTABLE_EVIDENCE_EXCEPTIONS,
) {
  const rule = registry[relativeRepositoryPath(filePath, root)];
  if (!rule || !existsSync(filePath) || sha256File(filePath) !== rule.sha256)
    return new Set();
  return new Set(rule.allowedAbsolutePaths);
}

export function checkForLocalPathsObj(
  obj,
  filePath,
  errors,
  allowedAbsolutePaths = new Set(),
) {
  if (typeof obj === "string") {
    const isAbsoluteWindowsPath =
      /^[A-Za-z]:/.test(obj) &&
      (obj[2] === String.fromCharCode(92) || obj[2] === "/");
    if (isAbsoluteWindowsPath && !allowedAbsolutePaths.has(obj)) {
      errors.push(`${filePath}: contains absolute Windows path "${obj}"`);
    }
    if (/^\/[^/]/.test(obj) && !/^https?:\/\//.test(obj)) {
      errors.push(`${filePath}: contains absolute Unix path "${obj}"`);
    }
    for (const prefix of forbiddenPrefixes) {
      if (obj.startsWith(prefix)) {
        errors.push(`${filePath}: contains forbidden "${prefix}" reference`);
      }
    }
    if (forbiddenBranchPattern.test(obj)) {
      errors.push(`${filePath}: contains mutable GitHub branch reference`);
    }
    for (const repo of fateRepos) {
      if (
        obj.includes(`hourwise/${repo}#`) ||
        obj.includes(`hourwise/${repo}@`)
      ) {
        errors.push(
          `${filePath}: contains mutable Fate repository reference to ${repo}`,
        );
      }
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      checkForLocalPathsObj(item, filePath, errors, allowedAbsolutePaths);
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const value of Object.values(obj)) {
      checkForLocalPathsObj(value, filePath, errors, allowedAbsolutePaths);
    }
  }
}
