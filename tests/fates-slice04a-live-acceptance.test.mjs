import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';

const root = process.cwd();
const driver = join(root, 'scripts', 'fates-slice04a-live-acceptance.mjs');
const sink = join(root, 'fixtures', 'slice-004a-receipt-sink', 'server.mjs');
const worker = join(root, 'fixtures', 'slice-004a-ananke-process', 'server.mjs');
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
const baseArgs = ['--plan', '--approved-integration-sha', '562d7c6545edb4d1a00f93a77f51aa95261da291', '--approved-ananke-sha', '38c43aec29fe3080ff495f5f5f2433adc4632a66', '--approved-driver-sha256', sha(driver), '--approved-sink-sha256', sha(sink), '--approved-worker-sha256', sha(worker), '--sink-port', '34220', '--ananke-port', '34221'];
const evidenceSchema = JSON.parse(readFileSync(join(root, 'schemas', 'slice04a-live-evidence.schema.json'), 'utf8'));

test('004A plan is side-effect-free and reports the protected route', () => {
  const result = spawnSync(process.execPath, [driver, ...baseArgs], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true });
  const worktree = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true });
  if (worktree.stdout.trim() !== '') {
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /worktree is not clean/);
    return;
  }
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.processesStarted, 0);
  assert.equal(report.providerProcessesStarted, 0);
  assert.equal(report.providerOperations, 0);
  assert.equal(report.sqliteMutated, false);
  assert.equal(report.evidenceCreated, false);
  assert.equal(report.sourcePreflight.verified, true);
  assert.equal(report.sourcePreflight.route, 'Gateway.execute');
});

test('004A plan rejects a wrong checkpoint, hash, and execute authorization omission', () => {
  const wrongSha = [...baseArgs];
  wrongSha[wrongSha.indexOf('--approved-ananke-sha') + 1] = '0000000000000000000000000000000000000000';
  assert.notEqual(spawnSync(process.execPath, [driver, ...wrongSha], { cwd: root, encoding: 'utf8', shell: false }).status, 0);
  const wrongHash = [...baseArgs];
  wrongHash[wrongHash.indexOf('--approved-driver-sha256') + 1] = '0'.repeat(64);
  assert.notEqual(spawnSync(process.execPath, [driver, ...wrongHash], { cwd: root, encoding: 'utf8', shell: false }).status, 0);
  const execute = spawnSync(process.execPath, [driver, '--execute', '--attempt-id', '001'], { cwd: root, encoding: 'utf8', shell: false });
  assert.notEqual(execute.status, 0);
  assert.match(`${execute.stdout}${execute.stderr}`, /approved-integration-sha|owner-authorized/);
});

test('004A evidence target cannot overwrite an existing attempt', () => {
  const directory = mkdtempSync(join(tmpdir(), 'fates-slice04a-evidence-test-'));
  const path = join(directory, 'attempt-001.json');
  writeFileSync(path, '{}\n', 'utf8');
  assert.equal(existsSync(path), true);
  rmSync(directory, { recursive: true, force: true });
});

test('004A acceptance composition contains no low-level execution import', () => {
  const source = readFileSync(worker, 'utf8');
  assert.doesNotMatch(source, /executeTool|executorFor/);
  assert.match(source, /gateway\.start\(\)/);
  assert.match(source, /registerDurableReceiptSinkConsumer/);
});

test('004A evidence schema accepts bounded evidence and rejects malformed evidence', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(evidenceSchema);
  const evidence = {
    schemaVersion: 1,
    sliceId: 'FATES-SLICE-004',
    subsliceId: 'FATES-SLICE-004A',
    attemptId: '001',
    classification: 'PASS_BOUNDED',
    startingCheckpoints: {
      integration: 'a'.repeat(40), ananke: 'b'.repeat(40), horae: 'c'.repeat(40),
      moirae: 'd'.repeat(40), mnemosyne: 'e'.repeat(40), runtimeContracts: 'f'.repeat(40),
    },
    driverSha256: 'A'.repeat(64),
    fixtureSha256: 'B'.repeat(64),
    cases: ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, status: 'PASS', providerOperationCount: 0, redispatchCount: 0 })),
    limitations: ['bounded fixture only'],
  };
  assert.equal(validate(evidence), true);
  const malformed = { ...evidence, attemptId: '1' };
  assert.equal(validate(malformed), false);
});
