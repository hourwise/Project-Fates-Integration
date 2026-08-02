import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSchemaValidators,
  discoverValidationTargets,
  repositoryRoot,
  validateDocument,
} from '../scripts/validate-json.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = resolve(__dirname, 'fixtures', 'invalid');

describe('canonical JSON validator negative fixtures', () => {
  const validators = createSchemaValidators(repositoryRoot);

  for (const filename of readdirSync(fixtureDirectory).filter((file) => file.endsWith('.json'))) {
    it(`rejects ${filename}`, () => {
      const fixture = JSON.parse(readFileSync(resolve(fixtureDirectory, filename), 'utf-8'));
      const result = validateDocument(validators, fixture.schemaKey, fixture.document);
      assert.equal(result.valid, false, `${filename} unexpectedly passed ${fixture.schemaKey}`);
      assert.ok(
        result.errors.some((error) => error.keyword === fixture.expectedKeyword),
        `${filename} did not report expected keyword ${fixture.expectedKeyword}: ${JSON.stringify(result.errors)}`,
      );
    });
  }

  it('discovers all current compatibility snapshots, slices, and handoffs', () => {
    const targets = discoverValidationTargets(repositoryRoot).map((target) => target.file);
    assert.ok(targets.includes('compatibility-sets/fates-stage-a-2026-07.json'));
    assert.ok(targets.includes('slices/001-stage-a-adoption/slice.json'));
    assert.ok(targets.includes('slices/_template/handoffs/handoff.example.json'));
  });
});
