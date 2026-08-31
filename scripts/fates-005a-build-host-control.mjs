import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(integrationRoot, 'scripts', 'fates-005a-host-control.c');

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : fallback;
}

async function main() {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('FATES-005A host-control build requires Linux x86_64');
  const output = resolve(arg('--output', '/home/fatesadmin/fates-005a/host-control-build/fates-005a-host-control'));
  const compiler = arg('--compiler', 'cc');
  if (!isAbsolute(output)) throw new Error('--output must be absolute');
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  const compileArguments = ['-std=c11', '-O2', '-static', '-s', '-Wall', '-Wextra', '-Werror', '-o', output, source];
  const built = spawnSync(compiler, compileArguments, { cwd: integrationRoot, encoding: 'utf8', shell: false });
  if (built.error) throw new Error(`host-control compile failed: ${built.error.message}`);
  if (built.status !== 0) throw new Error(`host-control compile failed: ${(built.stderr ?? '').trim() || `exit ${built.status}`}`);
  await chmod(output, 0o755);
  const sourceBytes = await readFile(source);
  const binaryBytes = await readFile(output);
  const compilerVersionResult = spawnSync(compiler, ['--version'], { cwd: integrationRoot, encoding: 'utf8', shell: false });
  const compilerVersion = (compilerVersionResult.stdout ?? '').split(/\r?\n/).find(Boolean) ?? `unavailable (exit ${compilerVersionResult.status ?? 1})`;
  process.stdout.write(`${JSON.stringify({
    result: 'built',
    helperVersion: 'fates-005a-host-control-v1',
    source,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    output,
    binarySha256: createHash('sha256').update(binaryBytes).digest('hex'),
    binaryBytes: (await stat(output)).size,
    compiler,
    compilerVersion,
    compileCommand: [compiler, ...compileArguments],
    privilegedInstall: false,
  }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`FATES-005A HOST-CONTROL BUILD: FAIL\n${error.stack ?? error.message}\n`); process.exitCode = 1; });
