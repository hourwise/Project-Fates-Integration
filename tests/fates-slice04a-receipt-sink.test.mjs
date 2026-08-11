import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const fixture = join(process.cwd(), 'fixtures', 'slice-004a-receipt-sink', 'server.mjs');
const DIGEST_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DIGEST_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

async function startSink(statePath) {
  const child = spawn(process.execPath, [fixture, '--port', '0', '--state', statePath], {
    cwd: process.cwd(),
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`fixture did not become ready: ${output}`)), 2_000);
    child.stdout.on('data', () => {
      const line = output.split('\n').find((candidate) => candidate.startsWith('READY '));
      if (!line) return;
      clearTimeout(timer);
      resolve(JSON.parse(line.slice('READY '.length)).port);
    });
    child.once('error', reject);
  });
  return { child, baseUrl: `http://127.0.0.1:${port}` };
}

async function stopSink(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await once(child, 'exit');
}

function requestBody(overrides = {}) {
  return {
    intentId: 'intent-fixture-001',
    idempotencyScope: 'tenant:tenant-a/workspace:workspace-a',
    idempotencyKey: 'effect-key-001',
    bindingDigest: DIGEST_A,
    effect: 'fixture.receipt.write',
    provider: 'integration.receipt-sink',
    target: 'synthetic-target-only',
    argumentsDigest: DIGEST_B,
    correlationId: 'correlation-fixture-001',
    ...overrides,
  };
}

async function post(baseUrl, body) {
  return fetch(`${baseUrl}/v1/operations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('receipt sink keeps independent state across duplicate, conflict, and process restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fates-slice04a-receipt-'));
  const statePath = join(directory, 'provider-state.json');
  let sink = await startSink(statePath);
  try {
    assert.deepEqual(await (await fetch(`${sink.baseUrl}/health`)).json(), {
      status: 'ok',
      fixture: 'fates-slice-004a-receipt-sink',
    });
    const first = await post(sink.baseUrl, requestBody());
    assert.equal(first.status, 201);
    const firstBody = await first.json();
    assert.equal(firstBody.duplicate, false);
    const operationId = firstBody.receipt.providerOperationId;

    const duplicate = await post(sink.baseUrl, requestBody());
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).duplicate, true);
    const conflict = await post(sink.baseUrl, requestBody({ bindingDigest: DIGEST_B }));
    assert.equal(conflict.status, 409);

    const state = await (await fetch(`${sink.baseUrl}/v1/state`)).json();
    assert.equal(state.operationCount, 1);
    await stopSink(sink.child);
    assert.match(await readFile(statePath, 'utf8'), /receipt-op-1/);

    sink = await startSink(statePath);
    const recovered = await (await fetch(`${sink.baseUrl}/v1/operations/${operationId}`)).json();
    assert.equal(recovered.receipt.providerOperationId, operationId);
    assert.equal(recovered.receipt.bindingDigest, DIGEST_A);
    assert.equal((await (await fetch(`${sink.baseUrl}/v1/state`)).json()).operationCount, 1);
  } finally {
    await stopSink(sink.child);
    await rm(directory, { recursive: true, force: true });
  }
});
