import { readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const cocosRoot = path.join(root, 'cocos');
const creatorRoot = process.env.COCOS_CREATOR_ROOT ?? 'D:\\cocos-creator\\Creator\\3.8.8';
const compiler = path.join(
  creatorRoot,
  'resources',
  'app.asar.unpacked',
  'node_modules',
  'typescript',
  'lib',
  'tsc.js',
);
const cocosDeclarations = path.join(
  creatorRoot,
  'resources',
  'resources',
  '3d',
  'engine',
  'bin',
  '.declarations',
  'cc.d.ts',
);

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTypeScriptFiles(absolute));
    } else if (entry.name.endsWith('.ts')) {
      files.push(absolute);
    }
  }
  return files;
}

await rm(path.join(cocosRoot, '.test-build'), { recursive: true, force: true });

const compile = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.core.json'], {
  cwd: cocosRoot,
  encoding: 'utf8',
});

if (compile.stdout) process.stdout.write(compile.stdout);
if (compile.stderr) process.stderr.write(compile.stderr);
if (compile.status !== 0) process.exit(compile.status ?? 1);

const runtimeFiles = await collectTypeScriptFiles(path.join(cocosRoot, 'assets'));
const runtimeCheck = spawnSync(process.execPath, [
  compiler,
  '--noEmit',
  '--target', 'ES2020',
  '--module', 'ESNext',
  '--moduleResolution', 'Node',
  '--experimentalDecorators',
  '--useDefineForClassFields', 'false',
  '--skipLibCheck',
  cocosDeclarations,
  ...runtimeFiles,
], {
  cwd: cocosRoot,
  encoding: 'utf8',
});

if (runtimeCheck.stdout) process.stdout.write(runtimeCheck.stdout);
if (runtimeCheck.stderr) process.stderr.write(runtimeCheck.stderr);
if (runtimeCheck.status !== 0) process.exit(runtimeCheck.status ?? 1);

const test = spawnSync(process.execPath, ['.test-build/tests/combat-core.test.js'], {
  cwd: cocosRoot,
  encoding: 'utf8',
});

if (test.stdout) process.stdout.write(test.stdout);
if (test.stderr) process.stderr.write(test.stderr);
process.exit(test.status ?? 1);
