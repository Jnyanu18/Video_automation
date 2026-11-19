"""Build the Claude tool list from the TOOLS dicts exported by other agents."""
from __future__ import annotations

import importlib
import logging
from typing import Dict

log = logging.getLogger("agent.registry")

TOOL_MODULES = ("tools.analysis", "tools.edit", "tools.effects", "tools.audio", "styles", "tools.visuals", "services.render")


def load_toolspecs(modules=TOOL_MODULES) -> Dict[str, dict]:
    """Lazily import each module and merge its TOOLS dict. Missing modules are skipped."""
    out: Dict[str, dict] = {}
    for name in modules:
        try:
            mod = importlib.import_module(name)
        except Exception as e:  # ImportError or a broken module: skip, never crash the agent
            log.info("tool module %s unavailable: %s", name, e)
            continue
        tools = getattr(mod, "TOOLS", None)
        if not isinstance(tools, dict):
            log.info("tool module %s has no TOOLS dict", name)
            continue
        for tname, spec in tools.items():
            if isinstance(spec, dict) and callable(spec.get("fn")):
                out[tname] = spec
    return out


def to_anthropic_tools(specs: Dict[str, dict]) -> list:
    return [
        {
            "name": name,
            "description": spec.get("description", name),
            "input_schema": spec.get("input_schema") or {"type": "object", "properties": {}},
        }
        for name, spec in specs.items()
    ]
