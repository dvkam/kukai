import importlib.util
import unittest
from pathlib import Path
from unittest.mock import Mock

SCRIPT = Path(__file__).resolve().parents[1] / "experiments/ed25519-signing/browser/run.py"
SPEC = importlib.util.spec_from_file_location("ed25519_browser_experiment", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class Ed25519BrowserLatencyTests(unittest.TestCase):
    def test_warm_summary_counts_only_completed_samples_and_uses_nearest_rank(self):
        samples: list[dict] = [
            {"timings_ms": dict.fromkeys(runner.SAMPLE_FIELDS, duration)}
            for duration in range(100, 0, -1)
        ]
        samples.append({"error": "WASM sample execution failed"})

        summary = runner.summarize(samples, requested=102)

        self.assertEqual(summary["attempted"], 101)
        self.assertEqual(summary["passed"], 100)
        self.assertEqual(summary["failed"], 1)
        self.assertEqual(summary["skipped"], 1)
        self.assertEqual(summary["metrics"]["solana_sign_ms"], {
            "min": 1, "median": 50.5, "max": 100,
            "p50": 50, "p90": 90, "p95": 95, "p99": 99,
        })

    def test_median_stays_finite_for_two_large_finite_intervals(self):
        sample = {"timings_ms": dict.fromkeys(runner.SAMPLE_FIELDS, 1e308)}
        summary = runner.summarize([sample, sample], requested=2)
        self.assertEqual(summary["metrics"]["tezos_sign_ms"]["median"], 1e308)

    def test_invalid_timing_ends_sampling_without_reported_input(self):
        page = Mock()
        page.evaluate.side_effect = [[4, 3, 5, 2], ["unexpected payload", 3, 5, 2]]

        samples = runner.take_samples(page, 4)

        self.assertEqual(page.evaluate.call_count, 2)
        self.assertEqual(samples[0]["timings_ms"]["solana_dkg_ms"], 4)
        self.assertEqual(samples[1], {"error": "WASM sample did not return four finite positive timings"})
