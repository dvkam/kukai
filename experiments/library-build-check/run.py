#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0 OR MIT
"""Check pinned upstream libraries without changing the wallet application."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request


def unpack_package(package, output):
  with urllib.request.urlopen(package['archive_url'], timeout=30) as response:
    archive = response.read()
  if hashlib.sha256(archive).hexdigest() != package['checksum']:
    raise ValueError(f"Archive checksum mismatch: {package['name']}")
  prefix = f"{package['name']}-{package['version']}"
  with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as source:
    for member in source.getmembers():
      if member.isdir():
        continue
      path = Path(member.name)
      if not member.isfile() or path.is_absolute() or '..' in path.parts:
        raise ValueError(f'Unexpected archive entry: {member.name}')
      relative = path.relative_to(prefix)
      destination = output / prefix / relative
      destination.parent.mkdir(parents=True, exist_ok=True)
      destination.write_bytes(source.extractfile(member).read())
  return output / prefix


def main():
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument('--output', type=Path, help='New directory for sources, logs, and results')
  args = parser.parse_args()
  output = args.output
  if output is None:
    output = Path(tempfile.mkdtemp(prefix='kukai-library-check-'))
  else:
    output.mkdir(parents=True, exist_ok=False)
  output = output.resolve()
  here = Path(__file__).resolve().parent
  manifest = json.loads((here / 'sources.json').read_text())
  toolchain = manifest['rust_toolchain']
  results = {'platform': platform.platform(), 'machine': platform.machine(), 'checks': []}
  results['rustc'] = subprocess.check_output(['rustc', f'+{toolchain}', '-vV'], text=True)
  results['cargo'] = subprocess.check_output(['cargo', f'+{toolchain}', '-V'], text=True).strip()
  for package in manifest['packages']:
    source = unpack_package(package, output)
    shutil.copyfile(here / 'locks' / (package['name'] + '.lock'), source / 'Cargo.lock')
    for target in ['native', 'wasm32-unknown-unknown']:
      command = ['cargo', f'+{toolchain}', 'check', '--locked', '--manifest-path', str(source / 'Cargo.toml'),
                 '--target-dir', str(output / 'target' / package['name'])]
      if package['features']:
        command += ['--features', ','.join(package['features'])]
      if target != 'native':
        command += ['--target', target]
      log = output / f"{package['name']}-{target}.log"
      with log.open('w') as stream:
        completed = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT)
      result = {'package': package['name'], 'version': package['version'], 'target': target,
                'command': command, 'exit_code': completed.returncode, 'log': log.name}
      results['checks'].append(result)
      (output / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
      print(package['name'], target, 'PASS' if completed.returncode == 0 else 'FAIL', flush=True)
  print('Evidence:', output)
  return int(any(check['exit_code'] != 0 for check in results['checks']))


if __name__ == '__main__':
  raise SystemExit(main())
