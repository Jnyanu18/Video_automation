"""Database connection and initialization for ReelForge."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

def init_db(db_path: Path | str) -> sqlite3.Connection:
    p = Path(db_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(p), check_same_thread=False, autocommit=False)
    conn.row_factory = sqlite3.Row
    schema_file = Path(__file__).parent / "schema.sql"
    if schema_file.is_file():
        conn.executescript(schema_file.read_text(encoding="utf-8"))
        conn.commit()
    return conn

class DBManager:
    def __init__(self, db_path: Path | str):
        self.db_path = Path(db_path)
        self.conn = init_db(self.db_path)

    def close(self):
        if self.conn:
            self.conn.close()

    def get_cursor(self):
        return self.conn.cursor()

from contextlib import contextmanager

@contextmanager
def get_db(workspace_path: Path | str):
    ws = Path(workspace_path)
    db_file = ws / ".reelforge" / "reelforge.db"
    conn = init_db(db_file)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

