"""Keyword and semantic moment search across FootageIndex."""

from __future__ import annotations

import re
from typing import List, Tuple

from footage.schema import FootageIndex, Moment


def _tokenize(text: str) -> List[str]:
    """Tokenize string into lowercase alphanumeric words."""
    return [w.lower() for w in re.findall(r"\w+", text) if w]


def find_moments(
    query: str,
    index: FootageIndex,
    *,
    limit: int = 20,
    min_relevance: float = 0.0,
) -> list[tuple[Moment, float]]:
    """Ranked (moment, relevance) pairs, highest first. Keyword path only at first:
    match query tokens against moment.description, moment.tags and moment.speech.text.
    Deterministic: equal scores break ties by moment_id, never by dict order.
    """
    q_tokens = _tokenize(query)
    if not q_tokens:
        return []

    scored: List[Tuple[Moment, float]] = []

    for m in index.moments:
        # Collect candidate texts
        desc_text = (m.description or "").lower()
        tags_text = " ".join(t.lower() for t in m.tags)
        speech_text = (m.speech.text if m.speech else "").lower()

        token_scores = []
        for token in q_tokens:
            token_match = 0.0
            # Tag exact match or containment
            if any(token == t.lower() for t in m.tags):
                token_match = max(token_match, 1.0)
            elif token in tags_text:
                token_match = max(token_match, 0.8)

            # Description match
            if desc_text:
                if re.search(r"\b" + re.escape(token) + r"\b", desc_text):
                    token_match = max(token_match, 0.9)
                elif token in desc_text:
                    token_match = max(token_match, 0.7)

            # Speech text match
            if speech_text:
                if re.search(r"\b" + re.escape(token) + r"\b", speech_text):
                    token_match = max(token_match, 0.85)
                elif token in speech_text:
                    token_match = max(token_match, 0.6)

            token_scores.append(token_match)

        # Average token match proportion
        relevance = sum(token_scores) / len(q_tokens)
        relevance = round(float(relevance), 4)

        if relevance >= min_relevance and relevance > 0.0:
            scored.append((m, relevance))

    # Sort descending by relevance, breaking ties deterministically by moment_id ascending
    scored.sort(key=lambda item: (-item[1], item[0].moment_id))
    return scored[:limit]
