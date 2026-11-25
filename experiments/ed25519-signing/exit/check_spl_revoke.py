"""Revoke one synthetic classic SPL Token delegate with retained FROST shares in LiteSVM."""

import argparse
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import TypedDict

from check import forbid_host_root, require_network_namespace
from solders.account import Account
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair
from solders.litesvm import LiteSVM
from solders.message import Message
from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.token import ID as TOKEN_PROGRAM
from solders.token.state import Mint, TokenAccount, TokenAccountState
from solders.transaction import Transaction
from solders.transaction_metadata import FailedTransactionMetadata, TransactionMetadata
from solders.transaction_status import (
    InstructionErrorCustom,
    TransactionErrorInstructionError,
)

SOURCE = Pubkey.from_bytes(b"P" * 32)
STARTING_LAMPORTS = 10_000_000
FEE = 5_000
SUPPLY = 100
ALLOWANCE = 25
TRANSFER_UNITS = 1
DECIMALS = 2
SHARE_FILES = ("device", "recovery", "public")


class Snapshot(TypedDict):
    source_raw_units: int
    destination_raw_units: int
    source_delegate: str | None
    delegated_raw_units: int
    source_rent_lamports: int
    destination_rent_lamports: int
    owner_lamports: int
    delegate_lamports: int


def sign_revoke(fixture: Path, signer: Path) -> tuple[Pubkey, Signature]:
    with tempfile.TemporaryDirectory() as setup:
        root = Path(setup) / "fixture"
        subprocess.run([fixture, "prepare", root], cwd=setup, env={}, check=True)
        refreshed = root / "fresh"
        if {path.name for path in refreshed.iterdir()} != set(SHARE_FILES):
            raise AssertionError("unexpected refreshed fixture files")
        retained = {name: (refreshed / name).read_bytes() for name in SHARE_FILES}
        retained["account"] = (root / "account").read_bytes()
    if root.exists():
        raise AssertionError("setup files persisted into signing")

    account = Pubkey.from_bytes(retained["account"])
    with tempfile.TemporaryDirectory() as run:
        folder = Path(run)
        for name, data in retained.items():
            (folder / name).write_bytes(data)
        signed = subprocess.run([signer, *SHARE_FILES, "account"], cwd=folder, env={}, capture_output=True, check=False)
        if signed.returncode or signed.stderr or len(signed.stdout) != 64:
            raise AssertionError("the retained quorum did not emit a detached revoke signature")
    return account, Signature.from_bytes(signed.stdout)


def rent_exempt(svm: LiteSVM, state: Mint | TokenAccount) -> Account:
    data = bytes(state)
    return Account(svm.minimum_balance_for_rent_exemption(len(data)), data, TOKEN_PROGRAM)


def require_success(receipt: TransactionMetadata | FailedTransactionMetadata, operation: str) -> None:
    if isinstance(receipt, TransactionMetadata):
        return
    raise AssertionError(f"{operation} failed: {receipt.err()}")


def replay(owner: Pubkey, signature: Signature) -> dict[str, object]:
    svm = LiteSVM().with_spl_programs().with_sigverify(True).with_blockhash_check(True)
    blockhash = svm.latest_blockhash()
    delegate = Keypair()
    delegate_account = delegate.pubkey()
    mint, destination, recipient = (Pubkey.new_unique() for _ in range(3))
    mint_account = rent_exempt(svm, Mint(None, SUPPLY, DECIMALS, True))
    svm.set_account(mint, mint_account)

    def token_state(authority: Pubkey, amount: int, approved: Pubkey | None = None, allowance: int = 0) -> TokenAccount:
        return TokenAccount(mint, authority, amount, approved, TokenAccountState.Initialized, None, allowance)

    source_initial = rent_exempt(svm, token_state(owner, SUPPLY, delegate_account, ALLOWANCE))
    target_initial = rent_exempt(svm, token_state(recipient, 0))
    svm.set_account(SOURCE, source_initial)
    svm.set_account(destination, target_initial)
    for account in (owner, delegate_account):
        require_success(svm.airdrop(account, STARTING_LAMPORTS), "synthetic funding")

    def snapshot(source_units: int, destination_units: int, approved: Pubkey | None, allowance: int,
                 owner_sol: int, delegate_sol: int) -> Snapshot:
        source = svm.get_account(SOURCE)
        target = svm.get_account(destination)
        if source is None or target is None:
            raise AssertionError("a token account disappeared")
        # Revoke clears the SPL option tag. Bytes in the now-inactive delegate field can remain.
        source_state = TokenAccount.from_bytes(source.data)
        target_state = TokenAccount.from_bytes(target.data)
        if (source_state != token_state(owner, source_units, approved, allowance)
                or target_state != token_state(recipient, destination_units)
                or (source.owner, target.owner) != (TOKEN_PROGRAM, TOKEN_PROGRAM)
                or source.executable or target.executable
                or (source.lamports, target.lamports) != (source_initial.lamports, target_initial.lamports)
                or svm.get_account(mint) != mint_account):
            raise AssertionError("unexpected token balances, authority, or rent deposits")
        owner_lamports = svm.get_balance(owner) or 0
        delegate_lamports = svm.get_balance(delegate_account) or 0
        if owner_lamports != owner_sol or delegate_lamports != delegate_sol:
            raise AssertionError("unexpected SOL balances for owner and delegate")
        return {
            "source_raw_units": source_state.amount,
            "destination_raw_units": target_state.amount,
            "source_delegate": "synthetic_delegate" if source_state.delegate == delegate_account else None,
            "delegated_raw_units": source_state.delegated_amount,
            "source_rent_lamports": source.lamports,
            "destination_rent_lamports": target.lamports,
            "owner_lamports": owner_lamports,
            "delegate_lamports": delegate_lamports,
        }

    # Classic SPL Token instruction 5 is Revoke; the source owner is also the fee payer.
    revoke = Instruction(TOKEN_PROGRAM, bytes([5]), [
        AccountMeta(SOURCE, False, True), AccountMeta(owner, True, False),
    ])
    message = Message.new_with_blockhash([revoke], owner, blockhash)
    if (list(message.account_keys) != [owner, SOURCE, TOKEN_PROGRAM]
            or list(message.signer_keys()) != [owner] or not signature.verify(owner, bytes(message))):
        raise AssertionError("retained quorum did not sign the expected Revoke message")

    # The delegate pays for the same ordinary TransferChecked before and after revocation.
    transfer = Instruction(TOKEN_PROGRAM, bytes([12]) + TRANSFER_UNITS.to_bytes(8, "little") + bytes([DECIMALS]), [
        AccountMeta(SOURCE, False, True), AccountMeta(mint, False, False),
        AccountMeta(destination, False, True), AccountMeta(delegate_account, True, False),
    ])
    initial = snapshot(SUPPLY, 0, delegate_account, ALLOWANCE, STARTING_LAMPORTS, STARTING_LAMPORTS)
    allowed = Transaction.new_signed_with_payer([transfer], delegate_account, [delegate], blockhash)
    require_success(svm.send_transaction(allowed), "transfer by the pre-existing delegate")
    before_revoke = snapshot(SUPPLY - TRANSFER_UNITS, TRANSFER_UNITS, delegate_account, ALLOWANCE - TRANSFER_UNITS,
                             STARTING_LAMPORTS, STARTING_LAMPORTS - FEE)

    require_success(svm.send_transaction(Transaction.populate(message, [signature])), "Revoke")
    after_revoke = snapshot(SUPPLY - TRANSFER_UNITS, TRANSFER_UNITS, None, 0,
                            STARTING_LAMPORTS - FEE, STARTING_LAMPORTS - FEE)

    svm.expire_blockhash()
    retry = Transaction.new_signed_with_payer([transfer], delegate_account, [delegate], svm.latest_blockhash())
    denied = svm.send_transaction(retry)
    # Classic SPL Token error 4 is OwnerMismatch.
    if (not isinstance(denied, FailedTransactionMetadata)
            or denied.err() != TransactionErrorInstructionError(0, InstructionErrorCustom(4))):
        raise AssertionError(f"expected the token program to reject the former delegate: {denied}")
    after_denied = snapshot(SUPPLY - TRANSFER_UNITS, TRANSFER_UNITS, None, 0,
                            STARTING_LAMPORTS - FEE, STARTING_LAMPORTS - 2 * FEE)

    return {
        "initial": initial,
        "after_authorized_delegate_transfer": before_revoke,
        "after_revoke": after_revoke,
        "after_refused_delegate_transfer": after_denied,
        "refused_delegate_error": "OwnerMismatch",
        "revoke_fee_lamports": initial["owner_lamports"] - after_revoke["owner_lamports"],
        "authorized_transfer_fee_lamports": initial["delegate_lamports"] - before_revoke["delegate_lamports"],
        "refused_transfer_fee_lamports": after_revoke["delegate_lamports"] - after_denied["delegate_lamports"],
        "revoke_fee_payer": "token_owner",
        "delegate_transfer_fee_payer": "synthetic_delegate",
        "revoke_required_signatures": len(message.signer_keys()),
        "source_owner_preserved": True,
        "mint_preserved": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binaries", type=Path)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--parent-net-inode", type=int)
    modes.add_argument("--unisolated-smoke", action="store_true")
    args = parser.parse_args()
    forbid_host_root()
    interfaces = require_network_namespace(args.parent_net_inode) if args.parent_net_inode is not None else None
    fixture = (args.binaries / "exit_fixture").resolve(strict=True)
    signer = (args.binaries / "exit_spl_revoke").resolve(strict=True)
    os.umask(0o077)
    owner, signature = sign_revoke(fixture, signer)
    print(json.dumps({"mode": "private_network_namespace" if interfaces else "unisolated_smoke",
                      "interfaces": interfaces, "external_ipv4_route": "unreachable" if interfaces else None,
                      "signer_sha256": hashlib.sha256(signer.read_bytes()).hexdigest(),
                      "revoke": replay(owner, signature)}, indent=2))


if __name__ == "__main__":
    main()
