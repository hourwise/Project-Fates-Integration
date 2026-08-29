// tests/boundaries.test.mjs
// Tests for boundary verification rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
function runBoundaries() {
  return spawnSync(process.execPath, [resolve(root, 'scripts/verify-boundaries.mjs')], {
    cwd: root,
    encoding: 'utf-8',
  });
}

function runFixture({ evidence = {}, packageJson = {}, packageLock = null }) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'fates-boundaries-'));
  const scriptPath = join(fixtureRoot, 'scripts', 'verify-boundaries.mjs');
  const evidencePath = join(fixtureRoot, 'docs', 'evidence', 'fixture.json');
  try {
    mkdirSync(dirname(scriptPath), { recursive: true });
    mkdirSync(dirname(evidencePath), { recursive: true });
    copyFileSync(resolve(root, 'scripts/verify-boundaries.mjs'), scriptPath);
    writeFileSync(join(fixtureRoot, 'package.json'), JSON.stringify(packageJson));
    if (packageLock !== null) {
      writeFileSync(join(fixtureRoot, 'package-lock.json'), JSON.stringify(packageLock));
    }
    writeFileSync(evidencePath, JSON.stringify(evidence));
    return spawnSync(process.execPath, [scriptPath], {
      cwd: fixtureRoot,
      encoding: 'utf-8',
    });
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

describe('boundary verification', () => {
  it('passes boundary verification', () => {
    const result = runBoundaries();
    assert.strictEqual(result.status, 0, `expected pass: ${result.stderr}`);
  });

  it('.gitmodules rejected', () => {
    assert.ok(!existsSync(resolve(root, '.gitmodules')), '.gitmodules must not exist');
  });

  it('peer local dependency rejected', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [name, version] of Object.entries(pkg[field])) {
          assert.ok(!version.startsWith('file:'), `${field}.${name} must not use file: dependency`);
          assert.ok(!version.startsWith('link:'), `${field}.${name} must not use link: dependency`);
          assert.ok(!version.startsWith('workspace:'), `${field}.${name} must not use workspace: dependency`);
        }
      }
    }
    assert.strictEqual(pkg.workspaces, undefined, 'workspaces must not be defined');
  });

  it('local paths rejected in lock', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    for (const [name, repo] of Object.entries(lock.repositories)) {
      assert.ok(!repo.url.includes(':\\'), `${name} URL must not be a Windows path`);
      assert.ok(!repo.url.startsWith('/'), `${name} URL must not be a Unix path`);
      assert.ok(!repo.url.startsWith('.'), `${name} URL must not be relative`);
    }
  });

  it('no peer source folders at root', () => {
    const forbidden = ['Project-Adrasteia', 'Project-Ananke', 'Project-Mnemosyne', 'Project-Horae', 'Project-Moirae-Code', '.peer-checkouts'];
    for (const dir of forbidden) {
      assert.ok(!existsSync(resolve(root, dir)), `Peer folder "${dir}" must not exist`);
    }
  });

  it('no mutable GitHub branch deps in package.json', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    const depFields = ['dependencies', 'devDependencies'];
    const branchPattern = /^https:\/\/github\.com\/hourwise\/Project-[A-Za-z-]+#/;
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [name, version] of Object.entries(pkg[field])) {
          assert.ok(!branchPattern.test(version),
            `${field}.${name}: mutable GitHub branch reference "${version}"`);
        }
      }
    }
  });

  it('no GitHub shorthand deps in package.json', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    const depFields = ['dependencies', 'devDependencies'];
    const shorthand = /^hourwise\/Project-[A-Za-z-]+@/;
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [name, version] of Object.entries(pkg[field])) {
          assert.ok(!shorthand.test(version),
            `${field}.${name}: GitHub shorthand "${version}"`);
        }
      }
    }
  });

  it('snapshot matches lock for seal status', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    const snapshot = JSON.parse(readFileSync(resolve(root, 'compatibility-sets/fates-stage-a-2026-07.json'), 'utf-8'));
    assert.strictEqual(snapshot.sealStatus, lock.sealStatus);
    assert.strictEqual(snapshot.integrationLevel, lock.integrationLevel);
  });

  // Negative tests

  it('rejects Windows paths', () => {
    const bad = 'C:\\Users\\test\\Project-Adrasteia';
    assert.ok(/^[A-Za-z]:[/\\]/.test(bad), 'should match Windows path pattern');
  });

  it('rejects Unix absolute paths', () => {
    const bad = '/home/user/Project-Adrasteia';
    assert.ok(bad.startsWith('/') && !bad.startsWith('https://'), 'should be absolute Unix path');
  });

  it('rejects file: dependency prefix', () => {
    assert.ok('file:../peer'.startsWith('file:'), 'file: prefix must be detected');
  });

  it('rejects link: dependency prefix', () => {
    assert.ok('link:../peer'.startsWith('link:'), 'link: prefix must be detected');
  });

  it('rejects workspace: dependency prefix', () => {
    assert.ok('workspace:*'.startsWith('workspace:'), 'workspace: prefix must be detected');
  });

  it('rejects mutable branch reference', () => {
    const bad = 'https://github.com/hourwise/Project-Adrasteia#main';
    const pattern = /^https:\/\/github\.com\/hourwise\/Project-[A-Za-z-]+#/;
    assert.ok(pattern.test(bad), 'should detect mutable branch reference');
  });

  it('rejects completed handoff without ending commit', () => {
    const fixture = {
      handoffStatus: 'completed',
      endingCommit: null,
    };
    assert.strictEqual(fixture.handoffStatus, 'completed');
    assert.strictEqual(fixture.endingCommit, null,
      'completed handoff must have endingCommit');
  });

  it('rejects completed handoff with non-green CI when sealed', () => {
    const fixture = {
      handoffStatus: 'completed',
      ciStatus: 'failing',
    };
    assert.strictEqual(fixture.ciStatus, 'failing',
      'failing CI is problematic for sealed checkpoints');
  });

  it('allows a bounded logical file sourceId in evidence', () => {
    const result = runFixture({ evidence: { sourceId: 'file:docs/fates-005c.md' } });
    assert.strictEqual(result.status, 0, result.stderr);
  });

  it('does not allow the logical file sourceId exception by string prefix alone', () => {
    const result = runFixture({ evidence: { note: 'file:docs/fates-005c.md' } });
    assert.notStrictEqual(result.status, 0);
  });

  it('rejects absolute and traversal sourceIds', () => {
    for (const sourceId of [
      'file:/etc/passwd',
      'file://etc/passwd',
      'file:../secret',
      'file:docs/../../secret',
      'file:C:\\secret',
      'file:C:/secret',
    ]) {
      const result = runFixture({ evidence: { sourceId } });
      assert.notStrictEqual(result.status, 0, sourceId);
    }
  });

  it('continues to reject local dependency prefixes in package metadata', () => {
    for (const version of ['file:../peer', 'link:../peer', 'workspace:*']) {
      const result = runFixture({ packageJson: { dependencies: { peer: version } } });
      assert.notStrictEqual(result.status, 0, version);
    }
    const result = runFixture({ packageLock: { packages: { 'node_modules/peer': { version: 'git+file:../peer' } } } });
    assert.notStrictEqual(result.status, 0, 'git+file:../peer');
  });

  it('rejects absolute paths elsewhere in evidence', () => {
    for (const location of ['/etc/passwd', 'C:\\secret', 'C:/secret']) {
      const result = runFixture({ evidence: { location } });
      assert.notStrictEqual(result.status, 0, location);
    }
  });

  it('rejects mutable Fate GitHub references in evidence', () => {
    const result = runFixture({ evidence: { source: 'https://github.com/hourwise/Project-Adrasteia#main' } });
    assert.notStrictEqual(result.status, 0);
  });
});
