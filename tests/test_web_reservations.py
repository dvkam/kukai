import multiprocessing
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from pathlib import Path
from threading import Barrier

from experiments.web_limits.ledger import Intent, Ledger


def stop_after_commit(path, intent, charge):
    ledger = Ledger(path)
    if ledger.reserve(intent, now=0) != "reserved":
        raise AssertionError("Worker could not reserve")
    if charge and not ledger.begin_signing(intent, now=1):
        raise AssertionError("Worker could not charge")
    os._exit(17)


class WebReservationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.path = Path(temporary.name) / "budget.sqlite"
        self.ledger = Ledger(self.path)
        self.first = Intent("account-A", "request-1", "transfer", 60, b"pay Alice")
        self.second = replace(self.first, request_id="request-2", payload=b"pay Bob")

    def test_concurrent_devices_share_one_budget(self):
        start = Barrier(2)

        def reserve(intent):
            start.wait(timeout=5)
            return self.ledger.reserve(intent, now=0)

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(reserve, [self.first, self.second]))
        self.assertCountEqual(results, ["reserved", "needs_ios"])
        self.assertEqual([self.ledger.begin_signing(i, now=0) for i in [self.first, self.second]].count(True), 1)

    def test_both_arrival_orders_count_pending_reservations(self):
        for account, pair in [("A", [self.first, self.second]), ("B", [self.second, self.first])]:
            early, late = [replace(i, account=account) for i in pair]
            self.assertEqual(self.ledger.reserve(early, now=0), "reserved")
            self.assertEqual(self.ledger.reserve(late, now=0), "needs_ios")
            self.assertTrue(self.ledger.cancel(early))
            self.assertEqual(self.ledger.reserve(late, now=0), "reserved")

    def test_restart_preserves_held_and_charged_amounts(self):
        self.assertEqual(self.ledger.reserve(self.first, now=0), "reserved")
        restarted = Ledger(self.path)
        # Pending holds survive restart and stay charged against the limit until resolved.
        self.assertEqual(restarted.reserve(self.second, now=200), "needs_ios")
        self.assertTrue(restarted.begin_signing(self.first, now=200))
        restarted = Ledger(self.path)
        self.assertFalse(restarted.begin_signing(self.first, now=201))
        self.assertFalse(restarted.cancel(self.first))
        self.assertEqual(restarted.reserve(self.second, now=259), "needs_ios")
        self.assertEqual(restarted.reserve(self.second, now=260), "reserved")
        self.assertEqual(restarted.reserve(self.first, now=261), "already_used")

    def test_retries_and_cancellation_bind_the_original_intent(self):
        self.assertEqual(self.ledger.reserve(self.first, now=0), "reserved")
        self.assertEqual(self.ledger.reserve(self.first, now=1), "reserved")
        for changed in [replace(self.first, payload=b"pay Mallory"), replace(self.first, units=1),
                        replace(self.first, account="different"), replace(self.first, kind="permit")]:
            self.assertFalse(self.ledger.begin_signing(changed, now=1))
            self.assertFalse(self.ledger.cancel(changed))
        self.assertEqual(self.ledger.reserve(replace(self.first, units=1), now=1), "conflict")
        self.assertTrue(self.ledger.cancel(self.first))
        self.assertFalse(self.ledger.begin_signing(self.first, now=1))
        self.assertEqual(self.ledger.reserve(self.first, now=1), "already_used")

    def test_split_transfers_and_permission_changes(self):
        for index in range(4):
            part = replace(self.first, request_id=str(index), units=25)
            self.assertEqual(self.ledger.reserve(part, now=index), "reserved")
            self.assertTrue(self.ledger.begin_signing(part, now=index))
        self.assertEqual(self.ledger.reserve(replace(self.first, units=1), now=4), "needs_ios")
        for kind in ("approval", "permit", "operator", "delegation", "eip7702"):
            permission = replace(self.first, account="fresh", kind=kind, units=0)
            self.assertEqual(self.ledger.reserve(permission, now=5), "needs_ios")
            self.assertFalse(self.ledger.begin_signing(permission, now=5))
        self.assertEqual(self.ledger.reserve(replace(self.first, kind="unknown"), now=0), "refused")

    def test_malformed_amounts_and_large_base_unit_values(self):
        for units in (-1, 0, 1.5, True):
            self.assertEqual(self.ledger.reserve(replace(self.first, units=units), now=0), "refused")
        self.assertEqual(self.ledger.reserve(replace(self.first, units=2**256 - 1), now=0), "needs_ios")

    def test_abrupt_worker_exit_after_each_commit(self):
        for charge in (False, True):
            intent = replace(self.first, account=f"crash-{charge}")
            path = self.path.with_name(f"crash-{charge}.sqlite")
            worker = multiprocessing.get_context("spawn").Process(
                target=stop_after_commit, args=(path, intent, charge))
            worker.start()
            worker.join(timeout=10)
            self.assertEqual(worker.exitcode, 17)
            reopened = Ledger(path)
            self.assertEqual(reopened.reserve(replace(self.second, account=intent.account), now=2), "needs_ios")
            self.assertEqual(reopened.begin_signing(intent, now=2), not charge)

    def test_only_one_competing_worker_can_start_signing(self):
        self.assertEqual(self.ledger.reserve(self.first, now=0), "reserved")
        barrier = Barrier(2)

        def begin():
            barrier.wait(timeout=5)
            return self.ledger.begin_signing(self.first, now=1)

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(begin) for _ in range(2)]
            self.assertCountEqual([future.result() for future in futures], [True, False])

    def test_stale_service_clock_cannot_backdate_signing_after_restart(self):
        self.assertEqual(self.ledger.reserve(self.first, now=150), "reserved")
        restarted = Ledger(self.path)
        with self.assertRaisesRegex(ValueError, "backwards"):
            restarted.begin_signing(self.first, now=70)
        self.assertTrue(restarted.begin_signing(self.first, now=150))
        self.assertEqual(restarted.reserve(self.second, now=209), "needs_ios")
        self.assertEqual(restarted.reserve(self.second, now=210), "reserved")
