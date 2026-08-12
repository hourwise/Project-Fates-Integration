import { statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  assertAnankeRuntimeRoot,
  resolveAnankeRoot,
} from '../../scripts/fates-slice04a-ananke-runtime.mjs';

const integrationRoot = process.cwd();
const { root: anankeRoot } = resolveAnankeRoot({ cwd: integrationRoot });
assertAnankeRuntimeRoot(anankeRoot);
const runtime = await import(
  pathToFileURL(join(anankeRoot, 'packages', 'runtime-core', 'dist', 'index.js')).href,
);
const { AuditLog } = await import(
  pathToFileURL(join(anankeRoot, 'packages', 'audit-engine', 'dist', 'index.js')).href,
);

function startupStage(stage) {
  process.stdout.write(`STARTUP_STAGE ${JSON.stringify({ stage })}\n`);
}

startupStage('worker_entered');
startupStage('runtime_modules_loaded');

const args = process.argv.slice(2);
function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function required(name) {
  const value = argument(name, '');
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const port = Number(argument('--port', '0'));
const databasePath = required('--database');
const providerUrl = argument('--provider', '');
const failpoint = argument('--failpoint', '');
const crashMode = argument('--crash-mode', '');
const reconcileIntentId = argument('--reconcile-intent', '');
const genericNegative = args.includes('--generic-negative');
const callbackMarker = argument('--callback-marker', '');
const storeProbe = args.includes('--store-probe');
const toolName = 'fates.slice04a.receipt.write';
const scope = '004a:local-development:default';

startupStage('arguments_parsed');

if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('invalid --port');
if (!['', 'after_intent', 'after_dispatch_marker', 'after_provider_call'].includes(failpoint)) {
  throw new Error('invalid --failpoint');
}
if (!['', 'after_dispatch_marker', 'after_provider_call'].includes(crashMode)) {
  throw new Error('invalid --crash-mode');
}
if (!storeProbe && !genericNegative && !providerUrl) throw new Error('--provider is required');

const databaseParent = dirname(databasePath);
startupStage('sqlite_parent_preflight_begun');
const parentStat = statSync(databaseParent);
if (!parentStat.isDirectory()) throw new Error('database parent is not a directory');
startupStage('sqlite_parent_preflight_completed');

if (storeProbe) {
  process.stdout.write(`STORE_PROBE_BEFORE_CONSTRUCTION ${JSON.stringify({ databasePath })}\n`);
  startupStage('sqlite_store_construction_begun');
  const probeStore = new runtime.DurableExecutionStateStore(databasePath);
  startupStage('sqlite_store_construction_completed');
  process.stdout.write(`STORE_PROBE_AFTER_CONSTRUCTION ${JSON.stringify({ databasePath })}\n`);
  probeStore.close();
  process.stdout.write('STORE_PROBE_CLOSED {}\n');
  process.exit(0);
}

startupStage('sqlite_store_construction_begun');
const store = new runtime.DurableExecutionStateStore(databasePath);
startupStage('sqlite_store_construction_completed');
const audit = new AuditLog();

function registerGateway() {
  const gateway = new runtime.Gateway({
    port,
    developmentMode: true,
    autoLoadPolicy: false,
    audit,
  });
  gateway.registerTool({
    name: toolName,
    server: 'integration.receipt-sink',
    description: 'Bounded disposable receipt-sink operation',
    riskClass: 'EXTERNAL_SEND',
    requiredPermissions: [],
    retryable: false,
    requiresApproval: true,
  });

  if (genericNegative) {
    gateway.setExecutor(toolName, async () => {
      if (callbackMarker) writeFileSync(callbackMarker, 'CALLBACK_INVOKED\n', 'utf8');
      return { success: true, data: { callbackInvoked: true } };
    });
    return { gateway, consumer: undefined };
  }

  gateway.registerDurableReceiptSinkConsumer({
    toolName,
    effect: 'fixture.receipt.write',
    providerName: 'integration.receipt-sink',
    defaultTarget: 'acceptance-target',
    store,
    provider: new runtime.HttpReceiptSinkProvider(providerUrl),
    audit,
    reconciliationBudget: { maxQueries: 3, perQueryTimeoutMs: 250, totalTimeoutMs: 1_000 },
  });
  const consumer = gateway.durableReceiptSinkConsumer(toolName);
  if (!consumer) throw new Error('durable consumer registration did not produce a consumer');
  if (failpoint) consumer.setFailpoint(failpoint);
  return { gateway, consumer };
}

if (reconcileIntentId) {
  startupStage('gateway_construction_begun');
  const { consumer } = registerGateway();
  startupStage('gateway_construction_completed');
  if (!consumer) throw new Error('reconciliation requires durable consumer mode');
  const recovered = consumer.recoverAfterRestart();
  const result = await consumer.reconcile(reconcileIntentId);
  process.stdout.write(
    `RECOVERY_RESULT ${JSON.stringify({
      intentId: result.intentId,
      state: result.state,
      version: result.version,
      attemptId: result.attemptId,
      dispatchMarkerId: result.dispatchMarkerId,
      providerOperationId: result.providerOperationId,
      providerResultDigest: result.providerResultDigest,
      reconciliationAttempts: result.reconciliationAttempts,
      recoveredIntentIds: recovered.map((intent) => intent.intentId),
    })}\n`,
  );
  store.close();
  process.exit(0);
}

startupStage('gateway_construction_begun');
const { gateway, consumer } = registerGateway();
startupStage('gateway_construction_completed');
const originalExecute = gateway.execute.bind(gateway);
gateway.execute = async (...executeArgs) => {
  const result = await originalExecute(...executeArgs);
  const actionArgs = executeArgs[1];
  const key = actionArgs && typeof actionArgs.idempotencyKey === 'string' ? actionArgs.idempotencyKey : '';
  const intent = key ? store.getByIdempotency(scope, key) : undefined;
  if (intent) {
    process.stdout.write(
      `EXECUTION_MARKER ${JSON.stringify({
        intentId: intent.intentId,
        state: intent.state,
        version: intent.version,
        providerOperationId: intent.providerOperationId,
        key,
      })}\n`,
    );
  }
  if (crashMode && intent?.state === 'dispatch_marked') {
    process.stdout.write(
      `CRASH_MARKER ${JSON.stringify({ intentId: intent.intentId, state: intent.state, crashMode })}\n`,
    );
    setImmediate(() => process.exit(75));
  }
  return result;
};

startupStage('gateway_start_begun');
gateway.start();
startupStage('gateway_start_completed');
if (consumer) {
  process.stdout.write(
    `ACCEPTANCE_COMPOSITION ${JSON.stringify({
      route: 'Gateway.execute',
      toolName,
      durableConsumer: true,
      lowLevelCallbacks: false,
      databasePath,
      providerUrl,
    })}\n`,
  );
} else {
  process.stdout.write(
    `ACCEPTANCE_COMPOSITION ${JSON.stringify({
      route: 'Gateway.execute',
      toolName,
      durableConsumer: false,
      genericEffectNegative: true,
      lowLevelCallbacks: false,
    })}\n`,
  );
}

function close() {
  try {
    store.close();
  } catch {
    // Process teardown is best effort; the driver records exit state.
  }
}
process.once('SIGTERM', () => {
  close();
  process.exit(0);
});
process.once('SIGINT', () => {
  close();
  process.exit(0);
});
