# Verify the initial obligation snapshot

Run this check from the repository root with Python 3. It verifies the frozen bytes, exact source statements, and explicit non-waivable set. It performs no model check or proof.

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib
import json
import re

root = Path('docs/program')
freeze = json.loads((root / 'verification/freeze.json').read_text())
raw = (root / 'verification' / freeze['file']).read_bytes()
assert hashlib.sha256(raw).hexdigest() == freeze['sha256']
snapshot = json.loads(raw)
baseline = (root / snapshot['source']).read_bytes()
assert hashlib.sha256(baseline).hexdigest() == snapshot['source_sha256'] == freeze['source_sha256']
rows = []
for line in baseline.decode().splitlines():
	if re.match(r'^\| (?:[1-9]|1[0-7]) \|', line):
		cells = [cell.strip() for cell in line.split('|')[1:-1]]
		if len(cells) == 5:
			rows.append(dict(zip(['id', 'property', 'paths', 'assumptions', 'residual'], cells)))
assert snapshot['obligations'] == rows
assert [row['id'] for row in rows] == [str(number) for number in range(1, 18)]
assert snapshot['explicit_nonwaivable'] == ['1', '2', '4', '5', '6(b)', '6(c)', '7', '8', '9', '12(a)', '12(b)', '14', '15(a)', '15(b)', '17']
print('Snapshot matches all 17 source obligations and the explicit non-waivable set; no proof performed')
PY
```
