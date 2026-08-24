import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const FATE_TARGETS = Object.freeze({
  ananke: { directory: 'Project Ananke', packageName: '@ananke/runtime', validation: 'npm run validate:quick', role: 'policy, authority, and content observation' },
  mnemosyne: { directory: 'Project Mnemosyne', packageName: 'mnemosyne', validation: 'npm run validate', role: 'memory, provenance, and admission' },
  horae: { directory: 'Project Horae', packageName: 'horae', validation: 'npm run validate', role: 'discovery, composition, and orchestration' },
  moirae: { directory: 'Project Moirae Code', packageName: 'moirae-code', validation: 'npm run validate', role: 'host, sandbox, and user-facing integration' },
  contracts: { directory: 'Project Runtime Contracts', packageName: 'project-runtime-contracts', validation: 'npm run validate', role: 'portable shared contracts' },
});

const ALL_TARGET = 'all';

export function resolveWorkspaceRoot(value = process.env.FATES_WORKSPACE_ROOT) {
  return resolve(value ?? process.cwd(), value ? '.' : '..');
}

export function buildPlan(workspaceRoot) {
  const root = resolve(workspaceRoot);
  return {
    schemaVersion: '1.0',
    workspaceRoot: root,
    integration: {
      directory: resolve(root, 'Project-Fates-Integration'),
      validation: 'npm run validate',
      role: 'compatibility, boundaries, and integration control',
    },
    targets: Object.entries(FATE_TARGETS).map(([id, target]) => ({
      id,
      directory: target.directory,
      path: resolve(root, target.directory),
      packageName: target.packageName,
      role: target.role,
      install: 'npm ci',
      validation: target.validation,
      standalone: true,
    })),
    usage: {
      inspect: 'node scripts/fates-operator.mjs report --json',
      installOne: 'node scripts/fates-operator.mjs install mnemosyne --yes',
      installAll: 'node scripts/fates-operator.mjs install all --yes',
      validateIntegration: 'npm run validate',
    },
  };
}

export function collectReport(workspaceRoot, now = new Date().toISOString()) {
  const plan = buildPlan(workspaceRoot);
  return {
    schemaVersion: plan.schemaVersion,
    generatedAt: now,
    workspaceRoot: plan.workspaceRoot,
    integration: repositoryReport(plan.integration.directory, plan.integration.validation),
    fates: plan.targets.map((target) => ({
      id: target.id,
      role: target.role,
      path: target.path,
      standalone: target.standalone,
      validation: target.validation,
      repository: repositoryReport(target.path, target.validation),
    })),
  };
}

function repositoryReport(directory, validation) {
  if (!existsSync(directory)) return { state: 'MISSING', validation };
  const packageJsonPath = join(directory, 'package.json');
  const packageJson = existsSync(packageJsonPath) ? safeJson(packageJsonPath) : undefined;
  return {
    state: 'PRESENT',
    branch: git(directory, ['branch', '--show-current']) || 'DETACHED_OR_UNKNOWN',
    head: git(directory, ['rev-parse', 'HEAD']) || 'UNKNOWN',
    dirty: Boolean(git(directory, ['status', '--porcelain'])),
    packageName: packageJson?.name ?? 'UNKNOWN',
    packageVersion: packageJson?.version ?? 'UNKNOWN',
    availableScripts: Object.keys(packageJson?.scripts ?? {}).sort(),
    validation,
  };
}

function safeJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return undefined; }
}

function git(directory, args) {
  try {
    return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function selectTargets(target) {
  if (target === ALL_TARGET) return Object.keys(FATE_TARGETS);
  if (target in FATE_TARGETS) return [target];
  throw new Error(`Unknown Fate target: ${target}. Choose ${Object.keys(FATE_TARGETS).join(', ')} or all.`);
}

export function installTargets(workspaceRoot, target, { yes = false, dryRun = false } = {}) {
  const selected = selectTargets(target);
  const actions = selected.map((id) => ({ id, path: resolve(workspaceRoot, FATE_TARGETS[id].directory), command: 'npm ci' }));
  if (!yes && !dryRun) throw new Error('Installation changes checkout state; pass --yes or use --dry-run.');
  if (dryRun) return { schemaVersion: '1.0', dryRun: true, actions };

  for (const action of actions) {
    if (!existsSync(action.path)) throw new Error(`FATE_REPOSITORY_MISSING:${action.id}:${action.path}`);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(npm, ['ci'], { cwd: action.path, stdio: 'inherit', shell: false });
    if (result.status !== 0) throw new Error(`FATE_INSTALL_FAILED:${action.id}:${result.status ?? 'signal'}`);
  }
  return { schemaVersion: '1.0', dryRun: false, actions, completed: selected };
}

function print(value, json) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else if (value.fates) {
    console.log(`Fates workspace: ${value.workspaceRoot}`);
    for (const fate of value.fates) console.log(`${fate.id.padEnd(12)} ${fate.repository.state.padEnd(7)} ${fate.repository.branch ?? ''} ${fate.repository.head ?? ''}`);
    console.log(`integration   ${value.integration.state.padEnd(7)} ${value.integration.branch ?? ''} ${value.integration.head ?? ''}`);
  } else {
    console.log(JSON.stringify(value, null, 2));
  }
}

export function main(argv = process.argv.slice(2)) {
  const [command = 'plan', target = ALL_TARGET] = argv;
  const json = argv.includes('--json');
  const dryRun = argv.includes('--dry-run');
  const yes = argv.includes('--yes');
  const rootIndex = argv.indexOf('--root');
  const workspaceRoot = resolveWorkspaceRoot(rootIndex >= 0 ? argv[rootIndex + 1] : undefined);
  const outputIndex = argv.indexOf('--output');
  let result;

  if (command === 'plan') result = buildPlan(workspaceRoot);
  else if (command === 'report') result = collectReport(workspaceRoot);
  else if (command === 'install') result = installTargets(workspaceRoot, target, { yes, dryRun });
  else throw new Error(`Unknown command: ${command}. Choose plan, report, or install.`);

  if (outputIndex >= 0) writeFileSync(resolve(argv[outputIndex + 1]), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  print(result, json || outputIndex >= 0);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
