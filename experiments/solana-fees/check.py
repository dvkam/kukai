"""Measure fee-payer behavior for a transfer of existing classic SPL tokens in LiteSVM."""

import json

from solders.account import Account
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair
from solders.litesvm import LiteSVM
from solders.message import Message
from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.system_program import ID as SYSTEM_PROGRAM
from solders.token import ID as TOKEN_PROGRAM
from solders.token.associated import get_associated_token_address
from solders.token.state import Mint, TokenAccount, TokenAccountState
from solders.transaction import Transaction
from solders.transaction_metadata import FailedTransactionMetadata, TransactionMetadata
from solders.transaction_status import (
    TransactionErrorFieldless,
    TransactionErrorInstructionError,
)


def token_amount(svm: LiteSVM, address: Pubkey) -> int:
    account = svm.get_account(address)
    if account is None:
        raise AssertionError("token account missing")
    return TokenAccount.from_bytes(account.data).amount


def transfer_checked(source: Pubkey, mint: Pubkey, destination: Pubkey, owner: Pubkey, amount: int) -> Instruction:
    # Classic SPL Token TransferChecked: discriminator 12, u64 little endian, mint precision.
    return Instruction(TOKEN_PROGRAM, bytes([12]) + amount.to_bytes(8, "little") + bytes([2]), [
        AccountMeta(source, False, True), AccountMeta(mint, False, False),
        AccountMeta(destination, False, True), AccountMeta(owner, True, False),
    ])


def expect_instruction_failure(receipt: FailedTransactionMetadata | TransactionMetadata, index: int, reason: str) -> None:
    if isinstance(receipt, TransactionMetadata):
        raise TypeError("expected FailedTransactionMetadata for the rejected transaction")
    error = receipt.err()
    if not isinstance(error, TransactionErrorInstructionError) or error.index != index:
        raise AssertionError(f"unexpected transaction error: {error}")
    if not any(reason in entry for entry in receipt.meta().logs()):
        raise AssertionError(f"missing expected failure reason: {reason}")


def check_recipient_creation(
    svm: LiteSVM, mint: Pubkey, source: Pubkey, owner: Keypair, sponsor: Keypair, fee: int,
) -> None:
    recipient = Pubkey.new_unique()
    destination = get_associated_token_address(recipient, mint)
    associated_program = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    account_size = len(bytes(TokenAccount(mint, recipient, 0, None, TokenAccountState.Initialized, None, 0)))
    rent = svm.minimum_balance_for_rent_exemption(account_size)

    def pay_and_send(payer: Keypair, amount: int) -> FailedTransactionMetadata | TransactionMetadata:
        # CreateIdempotent uses the payer's lamports and assigns token authority to the recipient.
        create = Instruction(associated_program, bytes([1]), [
            AccountMeta(payer.pubkey(), True, True), AccountMeta(destination, False, True),
            AccountMeta(recipient, False, False), AccountMeta(mint, False, False),
            AccountMeta(SYSTEM_PROGRAM, False, False), AccountMeta(TOKEN_PROGRAM, False, False),
        ])
        transfer = transfer_checked(source, mint, destination, owner.pubkey(), amount)
        svm.expire_blockhash()
        message = Message.new_with_blockhash([create, transfer], payer.pubkey(), svm.latest_blockhash())
        return svm.send_transaction(Transaction([payer, owner], message, svm.latest_blockhash()))

    source_start = token_amount(svm, source)
    if source_start < 50 or svm.get_account(destination) is not None:
        raise AssertionError("expected a funded source and absent recipient token account")

    # Leave enough SOL for a signature fee and a rent-exempt payer, but too little to fund the ATA.
    low_sponsor = Keypair()
    low_start = svm.minimum_balance_for_rent_exemption(0) + fee
    if low_start >= rent or isinstance(svm.airdrop(low_sponsor.pubkey(), low_start), FailedTransactionMetadata):
        raise AssertionError("insufficient-rent fixture setup failed")
    no_rent = pay_and_send(low_sponsor, 25)
    expect_instruction_failure(no_rent, 0, "insufficient lamports")
    if svm.get_balance(low_sponsor.pubkey()) != low_start - fee or svm.get_account(destination) is not None or token_amount(svm, source) != source_start:
        raise AssertionError("insufficient rent must charge only the fee and leave tokens unchanged")

    start = svm.get_balance(sponsor.pubkey())
    if start is None:
        raise AssertionError("missing funded sponsor")
    no_tokens = pay_and_send(sponsor, source_start + 1)
    expect_instruction_failure(no_tokens, 1, "Error: insufficient funds")
    if svm.get_balance(sponsor.pubkey()) != start - fee or svm.get_account(destination) is not None or token_amount(svm, source) != source_start:
        raise AssertionError("failed transfer must roll back the new token account and charge only the fee")

    for sends in (1, 2):
        receipt = pay_and_send(sponsor, 25)
        account = svm.get_account(destination)
        if not isinstance(receipt, TransactionMetadata) or account is None:
            raise AssertionError(f"recipient token account transfer failed: {receipt}")
        data = TokenAccount.from_bytes(account.data)
        if account.owner != TOKEN_PROGRAM or data.owner != recipient or data.mint != mint or account.lamports != rent:
            raise AssertionError("unexpected recipient token account or rent deposit")
        if data.close_authority is not None or data.delegate is not None or data.state != TokenAccountState.Initialized:
            raise AssertionError("unexpected authority or state on the new token account")
        if token_amount(svm, source) != source_start - sends * 25 or data.amount != sends * 25:
            raise AssertionError("incorrect token balances after checked transfer")
        if svm.get_balance(sponsor.pubkey()) != start - (sends + 1) * fee - rent:
            raise AssertionError("expected a fee per processed transaction and exactly one rent deposit")
    if svm.get_balance(owner.pubkey()) not in (None, 0) or svm.get_balance(recipient) not in (None, 0):
        raise AssertionError("a token authority unexpectedly received SOL")
    print(json.dumps({"new_recipient": {"rent_deposit_lamports": rent, "fee_per_transaction_lamports": fee,
                                       "first_send_cost_lamports": rent + fee, "repeat_send_cost_lamports": fee,
                                       "insufficient_rent_cost_lamports": fee, "rolled_back_transfer_cost_lamports": fee,
                                       "source_tokens_after": source_start - 50, "recipient_tokens_after": 50}}))


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
        return token_amount(svm, source), token_amount(svm, destination)

    instruction = transfer_checked(source, mint, destination, owner.pubkey(), 25)
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

    check_recipient_creation(svm, mint, source, owner, sponsor, start - end)


if __name__ == "__main__":
    main()
