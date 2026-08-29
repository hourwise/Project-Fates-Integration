import { createHash } from 'node:crypto';
import { copyFile, chmod, mkdir, mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultAgentSource = resolve(homedir(), 'fates-005a', 'repos', 'moirae-code', 'packages', 'sandbox-adapter', 'src', 'guest-fates-vsock-proposal-init.c');

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : fallback;
}

function fail(message) {
  throw new Error(message);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function writeExclusive(path, data) {
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function main() {
  if (process.platform !== 'linux' || process.arch !== 'x64') fail('FATES-005A guest initrd build requires Linux x86_64');
  const source = resolve(arg('--agent-source', defaultAgentSource));
  const output = resolve(arg('--output', join(integrationRoot, 'artifacts', 'fates-005a-guest-initrd.cpio')));
  const compiler = arg('--compiler', 'cc');
  if (!isAbsolute(source) || !isAbsolute(output)) fail('agent source and initrd output must be absolute paths');

  const stage = await mkdtemp(join(tmpdir(), 'fates-005a-initrd-'));
  try {
    const binary = join(stage, 'fates-vsock-proposal-init');
    const compiled = spawnSync(compiler, ['-std=c11', '-O2', '-static', '-s', '-Wall', '-Wextra', '-o', binary, source], {
      cwd: integrationRoot,
      encoding: 'utf8',
      shell: false,
    });
    if (compiled.error) fail(`guest init compile failed: ${compiled.error.message}`);
    if (compiled.status !== 0) fail(`guest init compile failed: ${(compiled.stderr ?? '').trim() || `exit ${compiled.status}`}`);
    await chmod(binary, 0o755);

    const root = join(stage, 'root');
    await mkdir(root, { recursive: true, mode: 0o755 });
    await copyFile(binary, join(root, 'init'));
    const archiveArgs = ['-o', '-H', 'newc'];
    let cpioCommand = 'cpio -o -H newc';
    let archived = spawnSync('cpio', archiveArgs, {
        cwd: root,
        input: 'init\n',
        encoding: null,
        shell: false,
      });
    if (archived.error?.code === 'ENOENT') {
      archived = spawnSync('busybox', ['cpio', ...archiveArgs], {
        cwd: root,
        input: 'init\n',
        encoding: null,
        shell: false,
      });
      cpioCommand = 'busybox cpio -o -H newc';
    }
    if (archived.error) fail(`cpio initrd build failed: ${archived.error.message}`);
    if (archived.status !== 0) fail(`cpio initrd build failed: ${(archived.stderr?.toString('utf8') ?? '').trim() || `exit ${archived.status}`}`);
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    await writeExclusive(output, archived.stdout);
    const [binaryBytes, initrdBytes] = await Promise.all([readFile(binary), readFile(output)]);
    process.stdout.write(`${JSON.stringify({
      result: 'built',
      agentSource: source,
      agentSha256: sha256(binaryBytes),
      initrdPath: output,
      initrdSha256: sha256(initrdBytes),
      initrdFormat: 'newc-cpio-uncompressed',
      compiler,
      cpio: cpioCommand,
    }, null, 2)}\n`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`FATES-005A INITRD BUILD: FAIL\n${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
