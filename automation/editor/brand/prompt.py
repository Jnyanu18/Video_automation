"""compile_brand_brief(kit, purpose) -> the plain text a Claude step reads before it writes or plans anything.

purpose is one of PURPOSES: copy, edit_plan, motion_brief, image_prompt. Each purpose gets only the sections it needs.

Rules that hold for every purpose:
  * Facts come only from the facts group, and only while that group is approved. Within it, a proof point is used
    only when verified is true. A proof point with verified=false never appears in a brief.
  * Banned words and banned claims are listed in every brief.
  * The brief ends with an instruction not to invent facts, figures, clients, awards, dates or credentials.
  * The output is deterministic: no timestamps, fixed section order, palette sorted by role then hex.
  * The brief must fit the budget of about 1,500 tokens (characters / 4). If it does not, the kit is too large
    and compile_brand_brief raises ValueError instead of cutting text silently.
"""
from __future__ import annotations

from typing import Callable, Dict, List, Union

from .schema import PALETTE_ROLES, BrandKit
from .validator import _as_kit

PURPOSES = ("copy", "edit_plan", "motion_brief", "image_prompt")
TOKEN_BUDGET = 1500
CHARS_PER_TOKEN = 4

NO_INVENTION = (
    "Do not invent anything. Do not add facts, figures, clients, awards, testimonials, dates, prices or credentials "
    "that are not written in this brief. If something you need is missing, leave it out and say so."
)


def _join(items: List[str]) -> str:
    return "; ".join(items) if items else "(none)"


def _identity(m: BrandKit) -> List[str]:
    return [
        "BRAND",
        f"- name: {m.brand.name}",
        f"- legal name: {m.brand.legal_name}",
        f"- one-liner: {m.brand.one_liner}",
        f"- tagline: {m.brand.tagline}",
    ]


def _facts(m: BrandKit) -> List[str]:
    if m.status.facts != "approved":
        return ["FACTS", "- No facts are approved yet. Do not state any company fact, figure, client, award or credential."]
    verified = [p.text for p in m.facts.proof_points if p.verified]
    return [
        "FACTS (approved; the only facts you may state)",
        f"- history: {m.facts.history}",
        f"- mission: {m.facts.mission}",
        f"- expertise: {_join(m.facts.expertise)}",
        f"- approved claims: {_join(m.facts.approved_claims)}",
        f"- verified proof points: {_join(verified)}",
    ]


def _voice(m: BrandKit) -> List[str]:
    return [
        "VOICE",
        f"- adjectives: {_join(m.voice.adjectives)}",
        f"- preferred words: {_join(m.voice.words_to_use)}",
    ]


def _ctas(m: BrandKit) -> List[str]:
    items = [f"- {c}" for c in m.ctas] or ["- (none approved)"]
    return ["CALLS TO ACTION (use exactly one of these, or none)", *items]


def _aspects(m: BrandKit) -> List[str]:
    return [f"ASPECT RATIOS: {_join(m.aspect_ratios)}"]


def _visual(m: BrandKit) -> List[str]:
    order = {role: i for i, role in enumerate(PALETTE_ROLES)}
    swatches = sorted(m.visual.palette, key=lambda s: (order[s.role], s.hex))
    lines = ["VISUAL"]
    lines += [f"- {s.role} colour {s.hex} (share {s.share:.2f})" for s in swatches]
    lines += [
        f"- heading font: {m.visual.fonts.heading}",
        f"- body font: {m.visual.fonts.body}",
        f"- logo: show at least {m.visual.logo.min_px} px wide",
        f"- imagery: {m.visual.imagery}",
    ]
    return lines


def _motion(m: BrandKit) -> List[str]:
    return [
        "MOTION",
        f"- easing: {m.motion.easing}",
        f"- average shot length: {m.motion.avg_shot_seconds:g} seconds",
        f"- pacing: {m.motion.pacing}",
    ]


def _captions(m: BrandKit) -> List[str]:
    return [
        "CAPTIONS",
        f"- font: {m.captions.font}",
        f"- text colour: {m.captions.text_colour}",
        f"- highlight colour: {m.captions.highlight_colour}",
        f"- position: {m.captions.position}",
    ]


def _music(m: BrandKit) -> List[str]:
    licence = ("licensed track only" if m.music.licensed
               else "licence not confirmed: do not claim the music is licensed")
    return [
        "MUSIC",
        f"- mood: {m.music.mood}",
        f"- tempo: {m.music.bpm_min} to {m.music.bpm_max} BPM",
        f"- licence: {licence}",
    ]


def _rules(m: BrandKit) -> List[str]:
    return [
        "RULES",
        f"- never use these words: {_join(m.voice.words_to_avoid)}",
        f"- never make these claims: {_join(m.voice.banned_claims)}",
        f"- {NO_INVENTION}",
    ]


SECTIONS: Dict[str, Callable[[BrandKit], List[str]]] = {
    "identity": _identity,
    "facts": _facts,
    "voice": _voice,
    "ctas": _ctas,
    "aspects": _aspects,
    "visual": _visual,
    "motion": _motion,
    "captions": _captions,
    "music": _music,
}

# Which sections each purpose gets. "rules" is always last and is added for every purpose.
PURPOSE_SECTIONS: Dict[str, List[str]] = {
    "copy": ["identity", "facts", "voice", "ctas"],
    "edit_plan": ["motion", "captions", "aspects", "ctas", "music"],
    "motion_brief": ["identity", "motion", "visual", "music", "aspects"],
    "image_prompt": ["identity", "voice", "visual"],
}


MODES = ("live", "preview")

# Which Status field governs each section. identity uses the brand group.
SECTION_STATUS: Dict[str, str] = {
    "identity": "brand",
    "facts": "facts",
    "voice": "voice",
    "ctas": "ctas",
    "aspects": "aspect_ratios",
    "visual": "visual",
    "motion": "motion",
    "captions": "captions",
    "music": "music",
}


def compile_brand_brief(kit: Union[BrandKit, Dict], purpose: str, mode: str = "live") -> str:
    """Return the brief for one purpose. Same kit, purpose and mode always give the same text.

    mode "live" (the default, used for jobs that produce something to publish): a section is included only when its
    group is approved. Skipped sections are named in the brief so the model knows they exist but must not be used.
    mode "preview": every section is included and the brief is marked DRAFT, for review only.
    The RULES section (banned words and claims) is always included, whatever the status.
    """
    if purpose not in PURPOSES:
        raise ValueError(f"purpose must be one of {', '.join(PURPOSES)} (got {purpose!r})")
    if mode not in MODES:
        raise ValueError(f"mode must be one of {', '.join(MODES)} (got {mode!r})")
    model = _as_kit(kit)
    header = f"BRAND BRIEF ({purpose}, {mode}) - kit version {model.version}"
    lines: List[str] = [header]
    if mode == "preview":
        lines += ["DRAFT - preview only. Do not publish this output as final.", ""]
    else:
        lines.append("")
    skipped: List[str] = []
    for name in PURPOSE_SECTIONS[purpose]:
        approved = getattr(model.status, SECTION_STATUS[name]) == "approved"
        if mode == "live" and not approved:
            skipped.append(name)
            continue
        lines += SECTIONS[name](model)
        lines.append("")
    if skipped:
        lines += ["NOT APPROVED (do not use these sections yet): " + ", ".join(skipped), ""]
    lines += _rules(model)
    text = "\n".join(lines).rstrip() + "\n"
    estimate = len(text) // CHARS_PER_TOKEN
    if estimate > TOKEN_BUDGET:
        raise ValueError(
            f"the {purpose} brief is about {estimate} tokens, over the {TOKEN_BUDGET}-token budget; shorten the kit's lists"
        )
    return text
