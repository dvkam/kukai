# Verify the initial obligation snapshot

Run this command from the repository root with Python 3.

```sh
python3 scripts/check-program-docs.py
```

The CI record checker verifies the snapshot's frozen bytes, its baseline checksum, all 17 exact source statements and path/assumption/residual expressions, and the baseline's explicit non-waivable set. It also checks the existing program records. A mismatch exits nonzero.

The expected output is `Program baseline, ownership, local links, build logs, and obligation snapshot pass`. This checks record integrity only. It performs no model check or proof.
