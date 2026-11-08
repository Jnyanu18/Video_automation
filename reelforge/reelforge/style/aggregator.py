"""Hierarchical Map-Reduce Style Aggregator.
Combines any number of ReelAnalysis records (1 to 1000+) into a versioned StyleSheet.
Never blows up LLM context by using deterministic statistical aggregation + tree reduction.
"""
from __future__ import annotations

import logging
import statistics
from collections import Counter
from typing import List, Dict, Any, Optional

from ..schemas.analysis import ReelAnalysis
from ..schemas.style import StyleSheet, FontRule, CaptionRule, PacingRule, SoundRule

log = logging.getLogger("reelforge.style.aggregator")

def aggregate_numbers(values: List[float]) -> Dict[str, float]:
    """Compute median, min, max, and detect outliers without averaging them away."""
    if not values:
        return {"median": 0.0, "min": 0.0, "max": 0.0, "iqr": 0.0}
    vals = sorted(values)
    med = statistics.median(vals)
    q1 = vals[len(vals) // 4]
    q3 = vals[(len(vals) * 3) // 4]
    iqr = round(q3 - q1, 2)
    return {
        "median": round(med, 2),
        "min": round(min(vals), 2),
        "max": round(max(vals), 2),
        "iqr": iqr
    }

def most_frequent(items: List[str], default: str = "") -> str:
    if not items:
        return default
    c = Counter(items)
    return c.most_common(1)[0][0]

class StyleAggregator:
    def __init__(self, batch_size: int = 10):
        self.batch_size = batch_size

    def aggregate_batch(self, analyses: List[ReelAnalysis]) -> Dict[str, Any]:
        """Intermediate reduce step for a batch of analyses."""
        if not analyses:
            return {}

        cut_intervals = [a.avg_cut_interval for a in analyses if a.avg_cut_interval > 0]
        wpms = [a.audio.speech_wpm for a in analyses if a.audio.speech_wpm > 0]
        lufs_list = [a.audio.measured_lufs for a in analyses if a.audio.measured_lufs is not None]

        # Extract palettes
        all_colors = []
        for a in analyses:
            for p in a.palette[:3]:
                all_colors.append(p.hex)

        # Vision metrics
        font_families = [a.vision_style.font_family_estimate for a in analyses if a.vision_style.font_family_estimate]
        font_weights = [a.vision_style.font_weight for a in analyses]
        caption_positions = [a.vision_style.caption_position for a in analyses]
        transitions = [t for a in analyses for t in a.vision_style.transition_types]
        camera_motions = [m for a in analyses for m in a.vision_style.camera_motions]

        return {
            "count": len(analyses),
            "cut_intervals": cut_intervals,
            "wpms": wpms,
            "lufs": lufs_list,
            "colors": all_colors,
            "font_families": font_families,
            "font_weights": font_weights,
            "caption_positions": caption_positions,
            "transitions": transitions,
            "camera_motions": camera_motions,
        }

    def reduce(self, batch_summaries: List[Dict[str, Any]], version: int = 1, name: str = "Creator Style") -> StyleSheet:
        """Final reduce step merging all batch summaries into a master StyleSheet."""
        total_reels = sum(b.get("count", 0) for b in batch_summaries)
        if total_reels == 0:
            return StyleSheet(version=version, name=name, reels_analyzed_count=0)

        # Merge all numeric arrays
        all_cuts = [c for b in batch_summaries for c in b.get("cut_intervals", [])]
        all_wpms = [w for b in batch_summaries for w in b.get("wpms", [])]
        all_lufs = [l for b in batch_summaries for l in b.get("lufs", [])]

        cut_stats = aggregate_numbers(all_cuts)
        wpm_stats = aggregate_numbers(all_wpms)
        lufs_stats = aggregate_numbers(all_lufs)

        # Outliers check
        outliers: List[str] = []
        if cut_stats["max"] > cut_stats["median"] * 2.5:
            outliers.append(f"Cut intervals had outlier as long as {cut_stats['max']}s (median {cut_stats['median']}s)")
        if cut_stats["min"] < cut_stats["median"] * 0.4 and cut_stats["min"] > 0:
            outliers.append(f"Cut intervals had rapid cuts as fast as {cut_stats['min']}s")

        # Merge categorical
        all_colors = [c for b in batch_summaries for c in b.get("colors", [])]
        color_counts = Counter(all_colors)
        top_colors = [c[0] for c in color_counts.most_common(5)] or ["#000000", "#FFFFFF", "#FFDD00"]

        all_fonts = [f for b in batch_summaries for f in b.get("font_families", [])]
        dominant_font = most_frequent(all_fonts, default="Inter")

        all_weights = [w for b in batch_summaries for w in b.get("font_weights", [])]
        dominant_weight = most_frequent(all_weights, default="bold")

        all_positions = [p for b in batch_summaries for p in b.get("caption_positions", [])]
        dominant_pos = most_frequent(all_positions, default="middle")
        pos_y = 0.5 if dominant_pos == "middle" else (0.8 if dominant_pos == "bottom" else 0.2)

        # Confidence scores: percentage of reels agreeing on dominant features
        confidence = {
            "font_agreement": round((Counter(all_fonts).get(dominant_font, 0) / len(all_fonts)) * 100, 1) if all_fonts else 100.0,
            "weight_agreement": round((Counter(all_weights).get(dominant_weight, 0) / len(all_weights)) * 100, 1) if all_weights else 100.0,
        }

        # Build composite StyleSheet
        summary = (
            f"Style Sheet {version} aggregated from {total_reels} reference reel(s). "
            f"Median cut duration: {cut_stats['median']}s. Speech tempo: {wpm_stats['median']} WPM. "
            f"Primary font: {dominant_font} ({dominant_weight}), captions placed at {dominant_pos}."
        )

        return StyleSheet(
            version=version,
            name=name,
            fonts=FontRule(family=dominant_font, weight=dominant_weight, color_hex="#FFFFFF", stroke_color_hex="#000000", stroke_width=2),
            colors=top_colors,
            captions=CaptionRule(style="karaoke", words_per_chunk=3, highlight_color_hex=top_colors[2] if len(top_colors) > 2 else "#FFDD00", position_y=pos_y),
            pacing=PacingRule(avg_cut_interval_seconds=cut_stats["median"] or 1.8, max_pause_seconds=0.25, speech_wpm_median=wpm_stats["median"] or 160.0),
            sound=SoundRule(music_duck_db=-16.0, target_lufs=lufs_stats["median"] or -14.0),
            summary=summary,
            reels_analyzed_count=total_reels,
            outliers_noted=outliers,
            confidence_scores=confidence,
        )

    def build_from_analyses(self, analyses: List[ReelAnalysis], version: int = 1, name: str = "Creator Style") -> StyleSheet:
        """Map-reduce entry point: partitions analyses into batches of size K, then reduces."""
        if not analyses:
            return StyleSheet(version=version, name=name, reels_analyzed_count=0)

        # Partition into batches of K
        batches = [analyses[i:i + self.batch_size] for i in range(0, len(analyses), self.batch_size)]
        batch_summaries = [self.aggregate_batch(b) for b in batches]
        return self.reduce(batch_summaries, version=version, name=name)

def aggregate_styles(analyses: List[ReelAnalysis], version: int = 1, name: str = "Creator Style", batch_size: int = 10) -> StyleSheet:
    """Convenience function to aggregate styles via Map-Reduce."""
    agg = StyleAggregator(batch_size=batch_size)
    return agg.build_from_analyses(analyses, version=version, name=name)

