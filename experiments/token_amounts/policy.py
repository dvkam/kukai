"""PoC display policy for a decoded token transfer, before approval binding."""

from dataclasses import dataclass
from typing import Literal

Standard = Literal["SPL", "ERC-20", "FA2", "FA1.2"]
Source = Literal["onchain", "absent", "offchain", "unavailable"]


@dataclass(frozen=True)
class Asset:
    chain: str
    contract: str
    token_id: str
    standard: Standard


@dataclass(frozen=True)
class Read:
    provider: str
    asset: Asset
    block: str
    source: Source
    decimals: int | None = None


@dataclass(frozen=True)
class Display:
    amount: str
    verdict: Literal["scaled", "raw_warning", "refuse"]
    reason: str


def token_amount(asset: Asset, units: int, block: str, primary: Read, second: Read,
                 raw_caps: dict[Asset, int]) -> Display:
    """Apply only the decimals check. A displayable amount still needs the other signing checks."""
    if type(units) is not int or units < 0 or units.bit_length() > 256:
        return Display("", "refuse", "invalid amount for this fixture")
    raw = str(units)
    if asset.standard == "SPL" and units >= 2**64:
        return Display(raw, "refuse", "amount exceeds SPL u64")
    if asset.standard not in {"SPL", "ERC-20", "FA2", "FA1.2"}:
        return Display(raw, "refuse", "unknown standard")
    if not block or not primary.provider or not second.provider or primary.provider == second.provider:
        return Display(raw, "refuse", "two distinct reads at a pinned block required")
    for read in (primary, second):
        if read.asset != asset or read.block != block:
            return Display(raw, "refuse", "asset or block mismatch")
        if read.source == "unavailable":
            return Display(raw, "refuse", "provider unavailable")
        if read.source not in {"onchain", "offchain", "absent"}:
            return Display(raw, "refuse", "unknown metadata source")
        if read.source == "absent" and read.decimals is not None:
            return Display(raw, "refuse", "inconsistent absent result")
        if read.source == "onchain" and (type(read.decimals) is not int or not 0 <= read.decimals <= 255):
            return Display(raw, "refuse", "invalid on-chain decimals")
    if (primary.source, primary.decimals) != (second.source, second.decimals):
        return Display(raw, "refuse", "providers disagree")
    if primary.source == "onchain" and asset.standard != "FA1.2":
        decimals = primary.decimals
        assert decimals is not None
        if decimals == 0:
            return Display(raw, "scaled", "verified precision")
        digits = raw.zfill(decimals + 1)
        fraction = digits[-decimals:].rstrip("0")
        number = digits[:-decimals] + ("." + fraction if fraction else "")
        return Display(number, "scaled", "verified precision")
    if asset.standard == "SPL" or (asset.standard == "ERC-20" and primary.source != "absent"):
        return Display(raw, "refuse", "required on-chain read missing")
    cap = raw_caps.get(asset)
    if type(cap) is not int or cap < 0 or units > cap:
        return Display(raw, "refuse", "unknown decimals without sufficient raw-unit allowance")
    return Display(raw, "raw_warning", "unknown decimals; raw base units")
