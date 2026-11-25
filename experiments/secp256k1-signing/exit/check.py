"""Exercise test-only EIP-1559 exit after the setup processes have exited."""

import argparse
import errno
import hashlib
import json
import os
import socket
import subprocess
import tempfile
from pathlib import Path


def check_namespace(parent_inode: int) -> list[str]:
    interfaces = sorted(name for _, name in socket.if_nameindex())
    if os.stat("/proc/self/ns/net").st_ino == parent_inode or interfaces != ["lo"]:
        raise RuntimeError("expected a private network namespace with only loopback")
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        if probe.connect_ex(("192.0.2.1", 9)) != errno.ENETUNREACH:
            raise RuntimeError("expected no route to an external address")
    return interfaces


def execute(fixture: Path, signer: Path) -> dict[str, str]:
    cases: dict[str, str] = {}
    with tempfile.TemporaryDirectory() as setup:
        source = Path(setup)
        retained_files = ("device", "recovery", "account", "public")
        for name in ("original", "different"):
            output = source / name
            subprocess.run([fixture, "prepare", output], cwd=source, env={}, check=True)
            if sorted(path.name for path in output.iterdir()) != sorted(retained_files):
                raise AssertionError("unexpected setup output")
        retained = {name: (source / "original" / name).read_bytes() for name in retained_files}
        foreign_recovery = (source / "different" / "recovery").read_bytes()
    if source.exists():
        raise RuntimeError("setup files must be gone before signing")

    for chain in (1, 8453):
        with tempfile.TemporaryDirectory() as run:
            folder = Path(run)
            for name in ("account", "device", "recovery"):
                (folder / name).write_bytes(retained[name])
            nonce = str(int.from_bytes(os.urandom(4)))
            args = [str(chain), nonce]
            signed = subprocess.run([signer, *args], cwd=folder, env={}, capture_output=True, check=True)
            if not signed.stdout or signed.stdout[0] != 2 or signed.stderr:
                raise AssertionError(f"chain {chain}: expected only a typed transaction")

            # The verifier receives the transaction, pinned account and public key only.
            for name in ("device", "recovery"):
                (folder / name).unlink()
            (folder / "public").write_bytes(retained["public"])
            transaction = folder / "transaction"
            transaction.write_bytes(signed.stdout)
            verify = [fixture, "verify", *args]
            subprocess.run(verify, cwd=folder, env={}, check=True)
            transaction.write_bytes(signed.stdout + b"\x00")
            changed = subprocess.run(verify, cwd=folder, env={}, capture_output=True, check=False)
            if changed.returncode != 1 or changed.stdout:
                raise AssertionError(f"chain {chain}: malformed transaction accepted")
            cases[f"chain_{chain}"] = "Alloy and k256 verified; changed value, chain ID and encoding rejected"

    wrong_account = bytes([retained["account"][0] ^ 1]) + retained["account"][1:]
    corrupt_recovery = retained["recovery"][:-1]
    mutations: dict[str, tuple[dict[str, bytes | None], str]] = {
        "device_only": ({"recovery": None}, "recovery: No such file"),
        "recovery_only": ({"device": None}, "device: No such file"),
        "swapped_roles": ({"device": retained["recovery"], "recovery": retained["device"]}, "unexpected device role"),
        "duplicated_device": ({"recovery": retained["device"]}, "unexpected recovery role"),
        "wrong_account": ({"account": wrong_account}, "differ from expected account"),
        "foreign_recovery": ({"recovery": foreign_recovery}, "retained shares represent different keys"),
        "truncated_recovery": ({"recovery": corrupt_recovery}, "invalid recovery key share"),
    }
    for case, (mutation, expected) in mutations.items():
        with tempfile.TemporaryDirectory() as run:
            folder = Path(run)
            for name in ("account", "device", "recovery"):
                material = mutation.get(name, retained[name])
                if material is not None:
                    (folder / name).write_bytes(material)
            result = subprocess.run([signer, "1", "7"], cwd=folder, env={}, capture_output=True, check=False)
            if result.returncode != 1 or result.stdout or expected.encode() not in result.stderr:
                raise AssertionError(f"{case}: expected refusal without transaction bytes")
            cases[case] = "refused"
    return cases


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binaries", type=Path)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--parent-net-inode", type=int)
    modes.add_argument("--unisolated-smoke", action="store_true")
    args = parser.parse_args()
    if os.geteuid() == 0 and Path("/proc/self/uid_map").read_text().split()[1] == "0":
        raise RuntimeError("refusing to run fixture tools as host root")
    interfaces = check_namespace(args.parent_net_inode) if args.parent_net_inode is not None else None
    signer = (args.binaries / "exit_sign").resolve(strict=True)
    fixture = (args.binaries / "exit_fixture").resolve(strict=True)
    os.umask(0o077)
    cases = execute(fixture, signer)
    print(json.dumps({
        "mode": "private_network_namespace" if interfaces else "unisolated_smoke",
        "interfaces": interfaces,
        "external_ipv4_route": "unreachable" if interfaces else None,
        "signer_sha256": hashlib.sha256(signer.read_bytes()).hexdigest(),
        "fixture_sha256": hashlib.sha256(fixture.read_bytes()).hexdigest(),
        "cases": cases,
    }, indent=2))


if __name__ == "__main__":
    main()
