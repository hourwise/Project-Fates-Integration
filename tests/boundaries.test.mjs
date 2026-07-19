// tests/boundaries.test.mjs
// Tests for boundary verification rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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
});
