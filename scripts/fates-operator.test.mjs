import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, collectReport, installTargets, selectTargets } from './fates-operator.mjs';

const root = 'D:/Fates-Test-Workspace';

test('builds one-click plan for standalone Fates and the integration control plane', () => {
  const plan = buildPlan(root);
  assert.equal(plan.schemaVersion, '1.0');
  assert.deepEqual(plan.targets.map((target) => target.id), ['ananke', 'mnemosyne', 'horae', 'moirae', 'contracts']);
  assert.ok(plan.targets.every((target) => target.standalone && target.install === 'npm ci'));
  assert.equal(plan.integration.validation, 'npm run validate');
});

test('selects a single Fate or all Fates without accepting arbitrary paths', () => {
  assert.deepEqual(selectTargets('mnemosyne'), ['mnemosyne']);
  assert.equal(selectTargets('all').length, 5);
  assert.throws(() => selectTargets('../outside'), /Unknown Fate target/);
});

test('dry-run installation is side-effect free and reports every selected target', () => {
  const result = installTargets(root, 'all', { dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal(result.actions.length, 5);
  assert.ok(result.actions.every((action) => action.command === 'npm ci'));
});

test('reporting missing remote checkouts is safe and does not expose secrets', () => {
  const report = collectReport(root, '2026-08-24T12:00:00.000Z');
  assert.equal(report.generatedAt, '2026-08-24T12:00:00.000Z');
  assert.ok(report.fates.every((fate) => fate.repository.state === 'MISSING'));
  assert.equal(JSON.stringify(report).includes('TOKEN'), false);
});
