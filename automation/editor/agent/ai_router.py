"""Capability-Based AI Model Router for GrowthOS.

Routes editorial and analysis tasks dynamically based on specialized model capabilities
rather than a blunt binary provider switch.

Capabilities:
- Claude (Anthropic): Creative direction, storytelling, narrative pacing, timeline planning, editorial revision reasoning.
- Gemini (Google GenAI): Multimodal video understanding, scene interpretation, shot visual comparison, object/action recognition, rendered MP4 video review.

Includes health probing, automatic fallback, and schema-enforced structured outputs.
"""
from __future__ import annotations

import json
import logging
import os
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

log = logging.getLogger("ai_router")

T = TypeVar("T", bound=BaseModel)


class ModelCapability(str, Enum):
    # Creative & Reasoning (Primary: Claude)
    CREATIVE_DIRECTION = "creative_direction"
    STORYTELLING = "storytelling"
    EDITORIAL_REASONING = "editorial_reasoning"
    TIMELINE_PLANNING = "timeline_planning"
    REVISION_REASONING = "revision_reasoning"
    
    # Multimodal & Visual (Primary: Gemini)
    VISUAL_UNDERSTANDING = "visual_understanding"
    SCENE_INTERPRETATION = "scene_interpretation"
    SHOT_COMPARISON = "shot_comparison"
    OBJECT_ACTION_RECOGNITION = "object_action_recognition"
    VISUAL_QUALITY_ASSESSMENT = "visual_quality_assessment"
    RENDERED_VIDEO_REVIEW = "rendered_video_review"


class Provider(str, Enum):
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    OPENAI_COMPAT = "openai_compat"
    HEURISTIC_FALLBACK = "heuristic_fallback"


class ProviderRoute(BaseModel):
    capability: ModelCapability
    primary_provider: Provider
    fallback_provider: Provider
    model_name: str
    description: str


CAPABILITY_MATRIX: Dict[ModelCapability, ProviderRoute] = {
    ModelCapability.CREATIVE_DIRECTION: ProviderRoute(
        capability=ModelCapability.CREATIVE_DIRECTION,
        primary_provider=Provider.ANTHROPIC,
        fallback_provider=Provider.GEMINI,
        model_name="claude-3-7-sonnet-20250219",
        description="High-level angle, creative brief interpretation, and editorial vision",
    ),
    ModelCapability.STORYTELLING: ProviderRoute(
        capability=ModelCapability.STORYTELLING,
        primary_provider=Provider.ANTHROPIC,
        fallback_provider=Provider.GEMINI,
        model_name="claude-3-7-sonnet-20250219",
        description="Narrative arc, emotional beats, and tension/payoff structure",
    ),
    ModelCapability.EDITORIAL_REASONING: ProviderRoute(
        capability=ModelCapability.EDITORIAL_REASONING,
        primary_provider=Provider.ANTHROPIC,
        fallback_provider=Provider.GEMINI,
        model_name="claude-3-7-sonnet-20250219",
        description="Pacing calculations, speech cadence alignment, and dead air cuts",
    ),
    ModelCapability.TIMELINE_PLANNING: ProviderRoute(
        capability=ModelCapability.TIMELINE_PLANNING,
        primary_provider=Provider.ANTHROPIC,
        fallback_provider=Provider.GEMINI,
        model_name="claude-3-7-sonnet-20250219",
        description="Translating story beats to frame-accurate EditPlan sequences",
    ),
    ModelCapability.REVISION_REASONING: ProviderRoute(
        capability=ModelCapability.REVISION_REASONING,
        primary_provider=Provider.ANTHROPIC,
        fallback_provider=Provider.GEMINI,
        model_name="claude-3-7-sonnet-20250219",
        description="Diagnosing review defects and formulating targeted EditorialPatches",
    ),
    ModelCapability.VISUAL_UNDERSTANDING: ProviderRoute(
        capability=ModelCapability.VISUAL_UNDERSTANDING,
        primary_provider=Provider.GEMINI,
        fallback_provider=Provider.ANTHROPIC,
        model_name="gemini-2.5-flash",
        description="Frame and scene comprehension, camera movement, composition analysis",
    ),
    ModelCapability.SCENE_INTERPRETATION: ProviderRoute(
        capability=ModelCapability.SCENE_INTERPRETATION,
        primary_provider=Provider.GEMINI,
        fallback_provider=Provider.HEURISTIC_FALLBACK,
        model_name="gemini-2.5-flash",
        description="Semantic quote extraction, emotional tone, and action tagging from raw video",
    ),
    ModelCapability.SHOT_COMPARISON: ProviderRoute(
        capability=ModelCapability.SHOT_COMPARISON,
        primary_provider=Provider.GEMINI,
        fallback_provider=Provider.ANTHROPIC,
        model_name="gemini-2.5-flash",
        description="Comparing alternative b-roll clips to select the highest-interest frame",
    ),
    ModelCapability.OBJECT_ACTION_RECOGNITION: ProviderRoute(
        capability=ModelCapability.OBJECT_ACTION_RECOGNITION,
        primary_provider=Provider.GEMINI,
        fallback_provider=Provider.HEURISTIC_FALLBACK,
        model_name="gemini-2.5-flash",
        description="Detecting product interactions, gestures, and screen UI elements",
    ),
    ModelCapability.VISUAL_QUALITY_ASSESSMENT: ProviderRoute(
        capability=ModelCapability.VISUAL_QUALITY_ASSESSMENT,
        primary_provider=Provider.GEMINI,
        fallback_provider=Provider.HEURISTIC_FALLBACK,
        model_name="gemini-2.5-flash",
        description="Lighting quality, focus, shake, and aesthetic grading evaluation",
    ),
    ModelCapability.RENDERED_VIDEO_REVIEW: ProviderRoute(
        capability=ModelCapability.RENDERED_VIDEO_REVIEW,
        primary_provider=Provider.GEMINI,
        fallback_provider=Provider.ANTHROPIC,
        model_name="gemini-2.5-flash",
        description="Watching the rendered MP4 artifact and scoring adherence, pacing, and quality",
    ),
}


class CapabilityAIRouter:
    """Manages model availability, capability dispatch, and fallback resilience."""
    
    def __init__(self):
        self._provider_status = self._probe_providers()

    def _probe_providers(self) -> Dict[Provider, bool]:
        """Check live environment keys to establish operational provider readiness."""
        has_anthropic = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY"))
        has_gemini = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        has_openai = bool(os.environ.get("OPENAI_API_KEY"))

        return {
            Provider.ANTHROPIC: has_anthropic,
            Provider.GEMINI: has_gemini,
            Provider.OPENAI_COMPAT: has_openai,
            Provider.HEURISTIC_FALLBACK: True,
        }

    def get_status(self) -> Dict[str, Any]:
        """Return operational diagnostic status of the router."""
        self._provider_status = self._probe_providers()
        return {
            "providers": {k.value: v for k, v in self._provider_status.items()},
            "routes": {
                k.value: {
                    "primary": v.primary_provider.value,
                    "fallback": v.fallback_provider.value,
                    "model": v.model_name,
                    "active": self.resolve_active_provider(k).value,
                }
                for k, v in CAPABILITY_MATRIX.items()
            },
        }

    def resolve_active_provider(self, capability: ModelCapability) -> Provider:
        """Resolve which provider will execute the capability based on live key availability."""
        route = CAPABILITY_MATRIX.get(capability)
        if not route:
            return Provider.HEURISTIC_FALLBACK

        # 1. Try Primary
        if self._provider_status.get(route.primary_provider, False):
            return route.primary_provider

        # 2. Try Fallback
        if self._provider_status.get(route.fallback_provider, False):
            log.warning(
                "Primary provider %s unavailable for %s; routing to fallback %s",
                route.primary_provider.value,
                capability.value,
                route.fallback_provider.value,
            )
            return route.fallback_provider

        # 3. Degrade to Heuristic Fallback
        return Provider.HEURISTIC_FALLBACK

    def dispatch(
        self,
        capability: ModelCapability,
        execute_anthropic: Optional[Callable[..., Any]] = None,
        execute_gemini: Optional[Callable[..., Any]] = None,
        execute_fallback: Optional[Callable[..., Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """Dispatch a task to the appropriate capability handler with automatic fallback."""
        active = self.resolve_active_provider(capability)

        if active == Provider.ANTHROPIC and execute_anthropic:
            try:
                return execute_anthropic(**kwargs)
            except Exception as e:
                log.error("Anthropic execution failed for %s: %s. Attempting fallback.", capability.value, e)
                if execute_gemini and self._provider_status.get(Provider.GEMINI):
                    return execute_gemini(**kwargs)

        elif active == Provider.GEMINI and execute_gemini:
            try:
                return execute_gemini(**kwargs)
            except Exception as e:
                log.error("Gemini execution failed for %s: %s. Attempting fallback.", capability.value, e)
                if execute_anthropic and self._provider_status.get(Provider.ANTHROPIC):
                    return execute_anthropic(**kwargs)

        # Fallback path
        if execute_fallback:
            return execute_fallback(**kwargs)

        raise RuntimeError(f"No executable provider available for capability: {capability.value}")


# Global singleton instance
router = CapabilityAIRouter()
