#!/bin/bash
# Remotion leaves an asset cache (remotion-v4*-assets*) and a webpack bundle (remotion-webpack-bundle-*) in the system
# temp folder for EVERY render, still and bundle. On 2026-10-24 they filled the system disk to 0 bytes (~89 GB) mid-batch.
# Deletes the ones older than N minutes (default 30, so a render running in parallel keeps its own). Run after each render.
# usage: scripts/prune_remotion_cache.sh [minutes]
MIN=${1:-30}
for d in "$TEMP" "$TMP" "$TMPDIR" "${LOCALAPPDATA:+$LOCALAPPDATA/Temp}" /tmp; do
  [ -n "$d" ] && [ -d "$d" ] || continue
  find "$d" -maxdepth 1 -type d \( -name "remotion-v4*-assets*" -o -name "remotion-webpack-bundle-*" \) -mmin +$MIN -print -exec rm -rf {} + 2>/dev/null || true
done
df -h . 2>/dev/null | tail -1
