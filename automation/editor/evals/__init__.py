"""Eval harness (agent H): automatic quality checks for an EditPlan against its source video."""
from .checks import evaluate, render_scorecard
from .golden import run_golden, baseline_plan

__all__ = ["evaluate", "render_scorecard", "run_golden", "baseline_plan"]
