import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { EXPECTED_PINS, REQUIRED_BASE_URL } from './fates-slm.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function containsForbiddenSecretMaterial(value) {
  const serialized = JSON.stringify(value);
  return /-----BEGIN [^-]+-----|\b(sk-[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_]+)\b|\bBearer\s+[A-Za-z0-9._~+/=-]+/i.test(serialized);
}

export function validateSlmEvidence(outputDirectory, root = repositoryRoot) {
  const output = resolve(outputDirectory);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const schemas = {
    manifest: readJson(join(root, 'schemas', 'local-slm-run-manifest.schema.json')),
    summary: readJson(join(root, 'schemas', 'local-slm-summary.schema.json')),
    case: readJson(join(root, 'schemas', 'local-slm-case.schema.json')),
    timings: readJson(join(root, 'schemas', 'local-slm-timings.schema.json')),
  };
  const validators = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)]));
  const manifest = readJson(join(output, 'run-manifest.json'));
  const summary = readJson(join(output, 'summary.json'));
  const timings = readJson(join(output, 'timings.json'));
  const casePath = join(output, 'cases.jsonl');
  if (!existsSync(casePath)) throw new Error(`Missing evidence file: ${casePath}`);
  const cases = readFileSync(casePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`Invalid cases.jsonl line ${index + 1}: ${error.message}`); }
  });
  const failures = [];
  for (const [name, value] of [['manifest', manifest], ['summary', summary], ['timings', timings]]) {
    if (!validators[name](value)) failures.push({ file: name, errors: validators[name].errors });
  }
  cases.forEach((value, index) => {
    if (!validators.case(value)) failures.push({ file: `cases.jsonl:${index + 1}`, errors: validators.case.errors });
  });
  if (manifest.llamaCppEndpoint !== REQUIRED_BASE_URL && !['http://localhost:8080/v1', 'http://[::1]:8080/v1'].includes(manifest.llamaCppEndpoint)) {
    failures.push({ file: 'run-manifest.json', errors: [{ message: 'llamaCppEndpoint is not an accepted loopback /v1 endpoint' }] });
  }
  for (const [component, expected] of Object.entries(EXPECTED_PINS)) {
    if (manifest.componentSHAs?.[component] !== expected) failures.push({ file: 'run-manifest.json', errors: [{ message: `componentSHAs.${component} does not match the authoritative pin` }] });
  }
  if (manifest.runId !== summary.runId || manifest.runId !== timings.runId) failures.push({ file: 'cross-file', errors: [{ message: 'runId differs across evidence files' }] });
  if (containsForbiddenSecretMaterial(manifest) || containsForbiddenSecretMaterial(summary) || containsForbiddenSecretMaterial(cases) || containsForbiddenSecretMaterial(timings)) {
    failures.push({ file: 'evidence', errors: [{ message: 'credential or private-key material detected in evidence' }] });
  }
  return { valid: failures.length === 0, failures, manifest, summary, cases, timings };
}

function main() {
  const index = process.argv.indexOf('--output');
  const output = index >= 0 ? process.argv[index + 1] : undefined;
  if (!output) throw new TypeError('Usage: npm run validate:slm -- --output <evidence-directory>');
  const result = validateSlmEvidence(output);
  if (!result.valid) {
    for (const failure of result.failures) console.error(`FAIL ${failure.file}: ${failure.errors.map((error) => error.message).join('; ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`All local-SLM evidence validated successfully: ${result.cases.length} cases.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
