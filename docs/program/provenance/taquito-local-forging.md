# Taquito local forging bundle in Kukai Swift core

The JavaScript at `kukai-core-swift@a761e3aee58fdfa20b4f3e71adcd20861e284fad` matches `taquito_local_forging.js` in Taquito's `23.0.1` `taquito-local-forging-vanilla.zip` byte for byte. The release tag points to `ecadlabs/taquito@d67244a8188ee3a62390f32b75ba1acf599a782f`. [Kukai Swift commit](https://github.com/kukai-wallet/kukai-core-swift/commit/a761e3aee58fdfa20b4f3e71adcd20861e284fad) · [Taquito release](https://github.com/ecadlabs/taquito/releases/tag/23.0.1) · [Taquito release commit](https://github.com/ecadlabs/taquito/commit/d67244a8188ee3a62390f32b75ba1acf599a782f)

| Artifact | SHA-256 |
| --- | --- |
| `taquito-local-forging-vanilla.zip` | `c8d8899e52329f04102e7e8211b17067f0c04a64cc6243074ed008753adbff25` |
| `taquito_local_forging.js` | `87ed6c5e9140d73b4e36a7a784f42a8d6eeab8d8a846f0e4021613a984d5af75` |
| `taquito_local_forging.js.map` | `a8fe4202395e2163499a999d5211f615aa8d819889f2c54a5ba6d5ef8fa07e7a` |
| Reproduced `taquito_local_forging.js.LICENSE.txt` | `15e28317a03419f24d5a825731bdfb29c634f6d7e57ae00fb0159c96607619f7` |
| `fast-text-encoding-1.0.6.tgz` | `64e559ea9201d1049b9ec3f9b8fa92f5a3575cd75b108287381f5a6a69ca16e6` |

The bundle header points to `taquito_local_forging.js.LICENSE.txt`. The release ZIP contains the bundle and source map. The pinned Kukai tree and the release ZIP both omit that sidecar. The Taquito Webpack workflow lists only those two files in the uploaded artifact. [Webpack workflow](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/.github/workflows/bundle_webpack.yml)

The release source map contains 99 source paths and their embedded contents. It includes Taquito and Webpack runtime code and 71 entries under `node_modules`. Those dependencies cover 26 package names, with two versions each of `buffer` and `@noble/hashes`. The map's generated `src/version.ts` matches the tag's source file, which declares version `23.0.1` and stamps the tag commit's parent. [Version source](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/packages/taquito-local-forging/src/version.ts) · [Tagged package lock](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/package-lock.json)

The map's `src/taquito-local-forging.ts` adds a `fast-text-encoding` import and `TextEncoder` and `TextDecoder` fallbacks absent from the tagged entry point. The map's polyfill bytes match `package/text.min.js` in `fast-text-encoding@1.0.6`. That package is absent from the tagged lockfile. Its release archive includes `package/LICENSE`. [Tagged entry point](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/packages/taquito-local-forging/src/taquito-local-forging.ts) · [Tagged package lock](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/package-lock.json) · [Polyfill registry metadata](https://registry.npmjs.org/fast-text-encoding/1.0.6)

Rebuilding with the tagged lockfile, the source map's entry point and the matching polyfill produced the exact JavaScript and source map. Webpack also emitted the [464-byte license sidecar](notices/taquito_local_forging.js.LICENSE.txt). It contains five extracted comments for `buffer`, `ieee754`, `@noble/curves`, `@noble/hashes` and `typedarray-to-buffer`. The full Taquito and polyfill license texts are available upstream and are absent from these extracted comments. The bundle remains excluded from reuse pending review of the complete bundled dependency notices. [Taquito LICENSE](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/LICENSE) · [Taquito NOTICE](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/NOTICE) · [Polyfill package with LICENSE](https://registry.npmjs.org/fast-text-encoding/-/fast-text-encoding-1.0.6.tgz)

## Check the release match

Run with `curl` and Python 3. The check reads the JavaScript and source map as data.

```sh
(
  set -eu
  work_dir=$(mktemp -d)
  bundle=https://raw.githubusercontent.com/kukai-wallet/kukai-core-swift/a761e3aee58fdfa20b4f3e71adcd20861e284fad/Sources/KukaiCoreSwift/Services/taquito_local_forging.js
  release=https://github.com/ecadlabs/taquito/releases/download/23.0.1/taquito-local-forging-vanilla.zip
  tag=https://raw.githubusercontent.com/ecadlabs/taquito/d67244a8188ee3a62390f32b75ba1acf599a782f
  curl -fLsS "$bundle" -o "$work_dir/kukai.js"
  curl -fLsS "$release" -o "$work_dir/release.zip"
  curl -fLsS "$tag/packages/taquito-local-forging/src/version.ts" -o "$work_dir/version.ts"
  curl -fLsS "$tag/packages/taquito-local-forging/src/taquito-local-forging.ts" -o "$work_dir/entry.ts"
  curl -fLsS https://registry.npmjs.org/fast-text-encoding/-/fast-text-encoding-1.0.6.tgz -o "$work_dir/polyfill.tgz"
  python3 - "$work_dir" <<'PY'
from hashlib import sha256
import json
from pathlib import Path
import sys
from tarfile import open as open_tar
from zipfile import ZipFile

directory = Path(sys.argv[1])
archive = directory / 'release.zip'
assert sha256(archive.read_bytes()).hexdigest() == 'c8d8899e52329f04102e7e8211b17067f0c04a64cc6243074ed008753adbff25'
with ZipFile(archive) as release:
    assert sorted(release.namelist()) == ['taquito_local_forging.js', 'taquito_local_forging.js.map']
    js = release.read('taquito_local_forging.js')
    source_map = release.read('taquito_local_forging.js.map')
assert js == (directory / 'kukai.js').read_bytes()
assert sha256(js).hexdigest() == '87ed6c5e9140d73b4e36a7a784f42a8d6eeab8d8a846f0e4021613a984d5af75'
assert b'taquito_local_forging.js.LICENSE.txt' in js.splitlines()[0]
assert sha256(source_map).hexdigest() == 'a8fe4202395e2163499a999d5211f615aa8d819889f2c54a5ba6d5ef8fa07e7a'
entries = json.loads(source_map)
paths = entries['sources']
contents = entries['sourcesContent']
assert len(paths) == len(contents) == 99 and all(contents)
version = paths.index('webpack://@taquito/local-forging/./src/version.ts')
assert contents[version].encode() == (directory / 'version.ts').read_bytes()
entry = paths.index('webpack://@taquito/local-forging/./src/taquito-local-forging.ts')
tagged_entry = (directory / 'entry.ts').read_text()
assert "import 'fast-text-encoding';" not in tagged_entry
assert "import 'fast-text-encoding';" in contents[entry]
polyfill_archive = directory / 'polyfill.tgz'
assert sha256(polyfill_archive.read_bytes()).hexdigest() == '64e559ea9201d1049b9ec3f9b8fa92f5a3575cd75b108287381f5a6a69ca16e6'
polyfill = paths.index('webpack://@taquito/local-forging/../../node_modules/fast-text-encoding/text.min.js')
with open_tar(polyfill_archive) as package:
    assert package.extractfile('package/text.min.js').read() == contents[polyfill].encode()
(directory / 'release.js').write_bytes(js)
(directory / 'release.js.map').write_bytes(source_map)
(directory / 'release-entry.ts').write_bytes(contents[entry].encode())
print('Kukai matches the Taquito 23.0.1 release bundle. The release archive omits the license sidecar.')
print(f'Evidence files are in {directory}')
PY
)
```

## Reproduce the license sidecar

Run from the Kukai repository root with Node.js 18.20.8 and npm 10.8.2. Use the temporary evidence directory printed by the first check. The JavaScript and source map comparisons tie the extracted comments to an exact replay of both released files. [Tagged Webpack configuration](https://github.com/ecadlabs/taquito/blob/d67244a8188ee3a62390f32b75ba1acf599a782f/packages/taquito-local-forging/webpack.config.js)

```sh
(
  set -eu
  evidence_dir=/tmp/replace-with-evidence-directory
  sidecar="$PWD/docs/program/provenance/notices/taquito_local_forging.js.LICENSE.txt"
  mkdir "$evidence_dir/source"
  curl -fLsS https://codeload.github.com/ecadlabs/taquito/tar.gz/d67244a8188ee3a62390f32b75ba1acf599a782f |
    tar -xz --strip-components=1 -C "$evidence_dir/source"
  cd "$evidence_dir/source"
  npm ci --ignore-scripts --no-audit --no-fund
  for workspace in core utils http-utils rpc; do
    npm -w "packages/taquito-$workspace" run build
  done
  cp "$evidence_dir/release-entry.ts" packages/taquito-local-forging/src/taquito-local-forging.ts
  mkdir node_modules/fast-text-encoding
  tar -xzf "$evidence_dir/polyfill.tgz" --strip-components=1 -C node_modules/fast-text-encoding
  npm -w packages/taquito-local-forging run build-webpack
  dist=packages/taquito-local-forging/dist
  cmp "$dist/taquito_local_forging.js" "$evidence_dir/release.js"
  cmp "$dist/taquito_local_forging.js.map" "$evidence_dir/release.js.map"
  cmp "$dist/taquito_local_forging.js.LICENSE.txt" "$sidecar"
)
```
