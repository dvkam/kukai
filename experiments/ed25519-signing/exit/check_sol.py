"""Execute a synthetic native SOL exit with retained FROST shares in LiteSVM."""

import argparse
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

from check import forbid_host_root, require_network_namespace
from solders.hash import Hash
from solders.keypair import Keypair
from solders.litesvm import LiteSVM
from solders.message import Message
from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.system_program import ID as SYSTEM_PROGRAM
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction
from solders.transaction_metadata import FailedTransactionMetadata, TransactionMetadata
from solders.transaction_status import TransactionErrorFieldless

STARTING_BALANCE = 10_000_000
PARTIAL_AMOUNT = 2_000_000
LATER_DEPOSIT = 1_000_000
FEE = 5_000
SHARE_FILES = ("device", "recovery", "public")


def new_message(account: Pubkey, recipient: Pubkey, amount: int, blockhash: Hash) -> Message:
    instruction = transfer(TransferParams(from_pubkey=account, to_pubkey=recipient, lamports=amount))
    return Message.new_with_blockhash([instruction], account, blockhash)


def request(account: Pubkey, recipient: Pubkey, blockhash: Hash, amount: int) -> bytes:
    return b"KUKASOL1" + bytes(account) + bytes(recipient) + bytes(blockhash) + amount.to_bytes(8, "little")


def use_signer(signer: Path, directory: Path) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run([signer, *SHARE_FILES, "account", "transfer"], cwd=directory, env={},
                          capture_output=True, check=False)


def replay(signer: Path, directory: Path, account: Pubkey, receiver: Keypair, amount: int,
           expected_fee: int) -> tuple[dict[str, object], int]:
    recipient = receiver.pubkey()
    svm = LiteSVM().with_sigverify(True).with_blockhash_check(True)
    funded = svm.airdrop(account, STARTING_BALANCE)
    before = (svm.get_balance(account), svm.get_balance(recipient) or 0)
    if not isinstance(funded, TransactionMetadata) or before != (STARTING_BALANCE, 0):
        raise AssertionError("unexpected synthetic funding result")
    blockhash = svm.latest_blockhash()
    (directory / "transfer").write_bytes(request(account, recipient, blockhash, amount))
    signed = use_signer(signer, directory)
    if signed.returncode or signed.stderr or len(signed.stdout) != 64:
        raise AssertionError("the retained quorum did not emit a detached signature")
    signature = Signature.from_bytes(signed.stdout)

    message = new_message(account, recipient, amount, blockhash)
    if (list(message.signer_keys()) != [account] or list(message.account_keys) != [account, recipient, SYSTEM_PROGRAM]
            or not signature.verify(account, bytes(message))):
        raise AssertionError("signature did not verify over the expected native SOL message")
    for modified in [
        new_message(Pubkey.new_unique(), recipient, amount, blockhash),
        new_message(account, Pubkey.new_unique(), amount, blockhash),
        new_message(account, recipient, amount + 1, blockhash),
        new_message(account, recipient, amount, Hash.from_bytes(os.urandom(32))),
    ]:
        if signature.verify(account, bytes(modified)):
            raise AssertionError("signature verified after a transfer field changed")

    invalid = svm.send_transaction(Transaction.populate(message, [Signature.default()]))
    if (not isinstance(invalid, FailedTransactionMetadata) or invalid.err() != TransactionErrorFieldless.SignatureFailure
            or (svm.get_balance(account), svm.get_balance(recipient) or 0) != before):
        raise AssertionError("missing signature was accepted or changed balances")
    receipt = svm.send_transaction(Transaction.populate(message, [signature]))
    sender_after = svm.get_balance(account) or 0
    receiver_account = svm.get_account(recipient)
    receiver_after = svm.get_balance(recipient)
    observed_fee = STARTING_BALANCE - sender_after - amount
    if (not isinstance(receipt, TransactionMetadata) or receiver_account is None or receiver_account.owner != SYSTEM_PROGRAM
            or receiver_after != amount or observed_fee != expected_fee):
        raise AssertionError("native transfer did not pay the expected fee and recipient")
    source_present = svm.get_account(account) is not None
    receipt_message = b"Kukai PoC SOL exit receiver receipt v1\0" + bytes(message)
    receipt_signature = receiver.sign_message(receipt_message)
    if not receipt_signature.verify(recipient, receipt_message):
        raise AssertionError("receiver could not prove possession of the credited key")
    result: dict[str, object] = {"sender_before_lamports": before[0], "sender_after_lamports": sender_after,
              "recipient_before_lamports": before[1], "recipient_after_lamports": receiver_after,
              "fee_lamports": observed_fee, "required_signatures": len(message.signer_keys()),
              "changed_fields_refused": ["payer", "recipient", "amount", "blockhash"],
              "empty_signature_refused": True, "source_present_after_transfer": source_present,
              "receiver_key_possession_verified": True}
    if amount == STARTING_BALANCE - expected_fee:
        if sender_after != 0:
            raise AssertionError("full sweep left a spendable sender balance")
        deposit = svm.airdrop(account, LATER_DEPOSIT)
        if (not isinstance(deposit, TransactionMetadata) or svm.get_balance(account) != LATER_DEPOSIT
                or svm.get_balance(recipient) != receiver_after):
            raise AssertionError("unexpected result after a synthetic deposit to the swept address")
        result["later_deposit_to_swept_address_lamports"] = LATER_DEPOSIT
    return result, observed_fee


def execute(fixture: Path, signer: Path) -> dict[str, object]:
    with tempfile.TemporaryDirectory() as setup:
        root = Path(setup) / "fixture"
        subprocess.run([fixture, "prepare", root], cwd=setup, env={}, check=True)
        account = Pubkey.from_bytes((root / "account").read_bytes())
        retained: dict[str, dict[str, bytes]] = {}
        for generation in ("old", "fresh"):
            folder = root / generation
            if sorted(path.name for path in folder.iterdir()) != sorted(SHARE_FILES):
                raise AssertionError("unexpected setup files")
            retained[generation] = {name: (folder / name).read_bytes() for name in SHARE_FILES}
    if root.exists():
        raise AssertionError("setup files persisted into signing")

    results: dict[str, object] = {}
    measured_fee = FEE
    for generation in ("old", "fresh"):
        with tempfile.TemporaryDirectory() as run:
            folder = Path(run)
            (folder / "account").write_bytes(bytes(account))
            for name, data in retained[generation].items():
                (folder / name).write_bytes(data)
            amount = PARTIAL_AMOUNT if generation == "old" else STARTING_BALANCE - measured_fee
            results[generation], measured_fee = replay(signer, folder, account, Keypair(),
                                                       amount, measured_fee)

    mutation_cases: dict[str, tuple[dict[str, bytes | None], bytes, bytes]] = {
        "stale_recovery": ({"recovery": retained["old"]["recovery"]}, bytes(account), b"user package does not match"),
        "one_share": ({"recovery": None}, bytes(account), b"No such file"),
        "wrong_account": ({}, os.urandom(32), b"public package differs from pinned account"),
        "swapped_roles": ({"device": retained["fresh"]["recovery"], "recovery": retained["fresh"]["device"]},
                          bytes(account), b"user package does not match"),
        "wrong_transfer_payer": ({}, bytes(account), b"transfer payer differs from pinned account"),
        "wrong_transfer_amount": ({}, bytes(account), b"unexpected fixture amount"),
        "truncated_transfer": ({}, bytes(account), b"invalid SOL transfer fixture length"),
    }
    for case, (mutation, expected_account, reason) in mutation_cases.items():
        with tempfile.TemporaryDirectory() as run:
            folder = Path(run)
            (folder / "account").write_bytes(expected_account)
            for name, data in retained["fresh"].items():
                material = mutation.get(name, data)
                if material is not None:
                    (folder / name).write_bytes(material)
            payer = Pubkey.new_unique() if case == "wrong_transfer_payer" else account
            amount = PARTIAL_AMOUNT + 1 if case == "wrong_transfer_amount" else PARTIAL_AMOUNT
            payload = request(payer, Pubkey.new_unique(), Hash.from_bytes(os.urandom(32)), amount)
            (folder / "transfer").write_bytes(payload[:-1] if case == "truncated_transfer" else payload)
            rejected = use_signer(signer, folder)
            if rejected.returncode != 1 or rejected.stdout or reason not in rejected.stderr:
                raise AssertionError(f"{case}: expected refusal without signature bytes")
            results[case] = "refused"
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binaries", type=Path)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--parent-net-inode", type=int)
    modes.add_argument("--unisolated-smoke", action="store_true")
    args = parser.parse_args()
    forbid_host_root()
    interfaces = require_network_namespace(args.parent_net_inode) if args.parent_net_inode is not None else None
    signer = (args.binaries / "exit_sol_transfer").resolve(strict=True)
    fixture = (args.binaries / "exit_fixture").resolve(strict=True)
    os.umask(0o077)
    print(json.dumps({"mode": "private_network_namespace" if interfaces else "unisolated_smoke",
                      "interfaces": interfaces, "external_ipv4_route": "unreachable" if interfaces else None,
                      "signer_sha256": hashlib.sha256(signer.read_bytes()).hexdigest(),
                      "cases": execute(fixture, signer)}, indent=2))


if __name__ == "__main__":
    main()
