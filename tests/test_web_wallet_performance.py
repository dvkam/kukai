import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "experiments/web-wallet-performance/run.py"
SPEC = importlib.util.spec_from_file_location("wallet_benchmark", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class WalletBenchmarkTests(unittest.TestCase):
    def test_missing_browser_timer_is_a_validation_failure(self):
        with self.assertRaisesRegex(TypeError, "Browser timing result is missing or invalid"):
            runner.elapsed(None)

    def test_build_verification_rejects_a_swapped_script(self):
        with tempfile.TemporaryDirectory() as directory:
            build = Path(directory)
            (build / "index.html").write_text('<script src="main.js"></script>', encoding="utf8")
            script = build / "main.js"
            script.write_text('console.log("original");', encoding="utf8")
            manifest = build / "benchmark-build.json"
            digest = runner.bundle_digests(build)
            manifest.write_text(json.dumps({"bundle_sha256": digest}), encoding="utf8")
            self.assertEqual(runner.read_build(build)["bundle_sha256"], digest)

            script.write_text('console.log("replacement");', encoding="utf8")
            with self.assertRaisesRegex(ValueError, "Bundle digest mismatch"):
                runner.read_build(build)

    def test_legacy_build_hashes_are_recorded_as_observations(self):
        with tempfile.TemporaryDirectory() as directory:
            build = Path(directory)
            (build / "index.html").write_text("<title>Older build</title>", encoding="utf8")
            (build / "benchmark-build.json").write_text("{}", encoding="utf8")
            record = runner.read_build(build)
            self.assertNotIn("bundle_sha256", record)
            self.assertIn("index.html", record["observed_bundle_sha256"])
            self.assertIn("observed at measurement time", record["bundle_provenance"])

    def test_nearest_rank_uses_successful_measurements(self):
        trials = [
            {"completed": True, "timings_ms": {runner.COLD_HOME: sample}, "errors": {}, "runtime_errors": []}
            for sample in range(100, 0, -1)
        ]
        # A quick local resource failure must never improve the percentiles.
        trials.append({
            "completed": False,
            "timings_ms": {runner.COLD_HOME: 0.01},
            "errors": {},
            "runtime_errors": ["HTTP 404 /main.js"],
        })
        summary = runner.summarize(trials)
        self.assertEqual(summary["failed"], 1)
        self.assertEqual(summary["workflows"][runner.COLD_HOME], {
            "attempted": 101,
            "samples": 100,
            "failed": 1,
            "skipped": 0,
            "min": 1,
            "median": 50.5,
            "max": 100,
            "p50": 50,
            "p90": 90,
            "p95": 95,
            "p99": 99,
        })

    def test_obscured_import_keeps_only_unaffected_and_escape_measurements(self):
        summary = runner.summarize([{
            "completed": False,
            "timings_ms": {runner.COLD_HOME: 600, runner.WARM_MENU: 150, runner.SEED_AFTER_ESCAPE: 40},
            "errors": {runner.WARM_IMPORT: "Navigation stayed open over the Import form"},
            "runtime_errors": [],
        }])
        self.assertEqual(summary["completed"], 0)
        workflows = summary["workflows"]
        self.assertEqual(workflows[runner.COLD_HOME]["samples"], 1)
        self.assertEqual(workflows[runner.WARM_IMPORT]["failed"], 1)
        self.assertIsNone(workflows[runner.WARM_IMPORT]["p99"])
        self.assertEqual(workflows[runner.WARM_SEED]["skipped"], 1)
        self.assertEqual(workflows[runner.SEED_AFTER_ESCAPE]["p50"], 40)
