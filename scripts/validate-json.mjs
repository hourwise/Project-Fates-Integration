// scripts/validate-json.mjs
// Validates all JSON files against their schemas using Ajv 2020.
// Uses only local schema files. Never accesses the network.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Load all schemas — compile directly, store in map
const schemas = {};
const schemaFiles = [
  { file: 'fates-lock.schema.json', key: 'fates-lock' },
  { file: 'compatibility-matrix.schema.json', key: 'compatibility-matrix' },
  { file: 'active-slice.schema.json', key: 'active-slice' },
  { file: 'slice.schema.json', key: 'slice' },
  { file: 'handoff.schema.json', key: 'handoff' },
];

for (const { file, key } of schemaFiles) {
  const schemaPath = resolve(root, 'schemas', file);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  delete schema.$schema; // Strip unresolvable meta-ref
  try {
    schemas[key] = ajv.compile(schema);
  } catch (e) {
    console.error(`Failed to compile schema ${file}: ${e.message}`);
    process.exit(1);
  }
}

// Files to validate
const targets = [
  { file: 'fates-lock.json', schemaKey: 'fates-lock' },
  { file: 'compatibility-matrix.json', schemaKey: 'compatibility-matrix' },
  { file: 'active-slice.json', schemaKey: 'active-slice' },
  { file: 'slices/001-stage-a-adoption/slice.json', schemaKey: 'slice' },
  { file: 'slices/_template/slice.json', schemaKey: 'slice' },
  { file: 'slices/_template/handoffs/handoff.example.json', schemaKey: 'handoff' },
  { file: 'compatibility-sets/fates-stage-a-2026-07.json', schemaKey: 'fates-lock' },
];

let totalErrors = 0;

for (const { file, schemaKey } of targets) {
  const filePath = resolve(root, file);
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`FAIL: ${file} — ${e.message}`);
    totalErrors++;
    continue;
  }

  const validate = schemas[schemaKey];
  if (!validate) {
    console.error(`FAIL: ${file} — schema "${schemaKey}" not found`);
    totalErrors++;
    continue;
  }

  const valid = validate(data);
  if (!valid) {
    console.error(`FAIL: ${file}`);
    for (const err of validate.errors || []) {
      const ptr = err.instancePath || '<root>';
      console.error(`  ${ptr}: ${err.keyword} — ${err.message}`);
    }
    totalErrors += (validate.errors || []).length;
  } else {
    console.log(`PASS: ${file}`);
  }
}

if (totalErrors > 0) {
  console.error(`\n${totalErrors} validation error(s) found.`);
  process.exit(1);
} else {
  console.log(`\nAll JSON files validated successfully.`);
}
