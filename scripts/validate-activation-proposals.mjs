// scripts/validate-activation-proposals.mjs
// Validates non-live activation proposal artifacts separately from live evidence.
// It deliberately does not add docs/activation JSON to canonical live-state discovery.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createSchemaValidators,
  repositoryRoot,
  validateDocument,
} from './validate-json.mjs';

const jsonFiles = [
  'docs/activation/FATES-SLICE-002-proposed-state-transition.json',
  'docs/activation/FATES-SLICE-002-activation-readiness-decision.json',
  'docs/activation/drafts/FATES-SLICE-002-active-slice.json',
  'docs/activation/drafts/FATES-SLICE-002-slice.json',
];

const markdownRequirements = {
  'docs/activation/FATES-SLICE-002-activation-proposal.md': [
    '# FATES-SLICE-002 activation proposal',
    '## Authority table',
    'CONTRADICTION_BLOCKS_ACTIVATION',
    'DOCUMENTATION_ONLY_CORRECTION',
  ],
  'docs/activation/FATES-SLICE-002-implementation-checkpoint-plan.md': [
    '# FATES-SLICE-002 implementation checkpoint plan',
    '## A. Integration evidence-freeze checkpoint',
    '## E. Final Integration checkpoint',
  ],
  'docs/activation/FATES-SLICE-002-handoff-requirements.md': [
    '# FATES-SLICE-002 handoff requirements',
    'LOCAL_SCHEMA_EXTENSION_REQUIRED',
    'PORTABLE_CONTRACT_NOT_REQUIRED',
  ],
  'docs/activation/FATES-SLICE-002-stop-and-suspension-conditions.md': [
    '# FATES-SLICE-002 stop and suspension conditions',
    '## Hard activation stops',
    '## Suspension conditions after activation',
  ],
};

const readinessDecisions = new Set([
  'READY_FOR_EXPLICIT_ACTIVATION',
  'READY_WITH_CONDITIONS',
  'NOT_READY_OWNER_DESIGNS_UNMERGED',
  'NOT_READY_BASELINE_DRIFT',
  'NOT_READY_EVIDENCE_INCOMPLETE',
  'NOT_READY_SCHEMA_GAP',
  'NOT_READY_OTHER',
]);

const findingClassifications = new Set([
  'COMPLETE_AND_APPROVED',
  'APPROVED_WITH_IMPLEMENTATION_DETAIL_REMAINING',
  'CONTRADICTION_BLOCKS_ACTIVATION',
  'MISSING_APPROVAL',
  'MISSING_FROZEN_EVIDENCE',
  'DOCUMENTATION_ONLY_CORRECTION',
]);

const failures = [];
const documents = new Map();

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function loadCanonicalJson(file) {
  const path = resolve(repositoryRoot, file);
  if (!existsSync(path)) {
    fail(file, 'missing file');
    return null;
  }

  const source = readFileSync(path, 'utf8');
  if (source.charCodeAt(0) === 0xfeff) fail(file, 'must not contain a UTF-8 BOM');
  if (source.includes('\r')) fail(file, 'must use LF line endings');

  let data;
  try {
    data = JSON.parse(source);
  } catch (error) {
    fail(file, `invalid JSON: ${error.message}`);
    return null;
  }

  if (`${JSON.stringify(data, null, 2)}\n` !== source) {
    fail(file, 'must use canonical two-space JSON formatting with a final newline');
  }
  documents.set(file, data);
  return data;
}

for (const file of jsonFiles) loadCanonicalJson(file);

for (const [file, requiredFragments] of Object.entries(markdownRequirements)) {
  const path = resolve(repositoryRoot, file);
  if (!existsSync(path)) {
    fail(file, 'missing file');
    continue;
  }
  const source = readFileSync(path, 'utf8');
  if (source.charCodeAt(0) === 0xfeff) fail(file, 'must not contain a UTF-8 BOM');
  if (source.includes('\r')) fail(file, 'must use LF line endings');
  for (const fragment of requiredFragments) {
    if (!source.includes(fragment)) fail(file, `missing required classification/section: ${fragment}`);
  }
}

const transitionFile = jsonFiles[0];
const transition = documents.get(transitionFile);
if (transition) {
  if (transition.sliceId !== 'FATES-SLICE-002') fail(transitionFile, 'sliceId must be FATES-SLICE-002');
  if (transition.decisionKind !== 'activation-proposal') fail(transitionFile, 'decisionKind must be activation-proposal');
  if (transition.activatesSlice !== false) fail(transitionFile, 'activatesSlice must be false');
  if (transition.proposalOnly !== true) fail(transitionFile, 'proposalOnly must be true');
  if (transition.activationAuthorized !== false) fail(transitionFile, 'activationAuthorized must be false');
  if (transition.lockChangesOnActivation !== false) fail(transitionFile, 'lockChangesOnActivation must be false');
  if (transition.compatibilityMatrixChangesOnActivation !== false) fail(transitionFile, 'compatibilityMatrixChangesOnActivation must be false');
  if (transition.compatibilitySetChangesOnActivation !== false) fail(transitionFile, 'compatibilitySetChangesOnActivation must be false');
  if (!Array.isArray(transition.remainingActivationConditions) || transition.remainingActivationConditions.length === 0) {
    fail(transitionFile, 'remainingActivationConditions must record the unresolved blockers');
  }
}

const readinessFile = jsonFiles[1];
const readiness = documents.get(readinessFile);
if (readiness) {
  if (readiness.activatesSlice !== false) fail(readinessFile, 'activatesSlice must be false');
  if (!readinessDecisions.has(readiness.decision)) fail(readinessFile, 'decision is not an allowed activation-readiness value');
  if (readiness.decision === 'READY_FOR_EXPLICIT_ACTIVATION') {
    fail(readinessFile, 'cannot be READY_FOR_EXPLICIT_ACTIVATION while recorded blockers remain');
  }
  if (readiness.safeToIssueSeparateExplicitActivationInstruction !== false) {
    fail(readinessFile, 'safeToIssueSeparateExplicitActivationInstruction must be false for this decision');
  }
  for (const finding of readiness.blockingFindings ?? []) {
    if (!findingClassifications.has(finding.classification)) {
      fail(readinessFile, `unknown finding classification: ${finding.classification}`);
    }
  }
}

const validators = createSchemaValidators(repositoryRoot);

const activeDraftFile = jsonFiles[2];
const activeDraft = documents.get(activeDraftFile);
if (activeDraft) {
  if (activeDraft.proposalOnly !== true || activeDraft.activatesSlice !== false) {
    fail(activeDraftFile, 'draft wrapper must be proposal-only and non-activating');
  }
  const result = validateDocument(validators, 'active-slice', activeDraft.proposedDocument);
  if (!result.valid) fail(activeDraftFile, `proposedDocument fails active-slice schema: ${JSON.stringify(result.errors)}`);
}

const sliceDraftFile = jsonFiles[3];
const sliceDraft = documents.get(sliceDraftFile);
if (sliceDraft) {
  if (sliceDraft.proposalOnly !== true || sliceDraft.activatesSlice !== false) {
    fail(sliceDraftFile, 'draft wrapper must be proposal-only and non-activating');
  }

  const projection = validateDocument(validators, 'slice', sliceDraft.schemaCompatibleProjection);
  if (!projection.valid) {
    fail(sliceDraftFile, `schemaCompatibleProjection fails current slice schema: ${JSON.stringify(projection.errors)}`);
  }

  const full = validateDocument(validators, 'slice', sliceDraft.proposedDocument);
  if (full.valid) {
    fail(sliceDraftFile, 'full proposedDocument unexpectedly validates; the recorded local schema gap is no longer true');
  } else {
    const missingFields = sliceDraft.schemaAssessment?.missingFields ?? [];
    for (const field of missingFields) {
      const recorded = full.errors.some(
        (error) => error.keyword === 'additionalProperties' && error.params?.additionalProperty === field,
      );
      if (!recorded) fail(sliceDraftFile, `expected current-schema rejection for ${field}`);
    }
  }
}

if (failures.length > 0) {
  console.error('FAIL: activation proposal validation failed.');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

for (const file of jsonFiles) console.log(`PASS: ${file}`);
for (const file of Object.keys(markdownRequirements)) console.log(`PASS: ${file}`);
console.log(`\nAll ${jsonFiles.length} activation JSON drafts and ${Object.keys(markdownRequirements).length} Markdown/classification documents validated successfully.`);
