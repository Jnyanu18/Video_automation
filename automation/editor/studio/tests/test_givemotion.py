"""givemotion adapter and brand-kit scaffold. No real render here: subprocess.run is mocked, so these tests need no Chrome."""
from __future__ import annotations

import json
import logging
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from studio import givemotion  # noqa: E402
from brand import store as brand_store  # noqa: E402
from brand.validator import validate_kit  # noqa: E402

EXAMPLE_KIT = Path(__file__).resolve().parents[2] / "brand" / "examples" / "ailo.draft.json"


def _kit(**visual_patch):
    data = json.loads(EXAMPLE_KIT.read_text(encoding="utf-8"))
    data["owner"] = "owner-1"
    data["visual"].update(visual_patch)
    return data


def _save_kit(work_dir, data):
    kit_dir = Path(work_dir) / "brand"
    kit_dir.mkdir(parents=True, exist_ok=True)
    (kit_dir / "kit.json").write_text(json.dumps(data), encoding="utf-8")


def _proc(rc: int = 0, stdout: str = "", stderr: str = "") -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(args=[], returncode=rc, stdout=stdout, stderr=stderr)


@pytest.fixture
def composition(tmp_path: Path) -> Path:
    p = tmp_path / "video.html"
    p.write_text("<!doctype html><html></html>", encoding="utf-8")
    return p


# ---- render_html -------------------------------------------------------------------------------

def test_render_success_writes_file_and_parses_json(tmp_path, composition, monkeypatch):
    out = tmp_path / "out" / "video.mp4"
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append((cmd, kwargs))
        out.write_bytes(b"mp4")
        return _proc(0, json.dumps({"output": str(out), "frames": 90, "duration": 3}))

    monkeypatch.setattr(givemotion.subprocess, "run", fake_run)
    res = givemotion.render_html(composition, out)

    assert res["ok"] is True
    assert res["output"] == str(out)
    assert res["error"] == ""
    assert res["result"]["frames"] == 90
    cmd, kwargs = calls[0]
    assert cmd[1:3] == ["givemotion", "render"]
    assert str(composition) in cmd and "-o" in cmd and str(out) in cmd and "--json" in cmd
    assert kwargs["timeout"] == 900


def test_render_nonzero_exit_is_reported_not_raised(tmp_path, composition, monkeypatch):
    monkeypatch.setattr(givemotion.subprocess, "run", lambda cmd, **kw: _proc(1, "", "chrome not found"))
    res = givemotion.render_html(composition, tmp_path / "x.mp4")
    assert res["ok"] is False
    assert "chrome not found" in res["error"]
    assert res["output"] == ""


def test_render_bad_json_is_a_failure(tmp_path, composition, monkeypatch):
    monkeypatch.setattr(givemotion.subprocess, "run", lambda cmd, **kw: _proc(0, "not json at all"))
    res = givemotion.render_html(composition, tmp_path / "x.mp4")
    assert res["ok"] is False
    assert res["result"] is None


def test_render_success_without_file_is_a_failure(tmp_path, composition, monkeypatch):
    monkeypatch.setattr(givemotion.subprocess, "run", lambda cmd, **kw: _proc(0, json.dumps({"frames": 1})))
    res = givemotion.render_html(composition, tmp_path / "missing.mp4")
    assert res["ok"] is False
    assert "no file" in res["error"]


def test_render_timeout_is_reported(tmp_path, composition, monkeypatch):
    def boom(cmd, **kwargs):
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(givemotion.subprocess, "run", boom)
    res = givemotion.render_html(composition, tmp_path / "x.mp4", timeout_s=5)
    assert res["ok"] is False
    assert "timed out after 5s" in res["error"]


def test_render_missing_composition_never_calls_subprocess(tmp_path, monkeypatch):
    def must_not_run(cmd, **kwargs):
        raise AssertionError("subprocess should not run for a missing file")

    monkeypatch.setattr(givemotion.subprocess, "run", must_not_run)
    res = givemotion.render_html(tmp_path / "nope.html", tmp_path / "x.mp4")
    assert res["ok"] is False
    assert "not found" in res["error"]


# ---- check_html --------------------------------------------------------------------------------

def test_check_passes_when_no_errors(composition, monkeypatch):
    payload = {"ok": True, "errors": 0, "warnings": 1, "issues": []}
    monkeypatch.setattr(givemotion.subprocess, "run", lambda cmd, **kw: _proc(0, json.dumps(payload)))
    res = givemotion.check_html(composition)
    assert res["ok"] is True
    assert res["result"]["warnings"] == 1


def test_check_fails_on_errors_even_with_exit_1(composition, monkeypatch):
    payload = {"ok": False, "errors": 2, "warnings": 0, "issues": []}
    monkeypatch.setattr(givemotion.subprocess, "run", lambda cmd, **kw: _proc(1, json.dumps(payload)))
    res = givemotion.check_html(composition)
    assert res["ok"] is False
    assert res["error"] == "2 error(s)"


def test_check_command_uses_json_flag(composition, monkeypatch):
    seen = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        return _proc(0, json.dumps({"ok": True, "errors": 0}))

    monkeypatch.setattr(givemotion.subprocess, "run", fake_run)
    givemotion.check_html(composition)
    assert seen["cmd"][1:3] == ["givemotion", "check"]
    assert seen["cmd"][-1] == "--json"


# ---- brand kit: the real one (brand/store.py) ----------------------------------------------------

def test_example_kit_is_valid_for_the_real_validator():
    data = json.loads(EXAMPLE_KIT.read_text(encoding="utf-8"))
    data["owner"] = "owner-1"
    assert validate_kit(data)[0] is True


def test_no_kit_gives_empty_dict(tmp_path):
    assert givemotion.load_account_kit(tmp_path, "owner-1") == {}


def test_kit_for_another_owner_is_invisible(tmp_path):
    _save_kit(tmp_path, _kit())
    assert givemotion.load_account_kit(tmp_path, "someone-else") == {}


def test_real_kit_loads_for_its_owner(tmp_path):
    _save_kit(tmp_path, _kit())
    kit = givemotion.load_account_kit(tmp_path, "owner-1")
    assert kit["owner"] == "owner-1"
    assert kit["visual"]["fonts"]["heading"] == "Poppins"


def test_corrupt_kit_falls_back_to_empty(tmp_path, caplog):
    (tmp_path / "brand").mkdir()
    (tmp_path / "brand" / "kit.json").write_text("{not json", encoding="utf-8")
    assert givemotion.load_account_kit(tmp_path, "owner-1") == {}


def test_palette_is_read_by_role_from_the_real_kit():
    tokens = givemotion.palette_tokens(_kit())
    assert tokens["primary"] == "#FF8A4C"
    assert tokens["accent"] == "#FFB088"
    assert tokens["ink"] == "#FFFFFF"  # the 'text' role


def test_invalid_palette_hex_falls_back_per_token():
    kit = _kit()
    for sw in kit["visual"]["palette"]:
        if sw["role"] == "primary":
            sw["hex"] = "red; } body{"
    tokens = givemotion.palette_tokens(kit)
    assert tokens["primary"] == givemotion.FALLBACK_PALETTE["primary"]
    assert tokens["accent"] == "#FFB088"


def test_heading_font_with_css_breakout_is_rejected():
    kit = _kit(fonts={"heading": 'Inter"; } body { display:none', "body": "Inter"})
    assert givemotion.font_family(kit) == "Inter"


def test_web_logo_url_is_not_embedded(tmp_path):
    assert givemotion.logo_file(_kit()) is None  # the example logo is a https URL


def test_local_logo_is_found_when_it_exists(tmp_path):
    logo = tmp_path / "mark.png"
    logo.write_bytes(bytes([137]) + b"PNG")
    assert givemotion.logo_file(_kit(logo={"full": str(logo), "mono": "x", "min_px": 120})) == logo


# ---- title card: fallback and kit values --------------------------------------------------------

def test_title_card_empty_kit_uses_ailo_fallback():
    doc = givemotion.build_title_card_html({}, "AILO", "Book a demo")
    assert "--primary: #0B1F3A" in doc
    assert "--accent: #F5A623" in doc
    assert 'font-family: "Inter"' in doc
    assert "<img" not in doc
    assert "AILO" in doc and "Book a demo" in doc


def test_title_card_uses_the_real_kit():
    doc = givemotion.build_title_card_html(_kit(), "Hi", "Go")
    assert "--primary: #FF8A4C" in doc
    assert "--accent: #FFB088" in doc
    assert "--ink: #FFFFFF" in doc
    assert 'font-family: "Poppins"' in doc


def test_headline_and_cta_are_escaped():
    doc = givemotion.build_title_card_html({}, "<script>x</script>", "a & b")
    assert "<script>x</script>" not in doc
    assert "&lt;script&gt;x&lt;/script&gt;" in doc
    assert "a &amp; b" in doc


def test_logo_embedded_only_when_file_exists(tmp_path):
    logo = tmp_path / "logo.png"
    logo.write_bytes(bytes([137]) + b"PNG")
    doc = givemotion.build_title_card_html({}, "AILO", "Go", logo_path=logo)
    assert '<img class="logo"' in doc
    assert logo.resolve().as_uri() in doc

    missing = givemotion.build_title_card_html({}, "AILO", "Go", logo_path=tmp_path / "gone.png")
    assert "<img" not in missing
