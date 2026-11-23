"""Measure fee-payer behavior for a transfer of existing classic SPL tokens in LiteSVM."""

import json

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
from solders.transaction_status import TransactionErrorFieldless


def main() -> None:
    svm = LiteSVM().with_spl_programs().with_sigverify(True)
    owner, sponsor = Keypair(), Keypair()
    mint, source, destination = (Pubkey.new_unique() for _ in range(3))
    for address, state in [
        (mint, Mint(None, 100, 2, True)),
        (source, TokenAccount(mint, owner.pubkey(), 100, None, TokenAccountState.Initialized, None, 0)),
        (destination, TokenAccount(mint, Pubkey.new_unique(), 0, None, TokenAccountState.Initialized, None, 0)),
    ]:
        data = bytes(state)
        svm.set_account(address, Account(svm.minimum_balance_for_rent_exemption(len(data)), data, TOKEN_PROGRAM))

    def balances() -> tuple[int, int]:
        def amount(address: Pubkey) -> int:
            value = svm.get_account(address)
            if value is None:
                raise AssertionError("token account missing")
            return TokenAccount.from_bytes(value.data).amount
        return amount(source), amount(destination)

    # Classic SPL Token TransferChecked: discriminator 12, u64 little endian, mint precision.
    instruction = Instruction(TOKEN_PROGRAM, bytes([12]) + (25).to_bytes(8, "little") + bytes([2]), [
        AccountMeta(source, False, True), AccountMeta(mint, False, False),
        AccountMeta(destination, False, True), AccountMeta(owner.pubkey(), True, False),
    ])
    if svm.get_balance(owner.pubkey()) not in (None, 0) or balances() != (100, 0):
        raise AssertionError("unexpected starting balances")
    self_paid = Transaction.new_signed_with_payer([instruction], owner.pubkey(), [owner], svm.latest_blockhash())
    denied = svm.send_transaction(self_paid)
    if not isinstance(denied, FailedTransactionMetadata) or denied.err() != TransactionErrorFieldless.AccountNotFound:
        raise AssertionError("unfunded owner paid the fee")
    print("self-paid", denied.err())
    if balances() != (100, 0):
        raise AssertionError("failed self-paid transfer changed tokens")

    funded = svm.airdrop(sponsor.pubkey(), 10_000_000)
    if isinstance(funded, FailedTransactionMetadata) or svm.get_balance(sponsor.pubkey()) != 10_000_000:
        raise AssertionError("sponsor fixture funding failed")
    message = Message.new_with_blockhash([instruction], sponsor.pubkey(), svm.latest_blockhash())
    sponsored = Transaction([sponsor, owner], message, svm.latest_blockhash())
    start = svm.get_balance(sponsor.pubkey())
    if start is None or list(message.account_keys[:2]) != [sponsor.pubkey(), owner.pubkey()]:
        raise AssertionError("expected a funded fee payer and token authority as signers")
    for index in (0, 1):
        signatures = list(sponsored.signatures)
        signatures[index] = Signature.default()
        rejected = svm.send_transaction(Transaction.populate(message, signatures))
        if not isinstance(rejected, FailedTransactionMetadata) or rejected.err() != TransactionErrorFieldless.SignatureFailure:
            raise AssertionError("incomplete signatures accepted")
        print("missing signature", index, rejected.err())
        if balances() != (100, 0) or svm.get_balance(sponsor.pubkey()) != start:
            raise AssertionError("signature failure changed balances")
    receipt = svm.send_transaction(sponsored)
    if not isinstance(receipt, TransactionMetadata) or balances() != (75, 25):
        raise AssertionError("sponsored transfer failed or changed unexpected balances")
    end = svm.get_balance(sponsor.pubkey())
    if end is None or start - end != 10_000 or svm.get_balance(owner.pubkey()) not in (None, 0):
        raise AssertionError("fee was not borne by the sponsor")
    print(json.dumps({"fee_lamports": start-end, "token_balances_before": [100, 0],
                      "token_balances_after": list(balances()), "owner_lamports": 0}))


if __name__ == "__main__":
    main()
