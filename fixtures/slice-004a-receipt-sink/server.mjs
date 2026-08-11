import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const HEX_DIGEST = /^[a-f0-9]{64}$/;
const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const port = Number(argument('--port', '0'));
const statePath = argument('--state', '');
const mode = argument('--mode', 'success');
if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('invalid --port');
if (!statePath) throw new Error('--state is required');
if (!['success', 'failure', 'drop'].includes(mode)) throw new Error('invalid --mode');

function emptyState() {
  return { schemaVersion: 1, nextSequence: 1, operations: [] };
}

function loadState() {
  if (!existsSync(statePath)) return emptyState();
  const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
  if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.operations)) {
    throw new Error('unsupported receipt-sink state');
  }
  return parsed;
}

let state = loadState();

function persistState() {
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(state) + '\n', 'utf8');
  renameSync(temporaryPath, statePath);
}

function json(response, status, body) {
  const encoded = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(encoded),
    'cache-control': 'no-store',
  });
  response.end(encoded);
}

function validString(value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw new Error(`${name} must be a bounded non-empty string`);
  }
}

function validDigest(value, name) {
  validString(value, name);
  if (!HEX_DIGEST.test(value)) throw new Error(`${name} must be a lowercase SHA-256 digest`);
}

function validateRequest(body) {
  const allowed = new Set([
    'intentId',
    'idempotencyScope',
    'idempotencyKey',
    'bindingDigest',
    'effect',
    'provider',
    'target',
    'argumentsDigest',
    'correlationId',
  ]);
  for (const key of Object.keys(body ?? {})) {
    if (!allowed.has(key)) throw new Error(`unsupported receipt-sink field: ${key}`);
  }
  for (const key of ['intentId', 'idempotencyScope', 'idempotencyKey', 'effect', 'provider', 'target', 'correlationId']) {
    validString(body?.[key], key);
  }
  validDigest(body?.bindingDigest, 'bindingDigest');
  validDigest(body?.argumentsDigest, 'argumentsDigest');
}

function receiptFor(operation) {
  return {
    providerOperationId: operation.providerOperationId,
    intentId: operation.intentId,
    idempotencyScope: operation.idempotencyScope,
    idempotencyKey: operation.idempotencyKey,
    bindingDigest: operation.bindingDigest,
    status: operation.status,
    resultDigest: operation.resultDigest,
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let content = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      content += chunk;
      if (content.length > 64 * 1024) reject(new Error('request body too large'));
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(content));
      } catch {
        reject(new Error('request body must be JSON'));
      }
    });
    request.on('error', reject);
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://receipt-sink.invalid');
    if (request.method === 'GET' && url.pathname === '/health') {
      json(response, 200, { status: 'ok', fixture: 'fates-slice-004a-receipt-sink' });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/v1/state') {
      json(response, 200, {
        schemaVersion: state.schemaVersion,
        operationCount: state.operations.length,
        operations: state.operations.map(receiptFor),
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/v1/operations') {
      const body = await readBody(request);
      validateRequest(body);
      const existing = state.operations.find(
        (operation) =>
          operation.idempotencyScope === body.idempotencyScope &&
          operation.idempotencyKey === body.idempotencyKey,
      );
      if (existing) {
        if (existing.bindingDigest !== body.bindingDigest) {
          json(response, 409, { error: 'idempotency_binding_mismatch' });
          return;
        }
        json(response, 200, { duplicate: true, receipt: receiptFor(existing) });
        return;
      }
      const operation = {
        providerOperationId: `receipt-op-${state.nextSequence++}-${randomUUID()}`,
        intentId: body.intentId,
        idempotencyScope: body.idempotencyScope,
        idempotencyKey: body.idempotencyKey,
        bindingDigest: body.bindingDigest,
        status: mode === 'failure' ? 'failure' : 'success',
        resultDigest: body.argumentsDigest,
      };
      state.operations.push(operation);
      persistState();
      if (mode === 'drop') {
        request.socket.destroy();
        return;
      }
      json(response, 201, { duplicate: false, receipt: receiptFor(operation) });
      return;
    }
    const operationMatch = url.pathname.match(/^\/v1\/operations\/([^/]+)$/);
    if (request.method === 'GET' && operationMatch) {
      const operation = state.operations.find((candidate) => candidate.providerOperationId === operationMatch[1]);
      if (!operation) {
        json(response, 404, { error: 'operation_not_found' });
        return;
      }
      json(response, 200, { receipt: receiptFor(operation) });
      return;
    }
    json(response, 404, { error: 'not_found' });
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : 'invalid_request' });
  }
});

server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('receipt sink did not bind a TCP port');
  process.stdout.write(`READY ${JSON.stringify({ port: address.port, fixture: 'fates-slice-004a-receipt-sink' })}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
