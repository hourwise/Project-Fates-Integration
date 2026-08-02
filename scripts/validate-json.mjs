// scripts/validate-json.mjs
// Validates repository JSON evidence against its canonical Draft 2020-12 schemas.
// Uses only local schema files. Never accesses the network.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(__dirname, '..');

const schemaFiles = {
  'fates-lock': 'fates-lock.schema.json',
  'compatibility-matrix': 'compatibility-matrix.schema.json',
  'active-slice': 'active-slice.schema.json',
  slice: 'slice.schema.json',
  handoff: 'handoff.schema.json',
};

export function createSchemaValidators(root = repositoryRoot) {
  // Conditional branches require properties declared on their parent object. This is legal
  // JSON Schema, but Ajv's strictRequired lint treats it as suspicious unless disabled.
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  const validators = {};

  for (const [key, file] of Object.entries(schemaFiles)) {
    const schemaPath = resolve(root, 'schemas', file);
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    validators[key] = ajv.compile(schema);
  }

  return validators;
}

export function discoverValidationTargets(root = repositoryRoot) {
  const targets = [];
  const add = (file, schemaKey) => {
    if (existsSync(resolve(root, file))) targets.push({ file: file.replaceAll('\\', '/'), schemaKey });
  };

  add('fates-lock.json', 'fates-lock');
  add('compatibility-matrix.json', 'compatibility-matrix');
  add('active-slice.json', 'active-slice');

  for (const file of findJsonFiles(resolve(root, 'compatibility-sets'))) {
    targets.push({ file: relative(root, file).replaceAll('\\', '/'), schemaKey: 'fates-lock' });
  }

  for (const file of findJsonFiles(resolve(root, 'slices'))) {
    const normalized = relative(root, file).replaceAll('\\', '/');
    if (normalized.endsWith('/slice.json')) {
      targets.push({ file: normalized, schemaKey: 'slice' });
    } else if (normalized.includes('/handoffs/')) {
      targets.push({ file: normalized, schemaKey: 'handoff' });
    }
  }

  return targets.sort((left, right) => left.file.localeCompare(right.file));
}

export function validateDocument(validators, schemaKey, data) {
  const validate = validators[schemaKey];
  if (!validate) throw new Error(`Schema "${schemaKey}" not found`);
  const valid = validate(data);
  return { valid, errors: validate.errors ? structuredClone(validate.errors) : [] };
}

export function validateRepositoryJson(root = repositoryRoot) {
  const validators = createSchemaValidators(root);
  const targets = discoverValidationTargets(root);
  const failures = [];

  for (const { file, schemaKey } of targets) {
    let data;
    try {
      data = JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
    } catch (error) {
      failures.push({ file, errors: [{ instancePath: '', keyword: 'parse', message: error.message }] });
      continue;
    }

    const result = validateDocument(validators, schemaKey, data);
    if (!result.valid) failures.push({ file, errors: result.errors });
  }

  return { targets, failures };
}

function findJsonFiles(directory) {
  if (!existsSync(directory)) return [];
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.json')) results.push(path);
  }
  return results;
}

function run() {
  const { targets, failures } = validateRepositoryJson();
  const failedFiles = new Set(failures.map((failure) => failure.file));

  for (const target of targets) {
    if (!failedFiles.has(target.file)) console.log(`PASS: ${target.file}`);
  }

  for (const failure of failures) {
    console.error(`FAIL: ${failure.file}`);
    for (const error of failure.errors) {
      const pointer = error.instancePath || '<root>';
      console.error(`  ${pointer}: ${error.keyword} - ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} JSON file(s) failed validation.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${targets.length} JSON files validated successfully.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
