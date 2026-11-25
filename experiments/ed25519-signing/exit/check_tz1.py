"""Verify a retained-quorum synthetic native Tezos transfer with the pinned Taquito release."""

import argparse
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

from check import forbid_host_root, require_network_namespace

SHARE_FILES = ("device", "recovery", "public")
# Bound stalled fixture processes independently of the measured signing latency.
PROCESS_TIMEOUT_SECONDS = 60
SIGNER_INPUTS = (*SHARE_FILES, "account")
VERIFIER = Path(__file__).resolve().parents[3] / "tests" / "check-tezos-exit.cjs"


def replay(fixture: Path, signer: Path, node: Path) -> dict[str, object]:
    with tempfile.TemporaryDirectory() as setup:
        root = Path(setup) / "fixture"
        subprocess.run([fixture, "prepare", root], cwd=setup, env={}, check=True, timeout=PROCESS_TIMEOUT_SECONDS)
        fresh = root / "fresh"
        if {path.name for path in fresh.iterdir()} != set(SHARE_FILES):
            raise AssertionError("unexpected refreshed fixture files")
        retained = {name: (fresh / name).read_bytes() for name in SHARE_FILES}
        retained["account"] = (root / "account").read_bytes()
        stale_recovery = (root / "old" / "recovery").read_bytes()
    if root.exists():
        raise AssertionError("setup files persisted into signing")

    with tempfile.TemporaryDirectory() as run:
        folder = Path(run)
        for name, data in retained.items():
            (folder / name).write_bytes(data)
        signed = subprocess.run([signer, *SIGNER_INPUTS], cwd=folder, env={}, capture_output=True, check=True, timeout=PROCESS_TIMEOUT_SECONDS)
        if signed.stderr:
            raise AssertionError("signer emitted unexpected diagnostics")
        verified = subprocess.run([node, VERIFIER, "account"], cwd=folder, env={}, input=signed.stdout,
                                  stdout=subprocess.PIPE, check=True, timeout=PROCESS_TIMEOUT_SECONDS)

    refusals = {
        "extra_operation_input": (retained, ("raw-operation",), b"expected device, recovery"),
        "stale_recovery": (retained | {"recovery": stale_recovery}, (), b"user package does not match"),
        "missing_recovery": ({name: data for name, data in retained.items() if name != "recovery"},
                             (), b"No such file or directory"),
        "wrong_account": (retained | {"account": bytes([retained["account"][0] ^ 1]) + retained["account"][1:]},
                          (), b"public package differs from pinned account"),
    }
    for case, (files, extra, expected_error) in refusals.items():
        with tempfile.TemporaryDirectory() as run:
            for name, data in files.items():
                (Path(run) / name).write_bytes(data)
            result = subprocess.run([signer, *SIGNER_INPUTS, *extra], cwd=run, env={}, capture_output=True,
                                    check=False, timeout=PROCESS_TIMEOUT_SECONDS)
            if result.returncode != 1 or result.stdout or expected_error not in result.stderr:
                raise AssertionError(f"{case}: expected refusal without signature output")

    return {"transfer": json.loads(verified.stdout), "signer_refused": list(refusals)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binaries", type=Path)
    parser.add_argument("node", type=Path)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--parent-net-inode", type=int)
    modes.add_argument("--unisolated-smoke", action="store_true")
    args = parser.parse_args()
    forbid_host_root()
    interfaces = require_network_namespace(args.parent_net_inode) if args.parent_net_inode is not None else None
    fixture = (args.binaries / "exit_fixture").resolve(strict=True)
    signer = (args.binaries / "exit_tz1_transfer").resolve(strict=True)
    os.umask(0o077)
    print(json.dumps({"mode": "private_network_namespace" if interfaces else "unisolated_smoke",
                      "interfaces": interfaces, "external_ipv4_route": "unreachable" if interfaces else None,
                      "signer_sha256": hashlib.sha256(signer.read_bytes()).hexdigest(),
                      **replay(fixture, signer, args.node.resolve(strict=True))}, indent=2))


if __name__ == "__main__":
    main()
