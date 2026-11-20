# Verify the provenance inventory

Run these read-only checks from the repository root with Python 3, Git, and the authenticated GitHub CLI. The remote check needs access to `api.github.com`.

## Check source trees and notices

Compare every recorded file with its pinned source tree. Verify the retained license text against the pinned source bytes.

```sh
python3 - <<'PY'
from pathlib import Path
import base64
import csv
import hashlib
import json
import subprocess

root = Path('docs/program/provenance')
for source in json.loads((root / 'sources.json').read_text())['sources']:
	repo, revision = source['repo'], source['sha']
	rows = list(csv.DictReader((root / source['tree_manifest']).open()))
	actual = {(r['path'], r['type'], r['git_mode'], r['git_object_sha']) for r in rows}
	if repo == 'kukai-wallet/kukai':
		expected = set()
		for entry in subprocess.check_output(['git', 'ls-tree', '-rz', revision]).decode().split('\0'):
			if entry:
				metadata, path = entry.split('\t')
				mode, kind, sha = metadata.split()
				expected.add((path, kind, mode, sha))
	else:
		tree = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/git/trees/{revision}?recursive=1']))
		assert not tree['truncated']
		expected = {(r['path'], r['type'], r['mode'], r['sha']) for r in tree['tree'] if r['type'] != 'tree'}
	assert actual == expected and len(rows) == len(actual) == source['file_count'], repo
	assert all(r['file_license'] == 'NOASSERTION' and r['reuse_status'] == 'not-approved' for r in rows)
	if source['root_license']:
		license_path = source['root_license']
		if repo == 'kukai-wallet/kukai':
			original = subprocess.check_output(['git', 'show', f'{revision}:{license_path}'])
		else:
			response = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/contents/{license_path}?ref={revision}']))
			original = base64.b64decode(response['content'])
		retained = (root / 'notices' / (repo.split('/')[1] + '-LICENSE.txt')).read_bytes()
		assert retained == original
		assert hashlib.sha256(retained).hexdigest() == source['license_sha256']
	print(repo, len(rows), 'files; pinned tree and available notice match')
PY
```

These checks establish inventory integrity. They do not prove authorship, notice completeness, license compatibility, or security.

## Recheck the fork state

Retrieve current visibility and parent information. The research snapshot reported a public fork with `production` as the default branch.

```sh
gh repo view dvkam/kukai --json visibility,isFork,parent,defaultBranchRef
```
