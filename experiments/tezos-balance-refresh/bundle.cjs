const { createHash } = require('node:crypto');
const { copyFileSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

const [checkout, output] = process.argv.slice(2, 4).map((argument) => resolve(argument));
const profileOnly = process.argv.includes('--profile');
if (!checkout || !output) throw new Error('Usage: node bundle.cjs CHECKOUT OUTPUT');
const fromCheckout = createRequire(join(checkout, 'package.json'));
const esbuild = fromCheckout('esbuild');

const stubs = {
  '@angular/core': 'export const Injectable = () => (type) => type;',
  '@angular/router': 'export class NavigationEnd {}',
  '@taquito/taquito': 'export class TezosToolkit { addExtension() {} }',
  '@taquito/tzip12': 'export class Tzip12Module {} export const tzip12 = null;',
  '@taquito/tzip16': 'export class TezosStorageHandler {} export class IpfsHttpHandler {} export class MetadataProvider {}',
  '../../../libraries/ipfs': 'export const IPFS_GATEWAY = "";',
  '../../libraries/index': 'export const utils = {}, hd = {}, secp256k1 = {}, indexedDB = {};'
};

async function main() {
  mkdirSync(output, { recursive: true });
  const globals = join(output, 'globals.js');
  writeFileSync(
    globals,
    `
    export { Buffer } from ${JSON.stringify(fromCheckout.resolve('buffer/'))};
    export { default as process } from ${JSON.stringify(fromCheckout.resolve('process/browser'))};
  `
  );

  await esbuild.build({
    stdin: {
      contents: readFileSync(join(__dirname, 'fixture.ts'), 'utf8'),
      sourcefile: 'portfolio-fixture.ts',
      loader: 'ts',
      resolveDir: checkout
    },
    absWorkingDir: checkout,
    tsconfig: join(checkout, 'tsconfig.json'),
    outfile: join(output, 'bundle.js'),
    bundle: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: !profileOnly,
    keepNames: true,
    sourcemap: 'external',
    format: 'iife',
    platform: 'browser',
    inject: [globals],
    define: { global: 'globalThis', 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'replace-host-dependencies',
        setup(build) {
          build.onResolve({ filter: /./ }, (args) => {
            if (args.path === 'stream') return { path: fromCheckout.resolve('stream-browserify') };
            if (Object.hasOwn(stubs, args.path)) return { path: args.path, namespace: 'fixture' };
            if (args.path.endsWith('/environments/environment')) {
              return { path: join(checkout, 'src/environments/environment.prod.ts') };
            }
            if (args.path.startsWith('../../src/')) {
              return build.resolve(join(checkout, args.path.slice('../../'.length)), { resolveDir: checkout, kind: args.kind });
            }
            return undefined;
          });
          build.onLoad({ filter: /./, namespace: 'fixture' }, (args) => ({ contents: stubs[args.path] }));
        }
      }
    ]
  });

  writeFileSync(
    join(output, 'index.html'),
    '<!doctype html><meta charset="utf-8"><title>Portfolio refresh</title><link rel="icon" href="data:,"><script src="bundle.js"></script>'
  );
  const tzktSourcePath = join(checkout, 'src/app/services/indexer/tzkt/tzkt.service.ts');
  writeFileSync(
    join(output, 'build.json'),
    JSON.stringify(
      {
        commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim(),
        source_status: execFileSync('git', ['status', '--porcelain'], { cwd: checkout, encoding: 'utf8' }).trim(),
        esbuild: esbuild.version,
        profile_only: profileOnly,
        tzkt_source_sha256: createHash('sha256').update(readFileSync(tzktSourcePath)).digest('hex'),
        bundle_sha256: createHash('sha256')
          .update(readFileSync(join(output, 'bundle.js')))
          .digest('hex')
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
