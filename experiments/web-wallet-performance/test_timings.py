"""Regression cases for browser measurement result validation."""
import sys
import unittest

from run import elapsed, summarize


class TimingTests(unittest.TestCase):
    def test_accepts_only_positive_finite_browser_numbers(self):
        self.assertEqual(elapsed({"ms": 1}), 1)
        for value in (True, False, 0, -1, float("nan"), float("inf"), 10**400):
            with self.subTest(value=value), self.assertRaises(ValueError):
                elapsed({"ms": value})

    def test_error_disqualifies_a_timing(self):
        with self.assertRaises(ValueError):
            elapsed({"error": "wrong account", "ms": 1})

    def test_even_median_stays_finite(self):
        row = {"completed": True, "timings_ms": {"select": sys.float_info.max}, "errors": {}, "runtime_errors": []}
        self.assertEqual(summarize([row, row], ("select",))["workflows"]["select"]["median"], sys.float_info.max)
