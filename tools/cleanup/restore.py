"""Restore everything from the quarantine back into the project, by relative path.

Does not depend on the undo logs (one of them was overwritten by a same-minute run).
The quarantine mirrors the project's folder structure, so the relative path IS the
original location. Restores at the highest level possible, so a moved node_modules
comes back as one rename rather than 400k of them.

    python cleanup/restore.py              # dry run
    python cleanup/restore.py --go         # actually restore
"""
import argparse
import os
import shutil

ap = argparse.ArgumentParser()
ap.add_argument('--root', default=r'J:\ai editor')
ap.add_argument('--quarantine', default=r'J:\_cleanup_quarantine')
ap.add_argument('--stamp', default=None, help='restore only this run folder')
ap.add_argument('--go', action='store_true')
a = ap.parse_args()

moved = conflicts = 0
moved_bytes = 0
conflict_list = []


def size_of(p):
    if os.path.isfile(p):
        try:
            return os.path.getsize(p)
        except OSError:
            return 0
    t = 0
    for dp, dn, fn in os.walk(p):
        for f in fn:
            try:
                t += os.path.getsize(os.path.join(dp, f))
            except OSError:
                pass
    return t


def restore(src_dir, dst_dir):
    """Move children of src_dir into dst_dir, descending only where needed."""
    global moved, conflicts, moved_bytes
    for name in os.listdir(src_dir):
        src = os.path.join(src_dir, name)
        dst = os.path.join(dst_dir, name)
        if not os.path.exists(dst):
            if a.go:
                os.makedirs(dst_dir, exist_ok=True)
                shutil.move(src, dst)
            moved_bytes += size_of(src) if not a.go else 0
            moved += 1
        elif os.path.isdir(src) and os.path.isdir(dst):
            restore(src, dst)
        else:
            conflicts += 1
            if len(conflict_list) < 20:
                conflict_list.append(dst)


stamps = [a.stamp] if a.stamp else sorted(os.listdir(a.quarantine))
for s in stamps:
    base = os.path.join(a.quarantine, s)
    if not os.path.isdir(base):
        continue
    print(f'restoring {s} ...')
    restore(base, a.root)

print(f'\n{"WOULD RESTORE" if not a.go else "RESTORED"}: {moved} top-level items')
if moved_bytes:
    print(f'approx {moved_bytes/1e9:.2f} GB')
print(f'conflicts (destination already exists, skipped): {conflicts}')
for c in conflict_list:
    print('  ' + c)
if not a.go:
    print('\nDry run. Add --go to restore.')
