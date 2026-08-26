import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

export const APPROVED_ANANKE_SHA = "e7b405f3a217db6df31fe9ba7bde376ab666930c";

const REQUIRED_ARTIFACTS = [
  "packages/runtime-core/dist/index.js",
  "packages/runtime-core/dist/execution-state-store.js",
  "packages/audit-engine/dist/index.js",
];

export function resolveAnankeRoot({ env = process.env, cwd = process.cwd() } = {}) {
  if (env.FATES_ANANKE_ROOT) {
    return { root: resolve(env.FATES_ANANKE_ROOT), source: "explicit" };
  }
  const fallback = process.platform === "win32"
    ? "D:/Users/fleur/Project Ananke"
    : resolve(cwd, "..", "Project Ananke");
  return { root: resolve(fallback), source: "local_fallback" };
}

export function requiredAnankeArtifacts(root) {
  return REQUIRED_ARTIFACTS.map((relativePath) => ({
    relativePath,
    path: join(root, relativePath),
    exists: existsSync(join(root, relativePath)),
  }));
}

export function readAnankeSha(root) {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function assertAnankeRuntimeRoot(
  root,
  { requireApprovedSha = false } = {},
) {
  const resolvedRoot = resolve(root);
  if (!existsSync(resolvedRoot) || !statSync(resolvedRoot).isDirectory()) {
    throw new Error(`FATES_ANANKE_ROOT does not resolve to a directory: ${resolvedRoot}`);
  }
  const artifacts = requiredAnankeArtifacts(resolvedRoot);
  const missing = artifacts.filter((artifact) => !artifact.exists);
  if (missing.length) {
    throw new Error(
      `FATES_ANANKE_ROOT is missing compiled Ananke artifacts: ${missing.map((artifact) => artifact.relativePath).join(", ")}`,
    );
  }
  const sha = readAnankeSha(resolvedRoot);
  if (requireApprovedSha && sha !== APPROVED_ANANKE_SHA) {
    throw new Error(
      `Ananke checkout SHA mismatch: expected ${APPROVED_ANANKE_SHA}, received ${sha ?? "unavailable"}`,
    );
  }
  return { root: resolvedRoot, sha, artifacts };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const rootIndex = process.argv.indexOf("--root");
  const requestedRoot = rootIndex >= 0 ? process.argv[rootIndex + 1] : undefined;
  const requireApprovedSha = process.argv.includes("--require-approved-sha");
  const resolved = requestedRoot
    ? { root: resolve(requestedRoot), source: "explicit" }
    : resolveAnankeRoot();
  const result = assertAnankeRuntimeRoot(resolved.root, { requireApprovedSha });
  process.stdout.write(`${JSON.stringify({ ...resolved, ...result })}\n`);
}
