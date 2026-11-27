"""Checks for a brand kit (validate_kit) and for a finished output against a kit (check_output).

validate_kit(data) -> (ok, errors)
    data is a plain dict (for example parsed kit.json). errors is a list of readable strings such as
    "visual.palette: palette shares must sum to 1.0 within 0.01 (sum is 0.900)". Empty when ok.

check_output(kit, output, *, logo_required=True) -> list of Failure
    kit is a dict or a BrandKit. output is a plain dict:
        {text: [str], colours_used: [hex], fonts_used: [str], has_logo: bool,
         cta: str, duration_s: float, aspect: str}
    An empty list means the output passes. Failure codes:
        banned_word, banned_claim, off_palette_colour, unknown_font, logo_missing,
        unapproved_cta, unapproved_aspect.

    Rules: banned words and claims match whole words or phrases, case-insensitively. An empty cta means no CTA
    and is not a failure. logo_required=False turns off the logo check for outputs that have no logo.

validate_version_bump(previous, candidate) -> list of errors. A save must increase the version.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Tuple, Union

from pydantic import ValidationError

from .schema import BrandKit, normalise_hex

OUTPUT_KEYS = ("text", "colours_used", "fonts_used", "has_logo", "cta", "duration_s", "aspect")


@dataclass(frozen=True)
class Failure:
    code: str
    message: str

    def to_dict(self) -> Dict[str, str]:
        return asdict(self)


def _format_error(err: Dict[str, Any]) -> str:
    loc = ".".join(str(part) for part in err.get("loc", ()))
    if err.get("type") == "extra_forbidden":
        return f"{loc}: unknown field" if loc else "unknown field"
    msg = str(err.get("msg", "invalid value"))
    if msg.startswith("Value error, "):
        msg = msg[len("Value error, "):]
    return f"{loc}: {msg}" if loc else msg


def validate_kit(data: Any) -> Tuple[bool, List[str]]:
    """Return (True, []) for a valid kit, otherwise (False, [messages])."""
    if not isinstance(data, dict):
        return False, ["the kit must be a JSON object"]
    try:
        BrandKit.model_validate(data)
    except ValidationError as exc:
        return False, [_format_error(err) for err in exc.errors()]
    return True, []


def validate_version_bump(previous: int, candidate: int) -> List[str]:
    """A save must give a version higher than the one stored. Returns [] when it does."""
    if not isinstance(candidate, int) or isinstance(candidate, bool):
        return ["version must be a whole number"]
    if candidate <= previous:
        return [f"version must increase on each save (stored {previous}, got {candidate})"]
    return []


def _as_kit(kit: Union[BrandKit, Dict[str, Any]]) -> BrandKit:
    if isinstance(kit, BrandKit):
        return kit
    ok, errors = validate_kit(kit)
    if not ok:
        raise ValueError("invalid brand kit: " + "; ".join(errors))
    return BrandKit.model_validate(kit)


def _phrase_pattern(term: str) -> "re.Pattern[str]":
    parts = term.split()
    body = r"\s+".join(re.escape(p) for p in parts)
    return re.compile(r"(?<!\w)" + body + r"(?!\w)", re.IGNORECASE)


def _check_shape(output: Any) -> None:
    if not isinstance(output, dict):
        raise ValueError("output must be a dict")
    missing = [k for k in OUTPUT_KEYS if k not in output]
    if missing:
        raise ValueError("output is missing keys: " + ", ".join(missing))
    if not isinstance(output["text"], list) or not all(isinstance(t, str) for t in output["text"]):
        raise ValueError("output['text'] must be a list of strings")


LOGO_KINDS = frozenset({"final_video", "end_card"})
OUTPUT_KINDS = frozenset({"final_video", "end_card", "preview", "copy", "image"})


def logo_needed(kind: Optional[str]) -> bool:
    """Final videos and end cards must carry the logo. Previews, copy and images do not.
    With no kind given the check stays strict, as before."""
    if kind is None:
        return True
    if kind not in OUTPUT_KINDS:
        raise ValueError(f"kind must be one of {', '.join(sorted(OUTPUT_KINDS))} (got {kind!r})")
    return kind in LOGO_KINDS


def check_output(kit: Union[BrandKit, Dict[str, Any]], output: Dict[str, Any], *,
                 kind: Optional[str] = None, logo_required: Optional[bool] = None) -> List[Failure]:
    """Compare a finished output with the kit. Returns every failure found (empty list when it passes).

    kind (final_video, end_card, preview, copy, image) decides whether the logo is required; see logo_needed.
    logo_required, when given, overrides that decision."""
    model = _as_kit(kit)
    _check_shape(output)
    if logo_required is None:
        logo_required = logo_needed(kind)
    failures: List[Failure] = []
    seen: set = set()

    def add(code: str, message: str, key: str) -> None:
        if (code, key) not in seen:
            seen.add((code, key))
            failures.append(Failure(code, message))

    # 1. Banned words and claims, whole word, case-insensitive.
    for code, terms, label in (
        ("banned_word", model.voice.words_to_avoid, "word"),
        ("banned_claim", model.voice.banned_claims, "claim"),
    ):
        for term in terms:
            pattern = _phrase_pattern(term)
            for line in output["text"]:
                if pattern.search(line):
                    add(code, f"banned {label} '{term}' appears in the text", term.casefold())
                    break

    # 2. Colours must come from the palette.
    palette = {s.hex for s in model.visual.palette}
    for raw in output["colours_used"]:
        try:
            colour = normalise_hex(raw)
        except ValueError:
            colour = str(raw).strip().upper()
        if colour not in palette:
            add("off_palette_colour", f"colour {colour} is not in the brand palette", colour)

    # 3. Fonts must be the kit's fonts (heading, body, or the caption font).
    kit_fonts = {model.visual.fonts.heading.casefold(), model.visual.fonts.body.casefold(), model.captions.font.casefold()}
    for font in output["fonts_used"]:
        if str(font).strip().casefold() not in kit_fonts:
            add("unknown_font", f"font '{font}' is not in the brand kit", str(font).casefold())

    # 4. Logo.
    if logo_required and not output["has_logo"]:
        add("logo_missing", "the brand logo is required but missing from the output", "logo")

    # 5. CTA must be on the approved list (an empty CTA means none is shown).
    cta = str(output["cta"]).strip()
    approved_ctas = {c.casefold() for c in model.ctas}
    if cta and cta.casefold() not in approved_ctas:
        add("unapproved_cta", f"call to action '{cta}' is not on the approved list", cta.casefold())

    # 6. Aspect ratio must be one the kit allows.
    aspect = str(output["aspect"]).strip()
    if aspect not in model.aspect_ratios:
        add("unapproved_aspect", f"aspect ratio '{aspect}' is not in the kit's aspect_ratios", aspect)

    return failures
