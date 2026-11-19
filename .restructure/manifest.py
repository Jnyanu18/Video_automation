"""Record every file under the project: path, size, mtime. Junction-aware.

The `automation` entry at the root is a Windows directory junction into the nested
real folder. os.path.islink() returns False for junctions, so we test the reparse
point bit instead -- walking into it double-counts the whole engine.

    python .restructure/manifest.py <out.csv>
"""
import csv
import os
import stat
import sys
from datetime import datetime

ROOT = r"J:\ai editor"
SKIP_DIRS = {"node_modules", "__pycache__", ".pytest_cache", ".git", "_cleanup_quarantine"}


def is_reparse(path):
    try:
        return bool(os.lstat(path).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)
    except (OSError, AttributeError):
        return False


def main(out_path):
    rows = 0
    total = 0
    links = []
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["relpath", "bytes", "mtime"])
        for dirpath, dirnames, filenames in os.walk(ROOT):
            keep = []
            for d in dirnames:
                full = os.path.join(dirpath, d)
                if d in SKIP_DIRS:
                    continue
                if is_reparse(full):
                    links.append(os.path.relpath(full, ROOT))
                    continue
                keep.append(d)
            dirnames[:] = keep
            for f in filenames:
                full = os.path.join(dirpath, f)
                try:
                    st = os.stat(full)
                except OSError:
                    continue
                w.writerow([os.path.relpath(full, ROOT), st.st_size, int(st.st_mtime)])
                rows += 1
                total += st.st_size
    print(f"files      : {rows}")
    print(f"total      : {total/1e9:.2f} GB")
    print(f"junctions  : {links}")
    print(f"written    : {out_path}")
    print(f"taken      : {datetime.now():%Y-%m-%d %H:%M}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".restructure", "baseline.csv"))
