"""Bridge to Vishnu's studio (vishnu-studio/): readiness, its video library, its human sign-offs, its music, and safe command jobs.

The studio is a folder of Python commands + Remotion scenes with its own rules. This bridge keeps them:
- Only a short whitelist of commands can be run (no arbitrary shell), always with the studio as the working directory.
- Its sign-offs (`- [ ] Script`, `- [ ] Storyboard` in each video's CHECKS.md) are changed only through `tick`, i.e. by a person
  pressing an approval button, never by a job.
- ElevenLabs music is not exposed at all (its own rule: voices only; music comes from tracks already on disk).
"""
from __future__ import annotations

import hashlib
import importlib.util
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

AUDIO_EXT = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,60}$")
SAFE_FILE = re.compile(r"^(slide-\d{2}\.png|contact-sheet\.png|[\w.-]+\.mp4|[\w.-]+\.srt|thumb-\d\.png)$")


class StudioError(Exception):
    pass


# Remotion bundles every composition behind its entry file. The studio's index.ts pulls in all 80 videos' scenes, and one video
# with a missing data file stops the whole bundle. The carousel lane only needs its own composition, so it gets its own entry.
CAROUSEL_INDEX = 'import { registerRoot } from "remotion";\nimport { CarouselRoot } from "./carousel-root";\n\nregisterRoot(CarouselRoot);\n'
CAROUSEL_ROOT = """import React from "react";
import { Composition } from "remotion";
import { FPS } from "./kit/theme";
import { Carousel, carouselMetadata } from "./lanes/carousel/Carousel";

// Carousel-only Remotion root (added by the editor's bridge so a slide render does not compile every other video).
export const CarouselRoot: React.FC = () => (
  <Composition
    id="carousel"
    component={Carousel}
    durationInFrames={1}
    fps={FPS}
    width={1080}
    height={1350}
    defaultProps={{ slug: "play-store-carousel", slides: null }}
    calculateMetadata={carouselMetadata}
  />
);
"""
ENTRY_OLD = 'entryPoint: path.join(root, "remotion", "src", "index.ts"),'
ENTRY_NEW = 'entryPoint: path.join(root, "remotion", "src", process.env.STUDIO_ENTRY || "index.ts"),'


def find_studio(start: Path) -> Optional[Path]:
    env = os.environ.get("VISHNU_STUDIO_DIR")
    if env and Path(env).is_dir():
        return Path(env).resolve()
    for p in [start, *start.parents]:
        if (p / "vishnu-studio" / "lanes").is_dir():
            return (p / "vishnu-studio").resolve()
    return None


def _env_key(name: str) -> bool:
    if os.environ.get(name):
        return True
    return False


class VStudio:
    def __init__(self, root: Optional[Path], runner: Callable = subprocess.run):
        self.root = Path(root) if root else None
        self.runner = runner
        self.jobs: Dict[str, dict] = {}
        self.lock = threading.Lock()

    # ------------------------------------------------------------------ readiness
    @property
    def present(self) -> bool:
        return bool(self.root and (self.root / "lanes").is_dir() and (self.root / "kit").is_dir())

    def _remotion_installed(self) -> bool:
        if not self.root:
            return False
        b = self.root / "node_modules" / ".bin"
        return any((b / n).exists() for n in ("remotion", "remotion.cmd", "remotion.ps1"))

    def readiness(self) -> Dict[str, Any]:
        def item(id_, label, ok, detail, fix=""):
            return {"id": id_, "label": label, "ok": bool(ok), "detail": detail, "fix": fix if not ok else ""}
        items: List[dict] = []
        items.append(item("folder", "Studio folder", self.present, str(self.root) if self.present else "vishnu-studio/ not found",
                          "Put the folder next to automation/ or set VISHNU_STUDIO_DIR"))
        node, pnpm = shutil.which("node"), shutil.which("pnpm")
        items.append(item("node", "Node.js", node, node or "not found", "Install Node 18+"))
        items.append(item("pnpm", "pnpm", pnpm, pnpm or "not found", "npm install -g pnpm"))
        items.append(item("remotion", "Remotion (renders slides and scenes)", self._remotion_installed(),
                          "installed" if self._remotion_installed() else "node_modules is empty", "Install it from this screen (pnpm install)"))
        for mod, label in (("PIL", "Pillow (contact sheets)"), ("numpy", "numpy")):
            ok = importlib.util.find_spec(mod) is not None
            items.append(item(f"py_{mod.lower()}", label, ok, "installed" if ok else "missing", f"pip install {'pillow' if mod == 'PIL' else mod}"))
        eleven = _env_key("ELEVENLABS_API_KEY")
        edge = importlib.util.find_spec("edge_tts") is not None
        voice_detail = ("ElevenLabs key set" if eleven else "no ElevenLabs key: narration would use the free stand-in voice, and the studio marks such videos 'Do not publish'") if (eleven or edge) else "no ElevenLabs key and edge-tts is not installed"
        items.append(item("voice", "Narration voice (animated lane only)", eleven or edge, voice_detail, "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID, or pip install edge-tts") if not eleven else item("voice", "Narration voice (animated lane only)", True, voice_detail))
        whisper = importlib.util.find_spec("whisper") is not None
        items.append(item("whisper", "Whisper word timing (animated lane only)", whisper, "installed" if whisper else "openai-whisper is not installed", "pip install openai-whisper (large: needs torch)"))
        by = {i["id"]: i["ok"] for i in items}
        carousel_ready = all(by.get(k) for k in ("folder", "node", "remotion", "py_pil"))
        return {"present": self.present, "items": items, "carousel_ready": carousel_ready,
                "animated_ready": carousel_ready and by.get("voice") and by.get("whisper"),
                "voice_mode": "elevenlabs" if eleven else ("stand-in" if edge else "none")}

    # ------------------------------------------------------------------ library
    def _checks(self, d: Path) -> List[dict]:
        f = d / "CHECKS.md"
        if not f.is_file():
            return []
        return [{"stage": m.group(2).strip(), "done": m.group(1).lower() == "x"}
                for m in re.finditer(r"^- \[( |x|X)\] (.+?)\s*$", f.read_text(encoding="utf-8", errors="replace"), re.M)]

    def _lane(self, d: Path) -> str:
        if (d / "slides.md").is_file():
            return "carousel"
        if (d / "scenes.json").is_file() or (d / "voice").is_dir() or (d / "storyboard.md").is_file():
            return "animated"
        if (d / "raw").is_dir() or (d / "edit.md").is_file() or (d / "cuts.md").is_file():
            return "talking-head"
        return "other"

    def videos(self) -> List[dict]:
        if not self.present:
            return []
        out = []
        vd = self.root / "videos"
        for d in sorted(vd.iterdir() if vd.is_dir() else []):
            if not d.is_dir() or d.name.startswith("_"):
                continue
            title = d.name
            for fn in ("brief.md", "CHECKS.md", "slides.md"):
                f = d / fn
                if f.is_file():
                    m = re.search(r"^#\s*(?:Brief:|Checks:|Slides:)?\s*(.+)$", f.read_text(encoding="utf-8", errors="replace"), re.M)
                    if m:
                        title = m.group(1).strip()
                        break
            files = sorted(p.name for p in (d / "out").glob("*") if p.is_file() and SAFE_FILE.match(p.name)) if (d / "out").is_dir() else []
            checks = self._checks(d)
            out.append({"slug": d.name, "title": title, "lane": self._lane(d), "checks": checks,
                        "signed_off": bool(checks) and all(c["done"] for c in checks), "outputs": files,
                        "modified": max((p.stat().st_mtime for p in d.glob("*") if p.exists()), default=d.stat().st_mtime)})
        out.sort(key=lambda v: -v["modified"])
        return out

    def tick(self, slug: str, stage: str, done: bool) -> List[dict]:
        """Sign a stage off (or take the sign-off back) in CHECKS.md. A person's action; jobs never call this."""
        if not SLUG_RE.match(slug) or not self.present:
            raise StudioError("unknown video")
        f = self.root / "videos" / slug / "CHECKS.md"
        if not f.is_file():
            raise StudioError("this video has no CHECKS.md")
        text = f.read_text(encoding="utf-8")
        pat = re.compile(rf"^- \[( |x|X)\] ({re.escape(stage)}\b.*)$", re.M)
        if not pat.search(text):
            raise StudioError(f"no stage called {stage!r} in CHECKS.md")
        new = pat.sub(lambda m: f"- [{'x' if done else ' '}] {m.group(2)}", text, count=1)
        f.write_text(new, encoding="utf-8", newline="\n")
        return self._checks(f.parent)

    def file_path(self, slug: str, name: str) -> Path:
        if not SLUG_RE.match(slug) or not SAFE_FILE.match(name) or not self.present:
            raise StudioError("not found")
        p = (self.root / "videos" / slug / "out" / name).resolve()
        if not p.is_file() or (self.root / "videos").resolve() not in p.parents:
            raise StudioError("not found")
        return p

    # ------------------------------------------------------------------ music (tracks already on disk; never generated here)
    def music(self) -> List[dict]:
        if not self.present:
            return []
        vd = self.root / "videos"
        found: Dict[str, dict] = {}
        for pat in ("_music/**/*", "*/music/*"):
            for p in vd.glob(pat):
                if p.is_file() and p.suffix.lower() in AUDIO_EXT:
                    rel = p.relative_to(vd).as_posix()
                    tid = hashlib.sha1(rel.encode()).hexdigest()[:12]
                    found[tid] = {"id": tid, "name": p.stem, "video": p.parent.parent.name if p.parent.name == "music" else "library",
                                  "path": str(p), "size_mb": round(p.stat().st_size / 1048576, 2)}
        return sorted(found.values(), key=lambda t: (t["video"], t["name"]))[:300]

    def music_path(self, track_id: str) -> Path:
        for t in self.music():
            if t["id"] == track_id:
                return Path(t["path"])
        raise StudioError("unknown music track")

    def ensure_carousel_entry(self) -> List[str]:
        """Make the carousel-only Remotion entry available (idempotent). Returns what it changed, for the log."""
        if not self.present:
            raise StudioError("the Vishnu studio folder was not found")
        changed: List[str] = []
        src = self.root / "remotion" / "src"
        for name, text in (("carousel-index.ts", CAROUSEL_INDEX), ("carousel-root.tsx", CAROUSEL_ROOT)):
            f = src / name
            if not f.is_file() or f.read_text(encoding="utf-8") != text:
                src.mkdir(parents=True, exist_ok=True)
                f.write_text(text, encoding="utf-8", newline="\n")
                changed.append(f"remotion/src/{name}")
        mjs = self.root / "kit" / "remotion.mjs"
        if mjs.is_file():
            body = mjs.read_text(encoding="utf-8")
            if ENTRY_OLD in body:
                mjs.write_text(body.replace(ENTRY_OLD, ENTRY_NEW, 1), encoding="utf-8", newline="\n")
                changed.append("kit/remotion.mjs (STUDIO_ENTRY)")
            elif ENTRY_NEW not in body:
                raise StudioError("kit/remotion.mjs has changed shape; cannot select the carousel-only entry. Update the bridge.")
        return changed

    # ------------------------------------------------------------------ jobs (whitelisted commands only)
    def start_job(self, kind: str, argv: List[str], timeout: int = 1800, on_done: Optional[Callable[[dict], None]] = None,
                  extra_env: Optional[Dict[str, str]] = None) -> dict:
        if not self.present:
            raise StudioError("the Vishnu studio folder was not found")
        jid = f"vs_{uuid.uuid4().hex[:10]}"
        job = {"id": jid, "kind": kind, "status": "running", "log": [], "error": None, "started_at": time.time()}
        with self.lock:
            self.jobs[jid] = job

        def run():
            try:
                env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1", "STUDIO_NO_UPDATE_CHECK": "1", **(extra_env or {})}
                r = self.runner(argv, cwd=str(self.root), capture_output=True, text=True, timeout=timeout, env=env, encoding="utf-8", errors="replace")
                lines = [ln for ln in ((r.stdout or "") + "\n" + (r.stderr or "")).splitlines() if ln.strip()]
                with self.lock:
                    job["log"] = lines[-60:]
                    if r.returncode != 0:
                        job.update(status="failed", error=(lines[-1] if lines else f"exit code {r.returncode}")[:300])
                    else:
                        job["status"] = "done"
            except subprocess.TimeoutExpired:
                with self.lock:
                    job.update(status="failed", error=f"timed out after {timeout // 60} minutes")
            except Exception as e:
                with self.lock:
                    job.update(status="failed", error=f"{type(e).__name__}: {e}")
            with self.lock:
                job["finished_at"] = time.time()
            if on_done:
                try:
                    on_done(dict(job))
                except Exception:
                    pass
        threading.Thread(target=run, daemon=True, name=jid).start()
        return dict(job)

    def job(self, jid: str) -> Optional[dict]:
        with self.lock:
            j = self.jobs.get(jid)
            return dict(j) if j else None

    def install_argv(self) -> List[str]:
        pnpm = shutil.which("pnpm")
        if not pnpm:
            raise StudioError("pnpm is not installed (npm install -g pnpm)")
        return [pnpm, "install", "--frozen-lockfile"]

    def carousel_argv(self, slug: str) -> List[str]:
        if not SLUG_RE.match(slug):
            raise StudioError("bad slug")
        return [sys.executable, "lanes/carousel/render.py", slug]

    def _videos_bigger_than(self, limit_bytes: int) -> bool:
        total = 0
        for p in (self.root / "videos").rglob("*"):
            try:
                if p.is_file():
                    total += p.stat().st_size
            except OSError:
                continue
            if total > limit_bytes:
                return True
        return False

    def carousel_env(self, slug: str) -> Dict[str, str]:
        """Carousel-only entry. STUDIO_ONLY (bundle just this video's folder) relies on a Windows junction that needs
        privileges, so it is used only when videos/ is large enough that copying all of it would be costly."""
        env = {"STUDIO_ENTRY": "carousel-index.ts"}
        if self._videos_bigger_than(300 * 1024 * 1024):
            env["STUDIO_ONLY"] = slug
        return env
