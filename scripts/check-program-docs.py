"""Validate the immutable baseline, ownership coverage, and local document links."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROGRAM = ROOT / 'docs/program'



def check_obligation_snapshot(baseline):
  directory = PROGRAM / 'verification'
  freeze = json.loads((directory / 'freeze.json').read_text())
  path = (directory / freeze['file']).resolve()
  if not path.is_relative_to(directory.resolve()):
    raise ValueError('Obligation snapshot must remain inside its record directory')
  raw = path.read_bytes()
  if hashlib.sha256(raw).hexdigest() != freeze['sha256']:
    raise ValueError('Frozen obligation snapshot digest changed')
  snapshot = json.loads(raw)
  digest = hashlib.sha256(baseline.read_bytes()).hexdigest()
  if snapshot['source'] != baseline.name or snapshot['source_sha256'] != digest or freeze['source_sha256'] != digest:
    raise ValueError('Obligation snapshot source differs from the preserved baseline')
  source = baseline.read_text()
  rows = []
  for line in source.splitlines():
    if re.match(r'^\| (?:[1-9]|1[0-7]) \|', line):
      cells = [cell.strip() for cell in line.split('|')[1:-1]]
      if len(cells) == 5:
        rows.append(dict(zip(['id', 'property', 'paths', 'assumptions', 'residual'], cells)))
  if snapshot['obligations'] != rows or [row['id'] for row in rows] != [str(number) for number in range(1, 18)]:
    raise ValueError('Obligation snapshot differs from the complete source statements')
  clause = re.search(r'That covers obligations (.*?), each under its stated assumptions', source)
  if clause is None or snapshot['explicit_nonwaivable'] != re.findall(r'\b\d+(?:\([a-z]\))?', clause.group(1)):
    raise ValueError('Explicit non-waivable obligation set changed')


def check_build_evidence(evidence, sources):
  packages = json.loads(sources.read_text())['packages']
  expected_builds = {(package['name'], package['version'], target)
                     for package in packages for target in ['native', 'wasm32-unknown-unknown']}
  results = json.loads((evidence / 'results.json').read_text())['checks']
  actual_builds = [(result['package'], result['version'], result['target']) for result in results]
  if not expected_builds or set(actual_builds) != expected_builds or len(actual_builds) != len(expected_builds):
    raise ValueError('Retained build results must cover the complete unique pinned package/version/target matrix')
  for result in results:
    log = (evidence / result['log']).resolve()
    if not log.is_relative_to(evidence.resolve()):
      raise ValueError('Retained build log must be inside its evidence directory')
    if result['exit_code'] != 0 or not log.exists() or 'Finished' not in log.read_text():
      raise ValueError(f'Invalid retained build result: {result["package"]} {result["target"]}')


def markdown_sources(root: Path):
  for directory, subdirectories, files in root.walk():
    # Experiments can install their own dependencies beside repository documentation.
    if 'node_modules' in subdirectories:
      subdirectories.remove('node_modules')
    for filename in files:
      if filename.endswith('.md'):
        yield directory / filename


def main():
  baseline = PROGRAM / 'program-plan-v0.5.1.md'
  expected = '8d3c20806b3dc566811d6f464c6c6bcd76fc8d38bb4aea8fd0a3d0b471c1ddf6'
  if hashlib.sha256(baseline.read_bytes()).hexdigest() != expected:
    raise ValueError('The preserved v0.5.1 baseline changed')
  register = (PROGRAM / 'owners.md').read_text()
  for prefix, count in [('Q', 33), ('R', 27)]:
    rows = re.findall(r'^\| (' + prefix + r'-\d+) \|', register, re.MULTILINE)
    if sorted(rows) != [f'{prefix}-{number:02}' for number in range(1, count + 1)]:
      raise ValueError(f'Missing or duplicated {prefix} ownership rows')
    for row in register.splitlines():
      if re.match(r'\| ' + prefix + r'-\d+ \|', row) and '| dvkam |' not in row:
        raise ValueError(f'Unrecorded owner change: {row}')
  for document in (*markdown_sources(PROGRAM), *markdown_sources(ROOT / 'experiments')):
    for target in re.findall(r'\]\(([^)]+)\)', document.read_text()):
      if '://' not in target and not target.startswith('#'):
        path = document.parent / target.split('#')[0]
        if not path.exists():
          raise ValueError(f'Broken link in {document.relative_to(ROOT)}: {target}')
  check_build_evidence(PROGRAM / 'capabilities/build-evidence', ROOT / 'experiments/library-build-check/sources.json')
  check_obligation_snapshot(baseline)
  print('Program baseline, ownership, local links, build logs, and obligation snapshot pass')


if __name__ == '__main__':
  main()
