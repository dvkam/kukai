"""Validate the immutable baseline, ownership coverage, and local document links."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROGRAM = ROOT / 'docs/program'


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
  documents = list(PROGRAM.rglob('*.md')) + list((ROOT / 'experiments').rglob('*.md'))
  for document in documents:
    for target in re.findall(r'\]\(([^)]+)\)', document.read_text()):
      if '://' not in target and not target.startswith('#'):
        path = document.parent / target.split('#')[0]
        if not path.exists():
          raise ValueError(f'Broken link in {document.relative_to(ROOT)}: {target}')
  evidence = PROGRAM / 'capabilities/build-evidence'
  for result in json.loads((evidence / 'results.json').read_text())['checks']:
    log = evidence / result['log']
    if result['exit_code'] != 0 or not log.exists() or 'Finished' not in log.read_text():
      raise ValueError(f'Invalid retained build result: {result["package"]} {result["target"]}')
  print('Program baseline, ownership, local file links, and retained build logs pass')


if __name__ == '__main__':
  main()
