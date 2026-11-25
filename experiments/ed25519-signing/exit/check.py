"""Run the test-key exit signer in a new Linux network namespace with only loopback."""

import argparse
import errno
import hashlib
import json
import os
import shutil
import socket
import subprocess
import tempfile
from pathlib import Path


def require_network_namespace(parent_net_inode: int) -> list[str]:
    interfaces = sorted(name for _, name in socket.if_nameindex())
    if os.stat("/proc/self/ns/net").st_ino == parent_net_inode or interfaces != ["lo"]:
        raise RuntimeError("expected a private network namespace with only loopback")
    # UDP connect tests route selection without sending a packet.
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        if probe.connect_ex(("192.0.2.1", 9)) != errno.ENETUNREACH:
            raise RuntimeError("expected no route to an external address")
    return interfaces


def forbid_host_root() -> None:
    if os.geteuid() == 0 and Path("/proc/self/uid_map").read_text().split()[1] == "0":
        raise RuntimeError("refusing to run fixture tools as host root")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binaries", type=Path)
    parser.add_argument("parent_net_inode", type=int)
    args = parser.parse_args()
    interfaces = require_network_namespace(args.parent_net_inode)
    forbid_host_root()
    signer = (args.binaries / "exit_sign").resolve(strict=True)
    fixture = (args.binaries / "exit_fixture").resolve(strict=True)
    outcomes: dict[str, str] = {}
    os.umask(0o077)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "fixture"
        subprocess.run([fixture, "prepare", root], cwd=tmp, env={}, check=True)
        challenge = os.urandom(32)
        for case in ("original", "after_refresh", "stale_recovery", "one_share", "wrong_account", "swapped_roles"):
            with tempfile.TemporaryDirectory() as run:
                folder = Path(run)
                generation = root / ("old" if case == "original" else "fresh")
                for name in ("device", "recovery", "public"):
                    if case == "one_share" and name == "recovery":
                        continue
                    source = generation
                    if case == "stale_recovery" and name == "recovery":
                        source = root / "old"
                    original = {"device": "recovery", "recovery": "device"}.get(name, name) if case == "swapped_roles" else name
                    shutil.copyfile(source / original, folder / name)
                account = (root / "account").read_bytes()
                if case == "wrong_account":
                    account = bytes([account[0] ^ 1]) + account[1:]
                (folder / "account").write_bytes(account)
                (folder / "challenge").write_bytes(challenge)
                result = subprocess.run([signer, "device", "recovery", "public", "account", "challenge"],
                                        cwd=folder, env={}, capture_output=True, check=False)
                if case not in ("original", "after_refresh"):
                    expected = {"stale_recovery": b"user package does not match", "swapped_roles": b"user package does not match",
                                "wrong_account": b"public package differs", "one_share": b"No such file or directory"}
                    if result.returncode != 1 or result.stdout or expected[case] not in result.stderr:
                        raise AssertionError(f"{case}: expected refusal without signature bytes")
                    outcomes[case] = "refused"
                    continue
                if result.returncode or len(result.stdout) != 64:
                    raise AssertionError(f"{case}: missing detached signature")
                (folder / "signature").write_bytes(result.stdout)
                verify = [fixture, "verify", "account", "challenge", "signature"]
                subprocess.run(verify, cwd=folder, env={}, check=True)
                (folder / "challenge").write_bytes(bytes([challenge[0] ^ 1]) + challenge[1:])
                changed = subprocess.run(verify, cwd=folder, env={}, capture_output=True, check=False)
                if changed.returncode == 0 or b"signature did not verify" not in changed.stderr:
                    raise AssertionError("changed challenge must fail verification")
                outcomes[case] = "verified; changed challenge rejected"
    print(json.dumps({"interfaces": interfaces, "external_ipv4_route": "unreachable", "distinct_namespace": True,
                      "signer_sha256": hashlib.sha256(signer.read_bytes()).hexdigest(), "cases": outcomes}, indent=2))


if __name__ == "__main__":
    main()
