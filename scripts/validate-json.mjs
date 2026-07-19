// scripts/validate-json.mjs
// Validates all JSON files against their schemas using Node.js built-ins.
// Never accesses the network.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    return { _error: `Failed to parse ${path}: ${e.message}` };
  }
}

function validateSchema(data, schema) {
  const errors = [];

  function validate(obj, sch, path) {
    if (sch.type === 'object') {
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        errors.push(`${path}: expected object, got ${typeof obj}`);
        return;
      }
      if (sch.required) {
        for (const key of sch.required) {
          if (!(key in obj)) {
            errors.push(`${path}: missing required property "${key}"`);
          }
        }
      }
      if (sch.properties) {
        for (const [key, propSch] of Object.entries(sch.properties)) {
          if (key in obj) {
            validate(obj[key], propSch, `${path}.${key}`);
          }
        }
      }
      if (sch.additionalProperties === false) {
        const allowed = new Set(Object.keys(sch.properties || {}));
        for (const key of Object.keys(obj)) {
          if (!allowed.has(key)) {
            errors.push(`${path}: disallowed property "${key}"`);
          }
        }
      }
    } else if (sch.type === 'array') {
      if (!Array.isArray(obj)) {
        errors.push(`${path}: expected array, got ${typeof obj}`);
        return;
      }
      if (sch.items) {
        for (let i = 0; i < obj.length; i++) {
          validate(obj[i], sch.items, `${path}[${i}]`);
        }
      }
    } else if (sch.type === 'string') {
      if (typeof obj !== 'string') {
        errors.push(`${path}: expected string, got ${typeof obj}`);
        return;
      }
      if (sch.pattern) {
        const re = new RegExp(`^${sch.pattern}$`);
        if (!re.test(obj)) {
          errors.push(`${path}: "${obj}" does not match pattern ${sch.pattern}`);
        }
      }
      if (sch.enum && !sch.enum.includes(obj)) {
        errors.push(`${path}: "${obj}" not in enum [${sch.enum.join(', ')}]`);
      }
    } else if (Array.isArray(sch.type)) {
      // Union type — check each
      let matched = false;
      for (const t of sch.type) {
        if (t === 'null' && obj === null) { matched = true; break; }
        if (t === 'string' && typeof obj === 'string') { matched = true; break; }
        if (t === 'object' && typeof obj === 'object' && obj !== null && !Array.isArray(obj)) { matched = true; break; }
        if (t === 'array' && Array.isArray(obj)) { matched = true; break; }
      }
      if (!matched) {
        errors.push(`${path}: expected one of types [${sch.type.join(', ')}], got ${typeof obj}`);
      }
    }

    // Handle conditional validation (if/then/else)
    if (sch.if) {
      const ifErrors = [];
      const savedErrors = errors;
      // Temporarily validate against if
      const tempErrors = [];
      // Hack: just check the if condition directly
      if (sch.if.properties) {
        let conditionMet = true;
        for (const [key, cond] of Object.entries(sch.if.properties)) {
          if (cond.const !== undefined) {
            if (obj[key] !== cond.const) {
              conditionMet = false;
            }
          }
        }
        if (conditionMet && sch.then) {
          validate(obj, sch.then, path);
        }
        if (!conditionMet && sch.else) {
          validate(obj, sch.else, path);
        }
      }
    }
  }

  validate(data, schema, '<root>');
  return errors;
}

// Find all JSON files and validate them
const jsonFiles = [
  { file: 'fates-lock.json', schema: 'schemas/fates-lock.schema.json' },
  { file: 'compatibility-matrix.json', schema: 'schemas/compatibility-matrix.schema.json' },
  { file: 'active-slice.json', schema: 'schemas/active-slice.schema.json' },
  { file: 'slices/001-stage-a-adoption/slice.json', schema: 'schemas/slice.schema.json' },
  { file: 'slices/_template/slice.json', schema: 'schemas/slice.schema.json' },
  { file: 'slices/_template/handoffs/handoff.example.json', schema: 'schemas/handoff.schema.json' },
];

let totalErrors = 0;

for (const { file, schema } of jsonFiles) {
  const filePath = resolve(root, file);
  const schemaPath = resolve(root, schema);

  const schemaData = readJSON(schemaPath);
  if (schemaData._error) {
    console.error(`ERROR: ${schemaData._error}`);
    totalErrors++;
    continue;
  }

  const data = readJSON(filePath);
  if (data._error) {
    console.error(`ERROR: ${data._error}`);
    totalErrors++;
    continue;
  }

  const errors = validateSchema(data, schemaData);
  if (errors.length > 0) {
    console.error(`FAIL: ${file}`);
    for (const err of errors) {
      console.error(`  ${err}`);
    }
    totalErrors += errors.length;
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
