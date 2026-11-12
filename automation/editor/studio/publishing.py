"""Publishing queue: schedule a rendered reel, and publish it through the Postiz adapter (Blotato-shaped API on :8790).

Honesty rules:
- Only platforms that have a working connector can be scheduled (today: Instagram via the adapter). Others are reported
  as "not connected" instead of being queued and pretended-published.
- Creating a post is not idempotent. A network error AFTER the create request was sent is recorded as an unknown outcome
  and is never retried automatically (it could post twice); the operator must check the account and retry on purpose.
"""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .store import Store

PLATFORMS = {
    "instagram": {"label": "Instagram Reels", "connector": "postiz-adapter"},
    "tiktok": {"label": "TikTok", "connector": None},
    "youtube_shorts": {"label": "YouTube Shorts", "connector": None},
    "x": {"label": "X / Twitter", "connector": None},
}
POLL_SECONDS = 5.0
POLL_ATTEMPTS = 60


class PublishError(Exception):
    def __init__(self, code: str, message: str, retryable: bool = True, ambiguous: bool = False):
        super().__init__(message)
        self.code, self.retryable, self.ambiguous = code, retryable, ambiguous


def _now() -> float:
    return time.time()


def parse_when(value: Optional[str]) -> Optional[float]:
    """ISO-8601 (with or without offset) -> epoch seconds; None/'now' -> None (publish immediately)."""
    if value in (None, "", "now"):
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("scheduled_at must be an ISO-8601 date-time, e.g. 2026-11-12T18:00:00+05:30")
    if dt.tzinfo is None:
        dt = dt.astimezone()  # naive = the server's local time
    return dt.timestamp()


def http_json(method: str, url: str, body: Optional[dict] = None, headers: Optional[dict] = None, timeout: float = 30.0) -> tuple[int, Any]:
    data = json.dumps(body).encode() if body is not None else None
    h = {"content-type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}


class Publisher:
    def __init__(self, store: Store, renders_dir: Path, http: Callable = http_json):
        self.store, self.renders_dir, self.http = store, Path(renders_dir), http
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._busy: set[str] = set()
        self._busy_lock = threading.Lock()

    # ------------------------------------------------------------------ config
    @property
    def adapter(self) -> str:
        return os.environ.get("POSTIZ_ADAPTER_URL", "http://127.0.0.1:8790").rstrip("/")

    def _auth(self) -> dict:
        tok = os.environ.get("POSTIZ_ADAPTER_TOKEN") or os.environ.get("ADAPTER_TOKEN")
        return {"authorization": tok} if tok else {}

    def public_url(self, render_id: str) -> Optional[str]:
        base = (os.environ.get("PUBLIC_BASE_URL") or "").rstrip("/")
        return f"{base}/render/{render_id}.mp4" if base.startswith("https://") else None

    # ------------------------------------------------------------------ accounts
    def accounts(self) -> Dict[str, Any]:
        """Real connection status per platform. Anything without a connector is reported as not connected."""
        out: Dict[str, Any] = {}
        for key, meta in PLATFORMS.items():
            out[key] = {"platform": key, "label": meta["label"], "connected": False, "account": None,
                        "detail": "No connector is configured for this platform yet."}
        try:
            status, body = self.http("GET", self.adapter + "/v2/users/me/accounts", headers=self._auth(), timeout=3.0)
        except Exception as e:
            out["instagram"]["detail"] = f"Publishing adapter not reachable at {self.adapter} ({type(e).__name__}). Start it with PUBLISH_ADAPTER=postiz."
            return out
        if status == 200 and body.get("items"):
            acc = body["items"][0]
            want = os.environ.get("POSTIZ_INTEGRATION_ID")
            if want:
                acc = next((a for a in body["items"] if str(a.get("id")) == want), acc)
            out["instagram"].update(connected=True, account=acc.get("username") or acc.get("fullname") or acc.get("id"),
                                    account_id=str(acc.get("id")), detail="Connected through the Postiz adapter")
        elif status == 200:
            out["instagram"]["detail"] = "Adapter is running but Postiz has no Instagram channel connected."
        elif status in (401, 403):
            out["instagram"]["detail"] = "Adapter rejected the token (set POSTIZ_ADAPTER_TOKEN)."
        else:
            out["instagram"]["detail"] = f"Adapter answered HTTP {status}."
        return out

    # ------------------------------------------------------------------ queue
    def schedule(self, payload: dict) -> dict:
        title = str(payload.get("title") or "").strip()
        caption = str(payload.get("caption") or "").strip()
        if not title or not caption:
            raise ValueError("title and caption are required")
        platforms = [p for p in (payload.get("platforms") or ["instagram"])]
        bad = [p for p in platforms if p not in PLATFORMS]
        if bad:
            raise ValueError(f"unknown platform(s): {', '.join(bad)}")
        unconnected = [p for p in platforms if not PLATFORMS[p]["connector"]]
        if unconnected:
            raise ValueError(f"no connector for {', '.join(unconnected)}; only Instagram can be published right now")
        render_id = payload.get("render_id")
        sb_id = payload.get("storyboard_id")
        if not render_id and sb_id:
            sb = self.store.get("storyboards", sb_id)
            render_id = ((sb or {}).get("latest_render") or {}).get("render_id")
        if not render_id or not (self.renders_dir / f"{render_id}.mp4").is_file():
            raise ValueError("a finished render is required: render the approved storyboard first")
        when = parse_when(payload.get("scheduled_at"))
        pid = self.store.new_id("pub")
        item = {
            "id": pid, "title": title[:200], "caption": caption[:2200], "platforms": platforms,
            "storyboard_id": sb_id, "render_id": render_id, "video_url": f"/render/{render_id}.mp4",
            "scheduled_at": when, "status": "SCHEDULED", "results": {}, "error": None, "attempts": 0, "metrics": None,
        }
        self.store.put("publishing", pid, item)
        self.store.log("publishing", f"Scheduled “{item['title']}”", id=pid)
        if when is None:
            self.publish_async(pid)
        return self.store.snapshot("publishing", pid)

    def cancel(self, pid: str) -> dict:
        def fn(it):
            if it["status"] not in ("SCHEDULED", "FAILED"):
                raise ValueError(f"cannot cancel a post that is {it['status']}")
            it["status"] = "CANCELED"
        rec = self.store.update("publishing", pid, fn)
        if rec is None:
            raise KeyError(pid)
        self.store.log("publishing", f"Canceled “{rec['title']}”", id=pid)
        return self.store.snapshot("publishing", pid)

    def retry(self, pid: str) -> dict:
        rec = self.store.get("publishing", pid)
        if rec is None:
            raise KeyError(pid)
        if rec["status"] != "FAILED":
            raise ValueError("only failed posts can be retried")
        if rec.get("outcome_unknown"):
            raise ValueError("the last attempt may have reached the platform. Check the account, then use ‘confirm_not_posted’ to retry")
        self.store.update("publishing", pid, lambda r: r.update(status="SCHEDULED", error=None, scheduled_at=None))
        self.publish_async(pid)
        return self.store.snapshot("publishing", pid)

    def retry_confirmed(self, pid: str) -> dict:
        """Operator checked the account and the post is NOT there: allow a retry despite the unknown outcome."""
        if self.store.get("publishing", pid) is None:
            raise KeyError(pid)
        self.store.update("publishing", pid, lambda r: r.update(outcome_unknown=False))
        return self.retry(pid)

    # ------------------------------------------------------------------ publishing
    def publish_async(self, pid: str) -> None:
        threading.Thread(target=self.publish, args=(pid,), daemon=True, name=f"publish-{pid}").start()

    def publish(self, pid: str) -> None:
        with self._busy_lock:
            if pid in self._busy:
                return
            self._busy.add(pid)
        try:
            rec = self.store.get("publishing", pid)
            if rec is None or rec["status"] not in ("SCHEDULED",):
                return
            self.store.update("publishing", pid, lambda r: r.update(status="PUBLISHING", error=None, attempts=r.get("attempts", 0) + 1))
            try:
                result = self._publish_instagram(self.store.snapshot("publishing", pid))
            except PublishError as e:
                def fail(r, e=e):
                    r.update(status="FAILED", error={"code": e.code, "message": str(e), "retryable": e.retryable},
                             outcome_unknown=bool(e.ambiguous))
                    r["results"]["instagram"] = {"status": "failed", "error": str(e)}
                self.store.update("publishing", pid, fail)
                self.store.log("publishing", f"Publish failed: {e}", id=pid, code=e.code)
                return
            except Exception as e:  # never leave an item stuck in PUBLISHING
                self.store.update("publishing", pid, lambda r: r.update(status="FAILED", error={"code": "INTERNAL", "message": str(e), "retryable": True}))
                self.store.log("publishing", f"Publish crashed: {e}", id=pid)
                return

            def ok(r):
                r.update(status="PUBLISHED", error=None, published_at=_now())
                r["results"]["instagram"] = result
            self.store.update("publishing", pid, ok)
            self.store.log("publishing", f"Published “{rec['title']}”", id=pid, url=result.get("url"))
        finally:
            with self._busy_lock:
                self._busy.discard(pid)

    def _publish_instagram(self, item: dict) -> dict:
        url = self.public_url(item["render_id"])
        if not url:
            raise PublishError("PUBLIC_URL_MISSING", "PUBLIC_BASE_URL must be the public https address of the media server (e.g. a Cloudflare tunnel) so Instagram can fetch the video", True)
        if not (self.renders_dir / f"{item['render_id']}.mp4").is_file():
            raise PublishError("RENDER_MISSING", "the rendered file no longer exists", False)
        acc = self.accounts()["instagram"]
        if not acc["connected"]:
            raise PublishError("NOT_CONNECTED", acc["detail"], True)
        auth = self._auth()
        try:
            st, media = self.http("POST", self.adapter + "/v2/media", {"url": url}, auth, 180.0)
        except Exception as e:
            raise PublishError("MEDIA_STAGE_FAILED", f"could not stage the video ({type(e).__name__})", True)
        if st != 200 or not media.get("url"):
            raise PublishError("MEDIA_STAGE_FAILED", f"adapter refused the video (HTTP {st}: {media.get('message') or media.get('error')})", st >= 500 or st == 429)
        post = {"post": {"accountId": acc["account_id"], "content": {"text": item["caption"], "mediaUrls": [media["url"]]},
                         "target": {"targetType": "instagram", "mediaType": "reel"}}}
        try:
            st, created = self.http("POST", self.adapter + "/v2/posts", post, auth, 60.0)
        except Exception as e:  # the request may have been delivered: do NOT retry on our own
            raise PublishError("OUTCOME_UNKNOWN", f"lost the connection while creating the post ({type(e).__name__}); it may exist on Instagram", False, True)
        if st >= 500 or (st == 200 and not created.get("postSubmissionId")):
            raise PublishError("OUTCOME_UNKNOWN", f"adapter answered HTTP {st} without confirming the post; check Instagram before retrying", False, True)
        if st != 200:
            raise PublishError("CREATE_REJECTED", f"post rejected (HTTP {st}: {created.get('message') or created.get('error')})", st == 429)
        sub_id = created["postSubmissionId"]
        self.store.update("publishing", item["id"], lambda r: r.update(post_submission_id=sub_id))
        for _ in range(POLL_ATTEMPTS):
            try:
                st, s = self.http("GET", f"{self.adapter}/v2/posts/{sub_id}", None, auth, 20.0)
            except Exception:
                st, s = 0, {}
            if st == 200 and s.get("status") == "published":
                return {"status": "published", "url": s.get("publicUrl"), "post_id": sub_id}
            if st == 200 and s.get("status") == "failed":
                raise PublishError("PLATFORM_REJECTED", str(s.get("errorMessage") or "Instagram rejected the post"), False)
            time.sleep(POLL_SECONDS)
        raise PublishError("OUTCOME_UNKNOWN", "timed out waiting for Instagram to confirm; check the account before retrying", False, True)

    # ------------------------------------------------------------------ scheduler
    def due(self) -> List[str]:
        now = _now()
        return [p["id"] for p in self.store.all("publishing")
                if p.get("status") == "SCHEDULED" and p.get("scheduled_at") is not None and p["scheduled_at"] <= now]

    def start(self, interval: float = 20.0) -> None:
        if self._thread and self._thread.is_alive():
            return

        def loop():
            while not self._stop.wait(interval):
                for pid in self.due():
                    self.publish_async(pid)
        # a post that was mid-flight when the service died has an unknown outcome
        for p in self.store.all("publishing"):
            if p.get("status") == "PUBLISHING":
                self.store.update("publishing", p["id"], lambda r: r.update(
                    status="FAILED", outcome_unknown=True,
                    error={"code": "OUTCOME_UNKNOWN", "message": "the service restarted while publishing; check the account before retrying", "retryable": False}))
        self._thread = threading.Thread(target=loop, daemon=True, name="publish-scheduler")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
