import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const integrationRoot = process.cwd();
const anankeRoot = process.env.FATES_ANANKE_ROOT ?? 'D:/Users/fleur/Project Ananke';
const fixture = join(integrationRoot, 'fixtures', 'slice-004a-receipt-sink', 'server.mjs');
const { Gateway, HttpReceiptSinkProvider, DurableExecutionStateStore } = await import(
  pathToFileURL(join(anankeRoot, 'packages', 'runtime-core', 'dist', 'index.js')).href
);
const { AuditLog } = await import(
  pathToFileURL(join(anankeRoot, 'packages', 'audit-engine', 'dist', 'index.js')).href
);

const context = {
  authenticatedPrincipal: { id: 'smoke-host', kind: 'service', tenantId: 'smoke-tenant' },
  actingPrincipal: { id: 'smoke-agent', kind: 'agent', tenantId: 'smoke-tenant' },
  runtimeId: 'ananke',
  runtimeInstanceId: 'smoke-instance',
  tenantId: 'smoke-tenant',
  workspaceId: 'smoke-workspace',
  purpose: '004a-local-consumer-smoke',
  resourceScope: {
    mode: 'bounded',
    tenantId: 'smoke-tenant',
    resourceType: 'receipt-sink',
    resourceIds: ['smoke-target'],
    operations: ['write'],
  },
  sessionId: 'smoke-session',
  correlation: { requestId: 'smoke-request', correlationId: 'smoke-correlation' },
  policyVersion: 'builtin:0.1.0',
};

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'fates-slice04a-smoke-'));
const statePath = join(temporaryDirectory, 'provider-state.json');
const databasePath = join(temporaryDirectory, 'ananke.sqlite');
const sink = spawn(process.execPath, [fixture, '--port', '0', '--state', statePath], {
  cwd: integrationRoot,
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
sink.stdout.setEncoding('utf8');
sink.stdout.on('data', (chunk) => {
  output += chunk;
});
const port = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`receipt sink did not become ready: ${output}`)), 2_000);
  sink.stdout.on('data', () => {
    const line = output.split('\n').find((candidate) => candidate.startsWith('READY '));
    if (!line) return;
    clearTimeout(timer);
    resolve(JSON.parse(line.slice('READY '.length)).port);
  });
  sink.once('error', reject);
});

try {
  const store = new DurableExecutionStateStore(databasePath);
  const audit = new AuditLog();
  const gateway = new Gateway({ embeddedExecutionContext: context, autoLoadPolicy: false, audit });
  gateway.registerTool({
    name: 'fates.slice04a.receipt.write',
    server: 'integration.receipt-sink',
    description: 'Bounded disposable receipt-sink operation',
    riskClass: 'EXTERNAL_SEND',
    requiredPermissions: [],
    retryable: false,
    requiresApproval: true,
  });
  gateway.registerDurableReceiptSinkConsumer({
    toolName: 'fates.slice04a.receipt.write',
    effect: 'fixture.receipt.write',
    providerName: 'integration.receipt-sink',
    defaultTarget: 'smoke-target',
    store,
    provider: new HttpReceiptSinkProvider(`http://127.0.0.1:${port}/`),
    audit,
  });

  const action = {
    idempotencyKey: 'smoke-key-001',
    target: 'smoke-target',
    payloadDigest: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  };
  const requested = await gateway.execute('fates.slice04a.receipt.write', action, {
    purpose: context.purpose,
  });
  assert.equal(requested.outcome.state, 'WAITING_FOR_APPROVAL');
  const approvalId = requested.approvalGrantId;
  assert.ok(approvalId);
  assert.ok(
    gateway.approvals.approve(approvalId, {
      operatorId: 'smoke-operator',
      displayName: 'Smoke Operator',
      sessionId: 'smoke-operator-session',
      authMethod: 'dev-token',
      roles: ['admin'],
      authenticatedAt: '2026-08-12T00:00:00.000Z',
    }),
  );
  const completed = await gateway.execute('fates.slice04a.receipt.write', action, {
    approvalId,
    purpose: context.purpose,
  });
  assert.equal(completed.outcome.state, 'COMPLETED');
  const providerState = await (await fetch(`http://127.0.0.1:${port}/v1/state`)).json();
  assert.equal(providerState.operationCount, 1);
  assert.equal(store.getByIdempotency('004a:smoke-tenant:smoke-workspace', 'smoke-key-001')?.state, 'dispatched_confirmed_success');
  store.close();
  console.log(JSON.stringify({ governedPath: 'Gateway.execute', providerOperations: providerState.operationCount, outcome: completed.outcome.state }));
} finally {
  if (sink.exitCode === null) {
    sink.kill('SIGTERM');
    await once(sink, 'exit');
  }
  await rm(temporaryDirectory, { recursive: true, force: true });
}
