"""Check the bounded recovery model, both completion paths, and three deliberate mutations."""

import argparse
import hashlib
import subprocess
import tempfile
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
JAR_URL = "https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar"
JAR_DIGEST = "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jar", type=Path, help="Use a local copy of the same pinned jar")
    parser.add_argument("--logs", type=Path, help="New directory in which to retain the TLC outputs")
    args = parser.parse_args()
    source = (HERE / "Recovery.tla").read_text()
    config = (HERE / "Recovery.cfg").read_text()
    cases = [
        ("baseline", None, None),
        ("ordinary_witness", "NoOrdinaryCompletion", None),
        ("dispute_witness", "NoDisputedCompletion", None),
        ("restart_dispute", "REC6COnce", ("ELSE deadline\n", "ELSE now + DisputeDelay\n")),
        ("skip_delay", "REC6BTime", ("now >= deadline\n", "TRUE\n")),
        ("ignore_dispute_delay", "REC6BTime", ("now >= deadline\n", "now >= BaseDelay\n")),
        ("skip_factor", "REC6CFactor", ("(~disputed \\/ hasFactor)\n", "TRUE\n")),
    ]
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
        for name, property_id, change in cases:
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
            if property_id:
                expected = f"Invariant {property_id} is violated."
                correct = run.returncode == 12 and expected in run.stdout and "State 2:" in run.stdout
            else:
                expected = "Model checking completed. No error has been found."
                correct = run.returncode == 0 and expected in run.stdout
            if not correct:
                raise RuntimeError(f"{name} returned {run.returncode}:\n{run.stdout}")
            print(f"{name}: TLC exit {run.returncode}; {expected}")


if __name__ == "__main__":
    main()
