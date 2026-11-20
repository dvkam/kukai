import contextlib
import copy
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
      root = Path(directory)
      shutil.copytree(ROOT / 'docs/program', root / 'docs/program')
      shutil.copytree(ROOT / 'experiments', root / 'experiments', ignore=shutil.ignore_patterns('__pycache__'))
      result_path = root / 'docs/program/capabilities/build-evidence/results.json'
      original = json.loads(result_path.read_text())
      wrong_version = copy.deepcopy(original['checks'])
      wrong_version[0]['version'] = '0.0.0'
      cases = {'empty': [], 'missing': original['checks'][:-1],
               'duplicate': [original['checks'][0]] * 4, 'wrong-version': wrong_version}
      with patch.object(records, 'ROOT', root), patch.object(records, 'PROGRAM', root / 'docs/program'):
        for name, checks in cases.items():
          with self.subTest(name=name):
            result_path.write_text(json.dumps({**original, 'checks': checks}))
            with self.assertRaisesRegex(ValueError, 'complete unique pinned'):
              records.main()


if __name__ == '__main__':
  unittest.main()
