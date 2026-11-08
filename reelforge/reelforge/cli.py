"""Command line interface for ReelForge."""
from __future__ import annotations

import argparse
import sys
import webbrowser

def main():
    parser = argparse.ArgumentParser(
        prog="reelforge",
        description="ReelForge: Local AI Video Editor (Claude Desktop-style workflow)"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: start
    start_parser = subparsers.add_parser("start", help="Start the ReelForge local studio server")
    start_parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    start_parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    start_parser.add_argument("--workspace", default=None, help="Custom workspace folder path")
    start_parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")

    # Command: doctor
    subparsers.add_parser("doctor", help="Check local dependencies (FFmpeg, yt-dlp, Whisper, HyperFrames)")

    # Command: install
    install_parser = subparsers.add_parser("install", help="Install required local tools")
    install_parser.add_argument("-y", "--yes", action="store_true", help="Confirm installation without prompting")

    args = parser.parse_args()

    if args.command == "doctor":
        from .doctor import run_doctor
        doc = run_doctor()
        print("\n" + "=" * 55)
        print("          REELFORGE SYSTEM DOCTOR")
        print("=" * 55)
        for t in doc["tools"]:
            status = "✓ OK" if t["ok"] else "✗ MISSING"
            print(f"[{status:9s}] {t['name']}")
            if not t["ok"] and t.get("fix_command"):
                print(f"            Fix: {t['fix_command']}")
        print("=" * 55)
        print(f"Summary: {doc['summary']}\n")
        sys.exit(0 if doc["ok"] else 1)

    elif args.command == "install":
        from .installer import ToolInstaller
        plan = ToolInstaller.plan()
        if not plan["needed"]:
            print("All ReelForge tools are already installed and up to date!")
            sys.exit(0)

        print("\nReelForge requires the following tools:")
        for t in plan["needed"]:
            print(f" - {t}")
        print("\nPlanned commands:")
        for c in plan["commands"]:
            print(f" $ {c}")

        if not args.yes:
            confirm = input("\nProceed with installation? [y/N]: ").strip().lower()
            if confirm not in ["y", "yes"]:
                print("Installation aborted.")
                sys.exit(0)

        res = ToolInstaller.execute(confirm=True)
        print(f"Installation completed: {res['executed_commands']} commands executed.")
        sys.exit(0)

    elif args.command == "start" or args.command is None:
        import uvicorn
        from .server.app import state
        if getattr(args, "workspace", None):
            state.set_workspace(args.workspace)

        port = getattr(args, "port", 8000)
        host = getattr(args, "host", "127.0.0.1")
        url = f"http://{host}:{port}"

        print("\n" + "=" * 60)
        print("  ⚡ REELFORGE LOCAL AI VIDEO EDITOR")
        print(f"  URL:       {url}")
        print(f"  Workspace: {state.workspace_mgr.root}")
        print("=" * 60 + "\n")

        if not getattr(args, "no_browser", False):
            try:
                webbrowser.open(url)
            except Exception:
                pass

        uvicorn.run("reelforge.server.app:app", host=host, port=port, log_level="info")

if __name__ == "__main__":
    main()
