const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { mkdirSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');

const buildInputs = ['src', 'angular.json', 'package.json', 'package-lock.json', 'tsconfig.json', 'patch.js', '.browserslistrc'];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function snapshotInputs(root) {
  const commit = git('rev-parse', 'HEAD');
  if (git('status', '--porcelain', '--untracked-files=all', '--', ...buildInputs)) {
    throw new Error('Build inputs have working-tree changes. Build from a checkout of the revision to measure.');
  }
  const files = git('ls-files', '-z', '--', ...buildInputs).split('\0').filter(Boolean);
  const inputs = createHash('sha256');
  for (const file of files) {
    inputs.update(`${file}\0${sha256(resolve(root, file))}\n`);
  }
  return {
    commit,
    input_sha256: inputs.digest('hex'),
    angular_json_sha256: sha256(resolve(root, 'angular.json')),
    lockfile_sha256: sha256(resolve(root, 'package-lock.json')),
  };
}

async function build(outputPath) {
  const root = process.cwd();
  const workspaceRequire = createRequire(resolve(root, 'package.json'));
  const { Architect } = workspaceRequire('@angular-devkit/architect');
  const { WorkspaceNodeModulesArchitectHost } = workspaceRequire('@angular-devkit/architect/node');
  const { json, workspaces } = workspaceRequire('@angular-devkit/core');
  const { NodeJsSyncHost } = workspaceRequire('@angular-devkit/core/node');
  const host = workspaces.createWorkspaceHost(new NodeJsSyncHost());
  const { workspace } = await workspaces.readWorkspace(root, host);
  const registry = new json.schema.CoreSchemaRegistry();
  registry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
  const architect = new Architect(new WorkspaceNodeModulesArchitectHost(workspace, root), registry);
  const configuration = 'production';
  const optimization = { scripts: true, styles: true, fonts: false };
  const before = snapshotInputs(root);
  const metadata = {
    ...before,
    configuration,
    optimization,
    node: process.version,
    angular_cli: workspaceRequire('@angular/cli/package.json').version,
    angular_builder: workspaceRequire('@angular-devkit/build-angular/package.json').version,
  };

  mkdirSync(outputPath);
  const run = await architect.scheduleTarget({ project: 'wallet', target: 'build', configuration }, { outputPath, optimization });
  try {
    const result = await run.result;
    if (!result.success) {
      throw new Error(result.error || 'Wallet build failed');
    }
    if (JSON.stringify(snapshotInputs(root)) !== JSON.stringify(before)) {
      throw new Error('The build revision or its inputs changed while Angular was building.');
    }
    const emitted = readdirSync(outputPath).filter((name) => /(?:\.js|\.css|^index\.html)$/.test(name));
    metadata.bundle_sha256 = Object.fromEntries(emitted.map((name) => [name, sha256(resolve(outputPath, name))]));
    writeFileSync(resolve(outputPath, 'benchmark-build.json'), JSON.stringify(metadata, null, 2) + '\n');
  } finally {
    await run.stop();
  }
}

if (process.argv.length !== 3) {
  console.error('Usage: node build.cjs OUTPUT_DIRECTORY');
  process.exitCode = 2;
} else {
  build(resolve(process.argv[2])).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
