"""Per-user (tenant) isolation for the editor engine.

One engine process serves several invited pilot accounts. Each account gets its OWN FastAPI instance,
built by ``api_server.create_app(...)`` with its own work dir, state file, renders dir, ingest dir and
upload dir, so no store, no file path and no listing is ever shared between accounts.

The Node dashboard authenticates the browser and passes the account id in the ``X-Studio-User`` header.
Node strips any inbound copy of that header, so a browser can never choose which account it is. A request
that arrives here without a valid account id is refused: there is no shared fallback instance.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from contextlib import AsyncExitStack
from pathlib import Path
from typing import Callable, Dict, Iterable, Optional

USER_HEADER = "x-studio-user"
# Account ids are also directory names: keep them boring and filesystem-safe.
USER_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{2,39}$")


def valid_user_id(value: Optional[str]) -> bool:
    return bool(value) and bool(USER_ID_RE.match(str(value)))


def users_base(repo_root: Path) -> Path:
    """Root that holds one directory per account. Node reads the same EDITOR_USERS_DIR."""
    return Path(os.environ.get("EDITOR_USERS_DIR") or (Path(repo_root) / "runtime" / "users"))


def user_work_dir(repo_root: Path, user_id: str) -> Path:
    if not valid_user_id(user_id):
        raise ValueError(f"invalid user id: {user_id!r}")
    return users_base(repo_root) / user_id


def uploads_base(repo_root: Path) -> Path:
    """Where the Node dashboard stages uploads (server/storage), one subdirectory per account."""
    return Path(os.environ.get("EDITOR_UPLOADS_DIR") or (Path(repo_root) / "server" / "storage"))


def user_uploads_dir(repo_root: Path, user_id: str) -> Path:
    if not valid_user_id(user_id):
        raise ValueError(f"invalid user id: {user_id!r}")
    return uploads_base(repo_root) / "users" / user_id


class TenantRouter:
    """ASGI app: routes each request to the caller's own engine instance, built on first use."""

    def __init__(self, build: Callable[[str, Path, bool], object], repo_root: Path,
                 scheduler_user: Optional[str] = None, open_paths: Iterable[str] = ()) -> None:
        self._build = build
        self._repo_root = Path(repo_root)
        self._scheduler_user = scheduler_user or os.environ.get("EDITOR_SCHEDULER_USER") or None
        self._apps: Dict[str, object] = {}
        self._stack = AsyncExitStack()
        self._lock = asyncio.Lock()
        self._scheduler_taken = False
        self._open_paths = set(open_paths) or {"/healthz"}

    @property
    def loaded(self) -> Dict[str, object]:
        return dict(self._apps)

    async def instance(self, user_id: str):
        app = self._apps.get(user_id)
        if app is not None:
            return app
        async with self._lock:
            app = self._apps.get(user_id)
            if app is not None:
                return app
            work = user_work_dir(self._repo_root, user_id)
            work.mkdir(parents=True, exist_ok=True)
            # Exactly one instance runs the publishing scheduler: the configured one, else the first built.
            scheduler = (user_id == self._scheduler_user) if self._scheduler_user else not self._scheduler_taken
            app = self._build(user_id, work, scheduler)
            await self._stack.enter_async_context(app.router.lifespan_context(app))
            if scheduler:
                self._scheduler_taken = True
            self._apps[user_id] = app
            return app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "lifespan":
            return await self._lifespan(receive, send)
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in (scope.get("headers") or [])}
        user_id = (headers.get(USER_HEADER) or "").strip().lower()
        if not valid_user_id(user_id):
            if scope.get("path") in self._open_paths:
                return await self._json(send, 200, {"ok": True, "multi_user": True, "accounts_loaded": len(self._apps)})
            return await self._json(send, 401, {
                "ok": False, "error": "USER_REQUIRED",
                "message": "This engine serves separate accounts: the dashboard must send a valid X-Studio-User header.",
            })
        app = await self.instance(user_id)
        return await app(scope, receive, send)

    async def _lifespan(self, receive, send):
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                try:
                    if self._scheduler_user:
                        await self.instance(self._scheduler_user)
                except Exception as exc:  # pragma: no cover - startup failure path
                    await send({"type": "lifespan.startup.failed", "message": str(exc)})
                    return
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await self._stack.aclose()
                await send({"type": "lifespan.shutdown.complete"})
                return

    @staticmethod
    async def _json(send, status: int, body: dict):
        raw = json.dumps(body).encode("utf-8")
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(raw)).encode())]})
        await send({"type": "http.response.body", "body": raw})
