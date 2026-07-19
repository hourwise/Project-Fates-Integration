// tests/boundaries.test.mjs
// Tests for boundary verification rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('boundary verification', () => {
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
    const forbidden = ['Project-Adrasteia', 'Project-Ananke', 'Project-Mnemosyne', 'Project-Horae', 'Project-Moirae-Code'];
    for (const dir of forbidden) {
      assert.ok(!existsSync(resolve(root, dir)), `Peer folder "${dir}" must not exist`);
    }
  });
});
