import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  APPROVED_ANANKE_SHA,
  assertAnankeRuntimeRoot,
  resolveAnankeRoot,
} from "../scripts/fates-slice04a-ananke-runtime.mjs";

test("004A explicit Ananke root resolves and validates compiled artifacts", () => {
  const { root, source } = resolveAnankeRoot({ env: process.env, cwd: process.cwd() });
  const result = assertAnankeRuntimeRoot(root);
  assert.equal(source, process.env.FATES_ANANKE_ROOT ? "explicit" : "local_fallback");
  assert.equal(result.artifacts.every((artifact) => artifact.exists), true);
});

test("004A invalid explicit Ananke root fails closed without fallback", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fates-slice04a-invalid-ananke-root-"));
  const invalidRoot = join(directory, "does-not-exist");
  try {
    const resolved = resolveAnankeRoot({
      env: { FATES_ANANKE_ROOT: invalidRoot },
      cwd: process.cwd(),
    });
    assert.equal(resolved.source, "explicit");
    assert.throws(
      () => assertAnankeRuntimeRoot(resolved.root),
      new RegExp("FATES_ANANKE_ROOT does not resolve to a directory"),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("004A approved Ananke provenance constant remains pinned", () => {
  assert.equal(APPROVED_ANANKE_SHA, "e7b405f3a217db6df31fe9ba7bde376ab666930c");
});
