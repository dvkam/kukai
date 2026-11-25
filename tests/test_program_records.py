import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('program_records', ROOT / 'scripts/check-program-docs.py')
assert SPEC is not None and SPEC.loader is not None
records = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(records)


class ProgramRecordsTests(unittest.TestCase):
  def test_complete_build_matrix_passes(self):
    with contextlib.redirect_stdout(io.StringIO()):
      records.main()

  def test_incomplete_duplicate_and_wrong_version_results_fail(self):
    with tempfile.TemporaryDirectory() as directory:
      evidence = Path(directory) / 'build-evidence'
      shutil.copytree(ROOT / 'docs/program/capabilities/build-evidence', evidence)
      result_path = evidence / 'results.json'
      original = json.loads(result_path.read_text())
      wrong_version = copy.deepcopy(original['checks'])
      wrong_version[0]['version'] = '0.0.0'
      cases = {'empty': [], 'missing': original['checks'][:-1],
               'duplicate': [original['checks'][0]] * 4, 'wrong-version': wrong_version}
      for name, checks in cases.items():
        with self.subTest(name=name):
          result_path.write_text(json.dumps({**original, 'checks': checks}))
          with self.assertRaisesRegex(ValueError, 'complete unique pinned'):
            records.check_build_evidence(evidence, ROOT / 'experiments/library-build-check/sources.json')


  def test_changed_obligation_is_rejected_even_with_updated_digest(self):
    with tempfile.TemporaryDirectory() as directory:
      program = Path(directory) / 'program'
      shutil.copytree(ROOT / 'docs/program', program)
      freeze_path = program / 'verification/freeze.json'
      freeze = json.loads(freeze_path.read_text())
      snapshot_path = program / 'verification' / freeze['file']
      snapshot = json.loads(snapshot_path.read_text())
      snapshot['obligations'][3]['assumptions'] = 'A-crypto, and A-client and A-signer'
      snapshot_path.write_text(json.dumps(snapshot))
      freeze['sha256'] = hashlib.sha256(snapshot_path.read_bytes()).hexdigest()
      freeze_path.write_text(json.dumps(freeze))
      with (patch.object(records, 'PROGRAM', program),
            self.assertRaisesRegex(ValueError, 'complete source statements')):
        records.check_obligation_snapshot(program / 'program-plan-v0.5.1.md')


if __name__ == '__main__':
  unittest.main()
