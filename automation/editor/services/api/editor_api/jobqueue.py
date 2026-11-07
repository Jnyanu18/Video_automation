"""Job queue interface + in-process default.

Swap in Redis/RQ/Celery/Supabase-queue by implementing JobQueue.
A handler is registered per job kind: handler(job: dict) -> dict (result).
"""
import logging
import queue
import threading
from typing import Callable, Protocol

log = logging.getLogger("editor_api.queue")
Handler = Callable[[dict], dict]


class JobQueue(Protocol):
    def register(self, kind: str, handler: Handler) -> None: ...
    def enqueue(self, job: dict) -> None: ...
    def join(self, timeout: float | None = None) -> None: ...
    def shutdown(self) -> None: ...


class InProcessQueue:
    """Single background worker thread => jobs run FIFO, one at a time
    (render + agent share 2 CPU cores, so no concurrency by default)."""

    def __init__(self, runner: Callable[[dict, Handler], None]):
        self._q: queue.Queue = queue.Queue()
        self._handlers: dict[str, Handler] = {}
        self._runner = runner  # wraps handler with status bookkeeping
        self._t = threading.Thread(target=self._loop, daemon=True, name="job-worker")
        self._t.start()

    def register(self, kind, handler):
        self._handlers[kind] = handler

    def enqueue(self, job):
        self._q.put(job)

    def _loop(self):
        while True:
            job = self._q.get()
            if job is None:
                self._q.task_done()
                return
            try:
                self._runner(job, self._handlers[job["kind"]])
            except Exception:  # runner already records failures; never kill the worker
                log.exception("job runner crashed")
            finally:
                self._q.task_done()

    def join(self, timeout=None):
        if timeout is None:
            self._q.join()
            return
        t = threading.Thread(target=self._q.join, daemon=True)
        t.start()
        t.join(timeout)

    def shutdown(self):
        self._q.put(None)
