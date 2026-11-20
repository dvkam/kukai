import contextlib
import hashlib
import importlib.util
import io
import json
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'experiments/library-build-check/run.py'
SPEC = importlib.util.spec_from_file_location('library_build_check', SCRIPT)
assert SPEC is not None and SPEC.loader is not None
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


def make_archive(name, kind=tarfile.REGTYPE):
  buffer = io.BytesIO()
  with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
    entry = tarfile.TarInfo(name)
    entry.type = kind
    if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
      entry.linkname = '../escaped'
    if kind == tarfile.REGTYPE:
      entry.size = 4
      archive.addfile(entry, io.BytesIO(b'data'))
    else:
      archive.addfile(entry)
  return buffer.getvalue()


def package_for(data):
  return {'name': 'probe', 'version': '1', 'archive_url': 'https://example.invalid/',
          'checksum': hashlib.sha256(data).hexdigest()}


class LibraryBuildCheckTests(unittest.TestCase):
  def test_extracts_checksum_verified_regular_file(self):
    data = make_archive('probe-1/src/lib.rs')
    with tempfile.TemporaryDirectory() as directory, patch.object(runner.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
      output = runner.unpack_package(package_for(data), Path(directory))
      self.assertEqual((output / 'src/lib.rs').read_bytes(), b'data')

  def test_rejects_corrupt_archive_before_writing(self):
    data = make_archive('probe-1/file')
    package = package_for(data)
    package['checksum'] = '0' * 64
    with tempfile.TemporaryDirectory() as directory, patch.object(runner.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
      with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
        runner.unpack_package(package, Path(directory))
      self.assertEqual(list(Path(directory).iterdir()), [])

  def test_rejects_unsafe_archive_entries(self):
    cases = [('probe-1/../../escaped', tarfile.REGTYPE), ('/tmp/escaped', tarfile.REGTYPE),
             ('other/file', tarfile.REGTYPE), ('probe-1/link', tarfile.SYMTYPE),
             ('probe-1/link', tarfile.LNKTYPE), ('probe-1/pipe', tarfile.FIFOTYPE)]
    for name, kind in cases:
      with self.subTest(name=name, kind=kind), tempfile.TemporaryDirectory() as directory:
        data = make_archive(name, kind)
        with (patch.object(runner.urllib.request, 'urlopen', return_value=io.BytesIO(data)),
              self.assertRaises(ValueError)):
          runner.unpack_package(package_for(data), Path(directory))
        self.assertEqual(list(Path(directory).iterdir()), [])

  def test_existing_output_is_not_overwritten(self):
    with tempfile.TemporaryDirectory() as directory:
      sentinel = Path(directory) / 'sentinel'
      sentinel.write_text('keep')
      with (patch.object(sys, 'argv', [str(SCRIPT), '--output', directory]),
            self.assertRaises(FileExistsError)):
        runner.main()
      self.assertEqual(sentinel.read_text(), 'keep')

  def test_failed_compilers_are_all_recorded_and_fail_the_run(self):
    statuses = iter([1, 0, 101, 0])

    def unpack(package, output):
      source = output / (package['name'] + '-' + package['version'])
      source.mkdir()
      return source

    def execute(command, check, stdout, stderr):
      self.assertFalse(check)
      self.assertEqual(stderr, subprocess.STDOUT)
      code = next(statuses)
      stdout.write(f'controlled compiler exit {code}\n')
      return subprocess.CompletedProcess(command, code)

    with tempfile.TemporaryDirectory() as directory:
      output = Path(directory) / 'output'
      with (patch.object(sys, 'argv', [str(SCRIPT), '--output', str(output)]),
            patch.object(runner, 'unpack_package', side_effect=unpack),
            patch.object(runner.subprocess, 'check_output', return_value='tool-version'),
            patch.object(runner.subprocess, 'run', side_effect=execute),
            contextlib.redirect_stdout(io.StringIO())):
        self.assertEqual(runner.main(), 1)
      results = json.loads((output / 'results.json').read_text())['checks']
      self.assertEqual([result['exit_code'] for result in results], [1, 0, 101, 0])
      for result in results:
        self.assertEqual((output / result['log']).read_text(), f"controlled compiler exit {result['exit_code']}\n")


if __name__ == '__main__':
  unittest.main()
