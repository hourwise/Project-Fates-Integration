import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyRetainedEvidenceWorktree,
} from "../scripts/fates-slice04a-live-acceptance.mjs";

const pair = [
  "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-005.json",
  "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-005.events.ndjson",
];

function digest(path) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex")
    .toUpperCase();
}

function git(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  assert.equal(
    result.status,
    0,
    `${args.join(" ")} failed: ${result.stderr ?? ""}`,
  );
}

function disposableRepo() {
  const repo = mkdtempSync(join(tmpdir(), "fates-slice04a-retained-"));
  git(repo, ["init", "--quiet"]);
  git(repo, ["config", "user.name", "Fates test"]);
  git(repo, ["config", "user.email", "fates-test@example.invalid"]);
  writeFileSync(join(repo, "baseline.txt"), "baseline\n");
  git(repo, ["add", "baseline.txt"]);
  git(repo, ["commit", "--quiet", "-m", "baseline"]);
  return repo;
}

function withRepo(callback) {
  const repo = disposableRepo();
  try {
    return callback(repo);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

function absolute(repo, relativePath) {
  return join(repo, ...relativePath.split("/"));
}

function createPair(repo) {
  mkdirSync(join(repo, "docs", "evidence"), { recursive: true });
  writeFileSync(absolute(repo, pair[0]), '{"attemptId":"005"}\n');
  writeFileSync(absolute(repo, pair[1]), '{"event":"reserved"}\n');
  return pair.map((relativePath) => `${relativePath}=${digest(absolute(repo, relativePath))}`);
}

function assertRejected(callback, pattern) {
  assert.throws(callback, pattern);
}

test("retained preflight accepts a clean worktree without approvals", () => {
  withRepo((repo) => {
    assert.deepEqual(
      verifyRetainedEvidenceWorktree({ repo, currentAttemptId: "006" }),
      {
        worktreeVerified: true,
        retainedEvidenceVerified: false,
        retainedEvidenceCount: 0,
        retainedEvidence: [],
      },
    );
  });
});

test("retained preflight accepts exactly the approved prior-attempt pair", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    const result = verifyRetainedEvidenceWorktree({
      repo,
      currentAttemptId: "006",
      approvalValues: approvals,
    });
    assert.equal(result.worktreeVerified, true);
    assert.equal(result.retainedEvidenceVerified, true);
    assert.equal(result.retainedEvidenceCount, 2);
    assert.deepEqual(
      result.retainedEvidence.map((entry) => entry.path),
      pair,
    );
    assert.deepEqual(
      result.retainedEvidence.map((entry) => entry.sha256),
      approvals.map((approval) => approval.split("=")[1]),
    );
  });
});

test("retained preflight rejects retained files without approvals", () => {
  withRepo((repo) => {
    createPair(repo);
    assertRejected(
      () => verifyRetainedEvidenceWorktree({ repo, currentAttemptId: "006" }),
      /unapproved untracked files/,
    );
  });
});

test("retained preflight rejects an incomplete pair", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: approvals.slice(0, 1),
        }),
      /complete JSON\/journal pair/,
    );
  });
});

test("retained preflight rejects missing and mismatched approved files", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    rmSync(absolute(repo, pair[0]));
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: approvals,
        }),
      /unapproved untracked files|approved retained evidence is missing/,
    );
  });

  withRepo((repo) => {
    const approvals = createPair(repo);
    writeFileSync(absolute(repo, pair[0]), '{"attemptId":"changed"}\n');
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: approvals,
        }),
      /retained evidence hash mismatch/,
    );
  });
});

test("retained preflight rejects malformed, duplicate, and conflicting approvals", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: [approvals[0].replace(/=[^=]+$/, "=not-a-sha")],
        }),
      /hash is malformed|complete JSON\/journal pair/,
    );
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: [...approvals, approvals[0]],
        }),
      /duplicate retained evidence approval/,
    );
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: [approvals[0], `${approvals[0].slice(0, -1)}0`, approvals[1]],
        }),
      /duplicate retained evidence approval/,
    );
  });
});

test("retained preflight rejects traversal, absolute, non-evidence, and future paths", () => {
  const invalidApprovals = [
    "../docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-005.json=" + "A".repeat(64),
    "C:/outside.json=" + "A".repeat(64),
    "docs/evidence/other.json=" + "A".repeat(64),
    "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-006.json=" + "A".repeat(64),
    "docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-007.json=" + "A".repeat(64),
  ];
  for (const approval of invalidApprovals) {
    withRepo((repo) => {
      assertRejected(
        () =>
          verifyRetainedEvidenceWorktree({
            repo,
            currentAttemptId: "006",
            approvalValues: [approval],
          }),
        /canonical|prior attempt/,
      );
    });
  }
});

test("retained preflight rejects an unexpected third untracked file", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    writeFileSync(join(repo, "unexpected.txt"), "not evidence\n");
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: approvals,
        }),
      /unapproved untracked files/,
    );
  });
});

test("retained preflight rejects tracked and staged changes unconditionally", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    writeFileSync(join(repo, "baseline.txt"), "modified\n");
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: approvals,
        }),
      /tracked or staged changes/,
    );
  });

  withRepo((repo) => {
    const approvals = createPair(repo);
    writeFileSync(join(repo, "staged.txt"), "staged\n");
    git(repo, ["add", "staged.txt"]);
    assertRejected(
      () =>
        verifyRetainedEvidenceWorktree({
          repo,
          currentAttemptId: "006",
          approvalValues: approvals,
        }),
      /tracked or staged changes/,
    );
  });
});

test("plan and execute share retained-evidence preflight and expose verification", () => {
  const source = readFileSync(
    join(process.cwd(), "scripts", "fates-slice04a-live-acceptance.mjs"),
    "utf8",
  );
  assert.equal(
    (source.match(/argsFor\([\s\S]{0,80}--approved-retained-evidence/g) ?? [])
      .length,
    2,
  );
  assert.equal(
    (source.match(/retainedEvidenceApprovalValues/g) ?? []).length >= 6,
    true,
  );
  assert.match(source, /integrationWorktree = verifyRetainedEvidenceWorktree/);
  assert.match(source, /retainedEvidenceVerified/);
  assert.match(source, /retainedEvidenceCount/);
  withRepo((repo) => {
    const approvals = createPair(repo);
    const result = verifyRetainedEvidenceWorktree({
      repo,
      currentAttemptId: "006",
      approvalValues: approvals,
    });
    assert.equal(result.retainedEvidenceCount, 2);
  });
});

test("retained preflight does not reserve attempts, start processes, or modify evidence", () => {
  withRepo((repo) => {
    const approvals = createPair(repo);
    const before = approvals.map((approval) => {
      const relativePath = approval.slice(0, approval.indexOf("="));
      return [relativePath, readFileSync(absolute(repo, relativePath))];
    });
    const result = verifyRetainedEvidenceWorktree({
      repo,
      currentAttemptId: "006",
      approvalValues: approvals,
    });
    assert.equal(result.retainedEvidenceCount, 2);
    for (const [relativePath, bytes] of before) {
      assert.deepEqual(readFileSync(absolute(repo, relativePath)), bytes);
    }
    const status = spawnSync(
      "git",
      ["-C", repo, "status", "--porcelain=v1", "--untracked-files=all"],
      { encoding: "utf8" },
    );
    assert.deepEqual(
      status.stdout.trim().split(/\r?\n/).sort(),
      ["?? docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-005.events.ndjson", "?? docs/evidence/FATES-SLICE-004A-live-acceptance-attempt-005.json"].sort(),
    );
  });
});
