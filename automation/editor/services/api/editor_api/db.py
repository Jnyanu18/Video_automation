"""SQLite persistence (local dev). Mirrors schema.sql. Thread-safe via one lock."""
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone

SCHEMA = """
create table if not exists projects (
  id text primary key, name text not null default 'Untitled',
  status text not null default 'created', created_at text not null, updated_at text not null);
create table if not exists assets (
  id text primary key, project_id text not null references projects(id) on delete cascade,
  kind text not null, filename text not null, path text not null,
  size_bytes integer not null default 0, meta text not null default '{}', created_at text not null);
create table if not exists messages (
  id integer primary key autoincrement, project_id text not null references projects(id) on delete cascade,
  role text not null, content text not null, created_at text not null);
create table if not exists plans (
  project_id text not null references projects(id) on delete cascade, version integer not null,
  plan text not null, created_by text not null default 'system', note text not null default '',
  created_at text not null, primary key (project_id, version));
create table if not exists jobs (
  id text primary key, project_id text not null references projects(id) on delete cascade,
  kind text not null, status text not null default 'queued', payload text not null default '{}',
  result text, error text, created_at text not null, started_at text, finished_at text);
create table if not exists events (
  id integer primary key autoincrement, project_id text not null references projects(id) on delete cascade,
  type text not null, data text not null default '{}', created_at text not null);
create index if not exists events_project_idx on events(project_id, id);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _j(v):
    return json.dumps(v)


class Database:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("pragma foreign_keys=on")
        self.lock = threading.RLock()
        with self.lock:
            self.conn.executescript(SCHEMA)

    def _q(self, sql, args=()):
        with self.lock:
            return [dict(r) for r in self.conn.execute(sql, args).fetchall()]

    def _x(self, sql, args=()):
        with self.lock:
            cur = self.conn.execute(sql, args)
            self.conn.commit()
            return cur

    # projects
    def create_project(self, name: str) -> dict:
        pid, t = str(uuid.uuid4()), now()
        self._x("insert into projects values (?,?,?,?,?)", (pid, name, "created", t, t))
        return self.get_project(pid)

    def get_project(self, pid):
        r = self._q("select * from projects where id=?", (pid,))
        return r[0] if r else None

    def list_projects(self):
        return self._q("select * from projects order by created_at desc")

    def set_status(self, pid, status):
        self._x("update projects set status=?, updated_at=? where id=?", (status, now(), pid))

    # assets
    def add_asset(self, pid, kind, filename, path, size=0, meta=None) -> dict:
        aid = str(uuid.uuid4())
        self._x("insert into assets values (?,?,?,?,?,?,?,?)",
                (aid, pid, kind, filename, str(path), size, _j(meta or {}), now()))
        return self.get_asset(aid)

    def get_asset(self, aid):
        r = self._q("select * from assets where id=?", (aid,))
        return self._asset(r[0]) if r else None

    def list_assets(self, pid, kind=None):
        sql, a = "select * from assets where project_id=?", [pid]
        if kind:
            sql += " and kind=?"
            a.append(kind)
        return [self._asset(r) for r in self._q(sql + " order by created_at, rowid", a)]

    def latest_asset(self, pid, kind):
        r = self._q("select * from assets where project_id=? and kind=? order by created_at desc, rowid desc limit 1", (pid, kind))
        return self._asset(r[0]) if r else None

    @staticmethod
    def _asset(r):
        r["meta"] = json.loads(r["meta"])
        return r

    # messages
    def add_message(self, pid, role, content) -> dict:
        cur = self._x("insert into messages (project_id, role, content, created_at) values (?,?,?,?)",
                      (pid, role, content, now()))
        return self._q("select * from messages where id=?", (cur.lastrowid,))[0]

    def list_messages(self, pid):
        return self._q("select * from messages where project_id=? order by id", (pid,))

    # plans
    def latest_plan(self, pid):
        r = self._q("select * from plans where project_id=? order by version desc limit 1", (pid,))
        return self._plan(r[0]) if r else None

    def get_plan(self, pid, version):
        r = self._q("select * from plans where project_id=? and version=?", (pid, version))
        return self._plan(r[0]) if r else None

    def list_plans(self, pid):
        return [{k: v for k, v in self._plan(r).items() if k != "plan"}
                for r in self._q("select * from plans where project_id=? order by version", (pid,))]

    def save_plan(self, pid, plan: dict, created_by="system", note="") -> dict:
        with self.lock:
            cur = self.latest_plan(pid)
            if cur and cur["plan"] == plan:
                return cur  # no-op: identical plan is not a new version
            v = (cur["version"] if cur else 0) + 1
            self._x("insert into plans values (?,?,?,?,?,?)", (pid, v, _j(plan), created_by, note, now()))
            return self.get_plan(pid, v)

    @staticmethod
    def _plan(r):
        r["plan"] = json.loads(r["plan"])
        return r

    # jobs
    def create_job(self, pid, kind, payload=None) -> dict:
        jid = str(uuid.uuid4())
        self._x("insert into jobs (id, project_id, kind, status, payload, created_at) values (?,?,?,?,?,?)",
                (jid, pid, kind, "queued", _j(payload or {}), now()))
        return self.get_job(jid)

    def get_job(self, jid):
        r = self._q("select * from jobs where id=?", (jid,))
        return self._job(r[0]) if r else None

    def list_jobs(self, pid):
        return [self._job(r) for r in self._q("select * from jobs where project_id=? order by created_at, rowid", (pid,))]

    def update_job(self, jid, status, result=None, error=None):
        col = "started_at" if status == "running" else "finished_at"
        self._x(f"update jobs set status=?, result=?, error=?, {col}=? where id=?",
                (status, _j(result) if result is not None else None, error, now(), jid))

    @staticmethod
    def _job(r):
        r["payload"] = json.loads(r["payload"])
        r["result"] = json.loads(r["result"]) if r["result"] else None
        return r

    # events
    def add_event(self, pid, type_, data=None) -> dict:
        cur = self._x("insert into events (project_id, type, data, created_at) values (?,?,?,?)",
                      (pid, type_, _j(data or {}), now()))
        return self._event(self._q("select * from events where id=?", (cur.lastrowid,))[0])

    def events_after(self, pid, after_id=0):
        return [self._event(r) for r in
                self._q("select * from events where project_id=? and id>? order by id", (pid, after_id))]

    @staticmethod
    def _event(r):
        r["data"] = json.loads(r["data"])
        return r
