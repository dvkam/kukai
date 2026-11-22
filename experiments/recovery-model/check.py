"""Check the bounded recovery model, both completion paths, and four deliberate mutations."""

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
JAR_URL = "https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar"
JAR_DIGEST = "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88"


CASES = [
    ("baseline", None, None),
    ("ordinary_witness", "NoOrdinaryCompletion", None),
    ("dispute_witness", "NoDisputedCompletion", None),
    ("restart_dispute", "REC6COnce", ("ELSE deadline\n", "ELSE now + DisputeDelay\n")),
    ("skip_delay", "REC6BTime", ("now >= deadline\n", "TRUE\n")),
    ("ignore_dispute_delay", "REC6BTime", ("now >= deadline\n", "now >= BaseDelay\n")),
    ("skip_factor", "REC6CFactor", ("(~disputed \\/ hasFactor)\n", "TRUE\n")),
]


def check_trace(name: str, property_id: str | None, output: str) -> None:
    if property_id is None:
        if ("Model checking completed. No error has been found." not in output
                or not re.search(r"(?m)^\d+ states generated, 143 distinct states found, 0 states left on queue\.$", output)):
            raise ValueError("Baseline did not exhaust the reviewed 143-state graph")
        return
    if f"Invariant {property_id} is violated." not in output or "State 2:" not in output:
        raise ValueError(f"{name} lacks the expected {property_id} counterexample")
    last = re.split(r"(?m)^State \d+: ", output)[-1]
    fields = dict(re.findall(r"(?m)^/\\ (\w+) = (TRUE|FALSE|-?\d+)$", last))
    first, end, deadline = (int(fields[key]) for key in ("firstObjection", "completedAt", "deadline"))
    factor = fields["hasFactor"] == "TRUE"
    disputed = fields["disputed"] == "TRUE"
    due = max(2, first + 3)
    observed = {
        "ordinary_witness": first == -1 and not disputed and not factor and end >= 2,
        "dispute_witness": first >= 0 and disputed and factor and end >= due,
        "restart_dispute": first >= 0 and disputed and deadline > due,
        "skip_delay": 0 <= end < 2,
        "ignore_dispute_delay": first >= 0 and 2 <= end < due,
        "skip_factor": first >= 0 and disputed and not factor and end >= due,
    }
    if not observed[name]:
        raise ValueError(f"{name} reached an unexpected final state: {fields}")


def check_archive() -> None:
    evidence = HERE / "evidence"
    record = json.loads((evidence / "run.json").read_text())
    expected = {f"{name}.txt" for name, _, _ in CASES}
    if set(record["files"]) != expected or record["tlc_jar_sha256"] != JAR_DIGEST or record["exit_code"] != 0:
        raise ValueError("Incomplete recovery model run record")
    for name, property_id, _ in CASES:
        log = evidence / f"{name}.txt"
        data = log.read_bytes()
        if hashlib.sha256(data).hexdigest() != record["files"][log.name]:
            raise ValueError(f"Recovery evidence digest mismatch: {log.name}")
        check_trace(name, property_id, data.decode())
    for name in ("Recovery.tla", "Recovery.cfg", "properties.md", "check.py"):
        if hashlib.sha256((HERE / name).read_bytes()).hexdigest() != record["inputs"][name]:
            raise ValueError(f"Retained evidence uses different input: {name}")

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jar", type=Path, help="Use a local copy of the same pinned jar")
    parser.add_argument("--logs", type=Path, help="New directory in which to retain the TLC outputs")
    args = parser.parse_args()
    if not args.logs:
        check_archive()
    source = (HERE / "Recovery.tla").read_text()
    config = (HERE / "Recovery.cfg").read_text()
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        jar = work / "tla2tools.jar"
        if args.jar:
            binary = args.jar.read_bytes()
        else:
            with urllib.request.urlopen(JAR_URL, timeout=45) as response:
                binary = response.read()
        if hashlib.sha256(binary).hexdigest() != JAR_DIGEST:
            raise ValueError("TLC jar checksum mismatch")
        jar.write_bytes(binary)
        if args.logs:
            args.logs.mkdir(parents=True, exist_ok=False)
        for name, property_id, change in CASES:
            folder = work / name
            folder.mkdir()
            model = source
            cfg = config
            if change:
                old, new = change
                if source.count(old) != 1:
                    raise ValueError(f"Mutation {name} no longer matches one model location")
                model = source.replace(old, new)
            elif property_id:
                cfg += f"\nINVARIANT {property_id}\n"
            (folder / "Recovery.tla").write_text(model)
            (folder / "Recovery.cfg").write_text(cfg)
            cmd = ["java", f"-Djava.io.tmpdir={folder}", "-Xmx256m", "-XX:+UseParallelGC", "-cp", str(jar), "tlc2.TLC",
                   "-workers", "1", "-fp", "0", "-seed", "1", "-config", "Recovery.cfg", "Recovery"]
            run = subprocess.run(cmd, check=False, cwd=folder, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 text=True, timeout=60)
            if args.logs:
                (args.logs / f"{name}.txt").write_text(run.stdout)
            expected_code = 12 if property_id else 0
            if run.returncode != expected_code:
                raise RuntimeError(f"{name} returned {run.returncode}:\\n{run.stdout}")
            check_trace(name, property_id, run.stdout)
            print(f"{name}: TLC exit {run.returncode}, checked {property_id or 'full graph'}")


if __name__ == "__main__":
    main()
