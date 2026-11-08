"""One-message tool installer for ReelForge.
Follows strict rule: Asks/requires confirmation before executing shell installation commands.
"""
from __future__ import annotations

import logging
import subprocess
import sys
from typing import Dict, Any, List, Optional
from .doctor import run_doctor

log = logging.getLogger("reelforge.installer")

class ToolInstaller:
    @staticmethod
    def plan() -> Dict[str, Any]:
        """Inspect the system and return the proposed installation commands."""
        doc = run_doctor()
        commands_to_run = []
        for t in doc["tools"]:
            if not t["installed"] and t.get("fix_command"):
                commands_to_run.append({
                    "tool": t["name"],
                    "command": t["fix_command"],
                    "notes": t.get("notes", "")
                })
        return {
            "needed": len(commands_to_run) > 0,
            "commands": commands_to_run,
            "count": len(commands_to_run),
            "doctor": doc
        }

    @staticmethod
    def execute(confirm: bool = False, on_progress: Optional[callable] = None) -> Dict[str, Any]:
        """Execute missing tool installation. Fails if confirm is False."""
        plan = ToolInstaller.plan()
        if not plan["needed"]:
            return {"ok": True, "message": "All required tools are already installed.", "results": []}

        if not confirm:
            return {
                "ok": False,
                "needs_confirmation": True,
                "message": "Confirmation required before running installation commands.",
                "planned_commands": plan["commands"]
            }

        results = []
        for step in plan["commands"]:
            cmd = step["command"]
            tool = step["tool"]
            log.info("Running tool install for %s: %s", tool, cmd)
            if on_progress:
                on_progress(f"Installing {tool} via `{cmd}`...")

            try:
                # Run the command with timeout
                r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
                success = r.returncode == 0
                results.append({
                    "tool": tool,
                    "command": cmd,
                    "success": success,
                    "stdout": r.stdout[-500:] if r.stdout else "",
                    "stderr": r.stderr[-500:] if r.stderr else ""
                })
            except Exception as e:
                log.error("Installation of %s failed: %s", tool, e)
                results.append({
                    "tool": tool,
                    "command": cmd,
                    "success": False,
                    "error": str(e)
                })

        # Post-install re-check
        post_doctor = run_doctor()
        return {
            "ok": post_doctor["ok"],
            "results": results,
            "doctor": post_doctor
        }
