# Verify program records

Run these commands from the repository root with Python 3, Git, and the authenticated GitHub CLI.

## Check the baseline and register

Check that the baseline still matches the uploaded bytes.

```sh
sha256sum docs/program/program-plan-v0.5.1.md
```

The expected SHA-256 is `8d3c20806b3dc566811d6f464c6c6bcd76fc8d38bb4aea8fd0a3d0b471c1ddf6`.

Count the register entries, ticket files, and local prerequisite links. Check ownership coverage and local file targets.

```sh
python3 - <<'PY'
from pathlib import Path
import re

root = Path('docs/program')
register = (root / 'owners.md').read_text()
for prefix, expected in [('Q', 33), ('R', 27)]:
	rows = re.findall(r'^\| (' + prefix + r'-\d+) \|', register, re.M)
	assert sorted(rows) == [f'{prefix}-{n:02}' for n in range(1, expected + 1)]
	assert all('dvkam' in row for row in register.splitlines()
		if re.match(r'\| ' + prefix + r'-\d+ \|', row))
	print(prefix, len(rows))
tickets = sorted((root / 'tickets').glob('p[0-3]-*.md'))
print('Tickets', len(tickets))
assert len(tickets) == 32
edges = 0
for ticket in tickets:
	section = ticket.read_text().split('## Blocked by')[1].split('## Acceptance criteria')[0]
	edges += len(re.findall(r'\]\(p\d-\d+\.md\)', section))
print('Prerequisite links', edges)
assert edges == 64
for document in root.rglob('*.md'):
	for target in re.findall(r'\]\(([^)]+)\)', document.read_text()):
		if '://' not in target and not target.startswith('#'):
			assert (document.parent / target.split('#')[0]).exists(), (document, target)
print('Local file links resolve')
PY
```

These checks do not validate external URL contents or prove the plan's security claims. The baseline retains its original CRLF line endings. Check whitespace with CRLF allowed.

```sh
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check f0fa7222a039012797383fe4a68594e10b92a888...HEAD
```

## Inspect current GitHub dependencies

The original publication created 32 issues and 64 native blocking relationships. Current state can change independently of the historical ticket files. Retrieve the live issue records and blockers with these read-only commands.

```sh
gh issue list --repo dvkam/kukai --state all --limit 100 --json number,title,state,author
for number in $(seq 1 32); do
	gh api --paginate "repos/dvkam/kukai/issues/$number/dependencies/blocked_by" --jq '.[] | [.number, .title] | @tsv'
done
```
