#!/bin/bash
# Whole-clip cut-out for one film: public/proxy-1440.mp4 (from build_spine.py) -> public/matte/m0-1440.webm.
# The proxy is already cut and sped like the output, so the matte plays 1:1 with the EDL. Re-run after every spine
# rebuild (the old 720 work files are deleted first so a stale matte is never reused).
# usage: scripts/matte_clip.sh <film-dir>
set -e; F=$1; HERE=$(cd "$(dirname "$0")" && pwd)
rm -rf "$F/source/_matte"
"$HERE/matte.sh" "$F/public/proxy-1440.mp4" "$F/public/matte/m0-1440.webm" "$F/source/_matte"
