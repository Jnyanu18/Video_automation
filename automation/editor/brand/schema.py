"""The brand kit as Pydantic v2 models.

Every model forbids unknown keys, so a typo in a kit fails loudly instead of being silently ignored.
Every group carries an optional `note`. Placeholder values in the example kit say so in their note, and a group whose
note starts with PLACEHOLDER cannot be marked approved (see BrandKit).

Colours are "#RRGGBB" (six hex digits, leading #). They are stored upper-case.
"""
from __future__ import annotations

import re
from typing import Annotated, Any, List, Literal, Optional

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

PALETTE_ROLES = ("primary", "accent", "background", "text", "neutral")
STATUS_VALUES = ("draft", "approved")
CAPTION_POSITIONS = ("top", "middle", "bottom")
SHARE_TOLERANCE = 0.01
PLACEHOLDER_PREFIX = "PLACEHOLDER"

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_ASPECT_RE = re.compile(r"^\d+:\d+$")

NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def normalise_hex(value: object) -> str:
    """'#1a2B3c' -> '#1A2B3C'. Anything that is not '#' plus six hex digits is an error."""
    if not isinstance(value, str) or not _HEX_RE.match(value.strip()):
        raise ValueError(f"colour {value!r} must be '#' followed by six hex digits, for example #1A2B3C")
    return value.strip().upper()


HexColour = Annotated[str, BeforeValidator(normalise_hex)]


def _check_aspect(value: str) -> str:
    if not _ASPECT_RE.match(value):
        raise ValueError(f"aspect ratio {value!r} must look like 9:16 or 16:9")
    return value


AspectRatio = Annotated[str, StringConstraints(strip_whitespace=True), AfterValidator(_check_aspect)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: Optional[str] = None


class Brand(_Strict):
    name: NonEmpty
    legal_name: NonEmpty
    one_liner: NonEmpty
    tagline: NonEmpty


class ProofPoint(_Strict):
    """A claim that can be used as a fact only once a person has verified it (verified=true)."""

    text: NonEmpty
    verified: bool
    source: Optional[str] = None


class Facts(_Strict):
    history: NonEmpty
    mission: NonEmpty
    expertise: List[NonEmpty] = Field(default_factory=list)
    proof_points: List[ProofPoint] = Field(default_factory=list)
    approved_claims: List[NonEmpty] = Field(default_factory=list)


class Voice(_Strict):
    adjectives: List[NonEmpty] = Field(min_length=2, max_length=5)
    words_to_use: List[NonEmpty] = Field(default_factory=list)
    words_to_avoid: List[NonEmpty] = Field(default_factory=list)
    banned_claims: List[NonEmpty] = Field(default_factory=list)


class Swatch(_Strict):
    hex: HexColour
    role: Literal["primary", "accent", "background", "text", "neutral"]
    share: float = Field(ge=0.0, le=1.0)


class Fonts(_Strict):
    heading: NonEmpty
    body: NonEmpty


class Logo(_Strict):
    full: NonEmpty
    mono: NonEmpty
    min_px: int = Field(gt=0)


class Visual(_Strict):
    palette: List[Swatch]
    fonts: Fonts
    logo: Logo
    imagery: NonEmpty
    reference_images: List[NonEmpty] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_palette(self) -> "Visual":
        problems: List[str] = []
        roles = [s.role for s in self.palette]
        primaries = roles.count("primary")
        texts = roles.count("text")
        if primaries != 1:
            problems.append(f"palette must have exactly one primary colour (found {primaries})")
        if texts != 1:
            problems.append(f"palette must have exactly one text colour (found {texts})")
        total = sum(s.share for s in self.palette)
        if not self.palette:
            problems.append("palette must not be empty")
        elif abs(total - 1.0) > SHARE_TOLERANCE:
            problems.append(f"palette shares must sum to 1.0 within {SHARE_TOLERANCE} (sum is {total:.3f})")
        if problems:
            raise ValueError("; ".join(problems))
        return self


class Motion(_Strict):
    easing: NonEmpty
    avg_shot_seconds: float = Field(gt=0.0, le=60.0)
    pacing: NonEmpty


class Captions(_Strict):
    font: NonEmpty
    text_colour: HexColour
    highlight_colour: HexColour
    position: Literal["top", "middle", "bottom"]


class Music(_Strict):
    mood: NonEmpty
    bpm_min: int = Field(ge=1, le=300)
    bpm_max: int = Field(ge=1, le=300)
    licensed: bool

    @model_validator(mode="after")
    def _check_bpm(self) -> "Music":
        if self.bpm_min > self.bpm_max:
            raise ValueError(f"bpm_min ({self.bpm_min}) must not be above bpm_max ({self.bpm_max})")
        return self


class Status(_Strict):
    brand: Literal["draft", "approved"] = "draft"
    facts: Literal["draft", "approved"] = "draft"
    voice: Literal["draft", "approved"] = "draft"
    visual: Literal["draft", "approved"] = "draft"
    motion: Literal["draft", "approved"] = "draft"
    captions: Literal["draft", "approved"] = "draft"
    music: Literal["draft", "approved"] = "draft"
    ctas: Literal["draft", "approved"] = "draft"
    aspect_ratios: Literal["draft", "approved"] = "draft"


# Groups that carry a note, so placeholder detection and approval guard can read it.
_NOTED_GROUPS = ("brand", "facts", "voice", "visual", "motion", "captions", "music")


def _holds_placeholder(value: Any) -> bool:
    """True when any text inside the value (including nested lists and models) starts with PLACEHOLDER."""
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if isinstance(value, str):
        return value.strip().upper().startswith(PLACEHOLDER_PREFIX)
    if isinstance(value, dict):
        return any(_holds_placeholder(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return any(_holds_placeholder(v) for v in value)
    return False


_ALL_GROUPS = ("brand", "facts", "voice", "visual", "motion", "captions", "music", "ctas", "aspect_ratios")


class BrandKit(_Strict):
    brand: Brand
    facts: Facts
    voice: Voice
    visual: Visual
    motion: Motion
    captions: Captions
    music: Music
    ctas: List[NonEmpty] = Field(default_factory=list)
    aspect_ratios: List[AspectRatio] = Field(min_length=1)
    status: Status = Field(default_factory=Status)
    version: int = Field(default=1, ge=1)
    updated_at: str = ""
    owner: NonEmpty

    @model_validator(mode="after")
    def _check_cross_group(self) -> "BrandKit":
        problems: List[str] = []
        palette = {s.hex for s in self.visual.palette}
        for field_name, colour in (("captions.text_colour", self.captions.text_colour),
                                   ("captions.highlight_colour", self.captions.highlight_colour)):
            if colour not in palette:
                problems.append(f"{field_name} {colour} must be one of the palette colours")
        for group in _ALL_GROUPS:
            if getattr(self.status, group) == "approved" and _holds_placeholder(getattr(self, group)):
                problems.append(f"group '{group}' is marked approved but still holds placeholder values")
        if problems:
            raise ValueError("; ".join(problems))
        return self
