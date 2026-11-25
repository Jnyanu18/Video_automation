"""Apply cleanup/manifest.csv by MOVING items to a quarantine folder. Never deletes.

    python cleanup/apply.py                      # dry run - prints what would move
    python cleanup/apply.py --go                 # move every MOVE row
    python cleanup/apply.py --go --only BUILD    # move one category only (repeatable)
    python cleanup/apply.py --go --include-review   # also move REVIEW rows (think first)
    python cleanup/apply.py --undo cleanup/undo-20261118-2010.csv   # put it all back

Quarantine lives on the same drive as the project, so moves are instant renames and
cost no extra disk. Delete the quarantine folder by hand once you are satisfied -
that is the only step that actually frees the space, and it is yours to take.
"""
import argparse
import csv
import os
import shutil
import sys
from datetime import datetime

ap = argparse.ArgumentParser()
ap.add_argument('--root', default=r'J:\ai editor')
ap.add_argument('--manifest', default=None)
ap.add_argument('--quarantine', default=None)
ap.add_argument('--go', action='store_true', help='actually move (default is a dry run)')
ap.add_argument('--only', action='append', default=None, help='limit to a category')
ap.add_argument('--include-review', action='store_true')
ap.add_argument('--exclude-path', action='append', default=None,
                help='skip any item whose path contains this text (repeatable). '
                     'Use it to protect a project you are actively building.')
ap.add_argument('--undo', default=None, help='an undo csv to reverse')
a = ap.parse_args()

root = os.path.abspath(a.root)
manifest = a.manifest or os.path.join(root, 'cleanup', 'manifest.csv')
# Seconds, not minutes: two runs inside one minute previously shared a quarantine
# folder, and the second run's undo log overwrote the first's, orphaning its files.
stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
quarantine = a.quarantine or os.path.join(os.path.splitdrive(root)[0] + os.sep,
                                          '_cleanup_quarantine', stamp)


def human(b):
    return f'{b/1e9:.2f} GB' if b >= 1e9 else f'{b/1e6:.0f} MB'


def undo(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8')))
    done = 0
    for r in reversed(rows):
        src, dst = r['moved_to'], r['original']
        if not os.path.exists(src):
            print(f'  missing, skipped: {src}')
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)
        done += 1
    print(f'restored {done} of {len(rows)} items')


if a.undo:
    undo(a.undo)
    sys.exit(0)

if not os.path.exists(manifest):
    sys.exit(f'No manifest at {manifest}. Run: python cleanup/scan.py')

rows = list(csv.DictReader(open(manifest, encoding='utf-8')))
wanted = {'MOVE'} | ({'REVIEW'} if a.include_review else set())
sel = [r for r in rows if r['action'].strip().upper() in wanted]
if a.only:
    cats = {c.upper() for c in a.only}
    sel = [r for r in sel if r['category'].strip().upper() in cats]

if a.exclude_path:
    pats = [p.lower() for p in a.exclude_path]
    kept = [r for r in sel if any(p in r['path'].lower() for p in pats)]
    sel = [r for r in sel if not any(p in r['path'].lower() for p in pats)]
    print(f'protected by --exclude-path: {len(kept)} items, '
          f'{sum(int(r["bytes"]) for r in kept)/1e9:.2f} GB\n')

if not sel:
    sys.exit('Nothing selected. Check the action/category columns in the manifest.')

total = sum(int(r['bytes']) for r in sel)
by_cat = {}
for r in sel:
    c = by_cat.setdefault(r['category'], [0, 0])
    c[0] += int(r['bytes'])
    c[1] += 1

print(f'{"DRY RUN - nothing will move" if not a.go else "MOVING"}')
print(f'project   : {root}')
print(f'quarantine: {quarantine}')
print(f'selected  : {len(sel)} items, {human(total)}\n')
for cat, (b, n) in sorted(by_cat.items(), key=lambda kv: -kv[1][0]):
    print(f'  {cat:11} {human(b):>10}  {n} items')

same_drive = os.path.splitdrive(root)[0].lower() == os.path.splitdrive(quarantine)[0].lower()
if not same_drive:
    print('\nWARNING: quarantine is on a different drive, so this copies rather than renames.')

if not a.go:
    print('\nThis was a dry run. Add --go to move.')
    sys.exit(0)

undo_path = os.path.join(root, 'cleanup', f'undo-{stamp}.csv')
os.makedirs(os.path.dirname(undo_path), exist_ok=True)
if os.path.exists(undo_path) or os.path.exists(quarantine):
    sys.exit(f'Refusing to run: {undo_path} or {quarantine} already exists. '
             'Overwriting an undo log orphans the files it describes.')
moved = failed = 0
moved_bytes = 0
with open(undo_path, 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['original', 'moved_to', 'category', 'bytes'])
    for r in sel:
        src = os.path.join(root, r['path'])
        dst = os.path.join(quarantine, r['path'])
        if not os.path.exists(src):
            continue
        try:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.move(src, dst)
            w.writerow([src, dst, r['category'], r['bytes']])
            moved += 1
            moved_bytes += int(r['bytes'])
        except Exception as e:                      # noqa: BLE001 - report, keep going
            print(f'  FAILED {r["path"]}: {e}')
            failed += 1

print(f'\nmoved {moved} items ({human(moved_bytes)}), {failed} failed')
print(f'undo log: {undo_path}')
print(f'restore with: python cleanup/apply.py --undo "{undo_path}"')
print('\nNothing is deleted yet. The space is freed only when you delete')
print(f'  {quarantine}')
