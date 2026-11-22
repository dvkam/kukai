"""Single-asset SQLite experiment for an honest signer's web-only reservation path."""

import sqlite3
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path

# Fixture values for a rolling window in service-clock seconds.
LIMIT = 100
WINDOW = 60
PERMISSIONS = {"approval", "permit", "operator", "delegation", "eip7702"}


@dataclass(frozen=True)
class Intent:
    account: str
    request_id: str
    kind: str
    units: int
    payload: bytes

    def valid_transfer(self) -> bool:
        return (self.kind == "transfer" and type(self.units) is int and 0 < self.units <= LIMIT
                and isinstance(self.account, str) and isinstance(self.request_id, str)
                and isinstance(self.payload, bytes) and bool(self.account and self.request_id and self.payload))


class Ledger:
    def __init__(self, path: Path):
        self.path = path
        with closing(sqlite3.connect(path)) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS requests (
                account TEXT NOT NULL, request_id TEXT NOT NULL, payload BLOB NOT NULL,
                units INTEGER NOT NULL CHECK(units > 0), state TEXT NOT NULL
                CHECK(state IN ('reserved', 'charged', 'cancelled')), charged_at INTEGER,
                PRIMARY KEY(account, request_id),
                CHECK ((state = 'charged') = (charged_at IS NOT NULL))
            ) STRICT""")
            db.execute("""CREATE TABLE IF NOT EXISTS service_clock (
                singleton INTEGER PRIMARY KEY CHECK(singleton=1), last_time INTEGER NOT NULL
            ) STRICT""")

    @staticmethod
    def _begin_at(db: sqlite3.Connection, now: int) -> None:
        """Serialize budget changes and reject stale service-clock readings."""
        if type(now) is not int or not 0 <= now < 2**63:
            raise ValueError("invalid service clock")
        db.execute("BEGIN IMMEDIATE")
        changed = db.execute("""INSERT INTO service_clock VALUES (1, ?)
            ON CONFLICT(singleton) DO UPDATE SET last_time=excluded.last_time
            WHERE service_clock.last_time <= excluded.last_time""", (now,)).rowcount
        if not changed:
            raise ValueError("service clock moved backwards")


    def reserve(self, intent: Intent, *, now: int) -> str:
        if intent.kind in PERMISSIONS:
            return "needs_ios"
        if intent.kind == "transfer" and type(intent.units) is int and intent.units > LIMIT:
            return "needs_ios"
        if not intent.valid_transfer():
            return "refused"

        with closing(sqlite3.connect(self.path)) as db, db:
            self._begin_at(db, now)
            prior = db.execute("SELECT units, payload, state FROM requests WHERE account=? AND request_id=?",
                               (intent.account, intent.request_id)).fetchone()
            if prior:
                if prior[:2] != (intent.units, intent.payload):
                    return "conflict"
                return "reserved" if prior[2] == "reserved" else "already_used"
            used = db.execute("""SELECT COALESCE(SUM(units), 0) FROM requests WHERE account=?
                AND (state='reserved' OR (state='charged' AND charged_at > ?))""",
                              (intent.account, now - WINDOW)).fetchone()[0]
            if intent.units > LIMIT - used:
                return "needs_ios"
            db.execute("""INSERT INTO requests (account, request_id, payload, units, state)
                VALUES (?, ?, ?, ?, 'reserved')""", (intent.account, intent.request_id, intent.payload, intent.units))
            return "reserved"

    def begin_signing(self, intent: Intent, *, now: int) -> bool:
        """Commit the charge before the caller may enter a signing protocol."""
        if not intent.valid_transfer():
            return False
        with closing(sqlite3.connect(self.path)) as db, db:
            self._begin_at(db, now)
            return db.execute("""UPDATE requests SET state='charged', charged_at=?
                WHERE account=? AND request_id=? AND units=? AND payload=? AND state='reserved'""",
                              (now, intent.account, intent.request_id, intent.units, intent.payload)).rowcount == 1

    def cancel(self, intent: Intent) -> bool:
        if not intent.valid_transfer():
            return False
        with closing(sqlite3.connect(self.path)) as db, db:
            return db.execute("""UPDATE requests SET state='cancelled'
                WHERE account=? AND request_id=? AND units=? AND payload=? AND state='reserved'""",
                              (intent.account, intent.request_id, intent.units, intent.payload)).rowcount == 1
