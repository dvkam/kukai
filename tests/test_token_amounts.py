import unittest
from dataclasses import replace

from experiments.token_amounts.policy import Asset, Read, Source, token_amount


class TokenAmountTests(unittest.TestCase):
    def setUp(self):
        self.asset = Asset("chain-1", "token-A", "0", "ERC-20")

    def result(self, units, precision, read_source: Source="onchain", *, asset=None, cap=50, **change):
        asset = asset or self.asset
        one = Read("node-A", asset, "block-1", read_source, precision)
        if "read_asset" in change:
            change["asset"] = change.pop("read_asset")
        two = replace(one, **({"provider": "node-B"} | change))
        return token_amount(asset, units, "block-1", one, two, {self.asset: cap})

    def test_exact_rendering(self):
        for units, decimals, expected in [(0, 18, "0"), (1, 0, "1"), (100, 2, "1"), (120, 2, "1.2"),
                                         (2**53 + 1, 6, "9007199254.740993"), (1, 255, "0."+"0"*254+"1"),
                                         (2**256 - 1, 0, str(2**256 - 1))]:
            with self.subTest(units=units, decimals=decimals):
                result = self.result(units, decimals)
                self.assertEqual((result.amount, result.verdict), (expected, "scaled"))

    def test_absent_erc20_uses_only_an_asset_specific_raw_cap(self):
        self.assertEqual(self.result(50, None, "absent").verdict, "raw_warning")
        self.assertEqual(self.result(51, None, "absent").verdict, "refuse")
        for changed in [replace(self.asset, chain="base"), replace(self.asset, contract="token-B")]:
            self.assertEqual(self.result(1, None, "absent", asset=changed).verdict, "refuse")
        self.assertEqual(self.result(10, None, "unavailable").verdict, "refuse")

    def test_provider_context_and_consistency(self):
        for change in [{"provider":"node-A"}, {"block":"fork"}, {"decimals":7},
                       {"read_asset":replace(self.asset, token_id="other")}, {"source":"absent","decimals":None}]:
            self.assertEqual(self.result(100, 6, **change).verdict, "refuse")

    def test_standard_specific_sources(self):
        for standard in ["SPL", "FA2", "FA1.2"]:
            self.asset = replace(self.asset, standard=standard)
            known = self.result(12, 1)
            if standard == "FA1.2":
                self.assertEqual((known.amount, known.verdict), ("12", "raw_warning"))
            else:
                self.assertEqual((known.amount, known.verdict), ("1.2", "scaled"))
            result = self.result(12, 18, "offchain")
            self.assertEqual((result.amount, result.verdict), ("12", "refuse" if standard == "SPL" else "raw_warning"))
        self.assertEqual(self.result(2**64, 1, asset=replace(self.asset, standard="SPL")).verdict, "refuse")

    def test_malformed_values(self):
        for precision in [None, True, -1, 256, 1.5]:
            self.assertEqual(self.result(1, precision).verdict, "refuse")
        for amount in [-1, True, 2**256]:
            self.assertEqual(self.result(amount, 6).verdict, "refuse")
