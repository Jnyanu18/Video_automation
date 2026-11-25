"""Read-only cleanup scanner for the AI-editor workspace.

Writes cleanup/manifest.csv (one row per item, with a proposed action and the reason)
and cleanup/summary.txt (a human-readable digest). DELETES NOTHING. MOVES NOTHING.

    python cleanup/scan.py                  # scan J:\\ai editor
    python cleanup/scan.py --root "D:\\x"    # scan somewhere else

Actions in the manifest:
    MOVE    regenerable or redundant - safe to quarantine
    REVIEW  media that matched no rule - a human decides
    KEEP    source code, docs, fonts, and irreplaceable source media
"""
import argparse
import csv
import os
import re
import stat as statmod
from datetime import datetime


def is_reparse(path):
    """True for a Windows junction or symlink.

    os.path.islink() returns False for directory junctions, so walking blindly
    descends through them and counts the target twice - and can then classify the
    real files as a 'duplicate' of themselves. Only the reparse attribute is safe.
    """
    try:
        return bool(os.lstat(path).st_file_attributes & statmod.FILE_ATTRIBUTE_REPARSE_POINT)
    except (OSError, AttributeError):
        return False

# A film named after a brand or campaign is a deliverable; one named by hash or
# by a pipeline word is an intermediate.
HASH_NAME = re.compile(r'^[0-9a-f]{12,}$')
GENERIC_NAME = {'film', 'preview', 'cut', 'final', 'final_cut', 'finalcut', 'verify', 'output',
                'out', 'render', 'temp', 'tmp', 'test', 'sample', 'draft', 'wip', 'untitled'}
FINAL_PARENTS = {'out', 'out2', 'renders', 'render', 'output', 'outputs', 'final', 'finals',
                 'deliverables', 'masters'}

VIDEO = {'.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.wmv', '.flv', '.mpg', '.mpeg', '.mxf'}
AUDIO = {'.wav', '.mp3', '.aac', '.m4a', '.flac', '.ogg'}
IMAGE = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.tif', '.tiff', '.bmp', '.psd', '.ai', '.svg'}
FONT = {'.woff', '.woff2', '.ttf', '.otf'}
CODE = {'.py', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.html',
        '.css', '.scss', '.sh', '.ps1', '.bat', '.yml', '.yaml', '.toml', '.ini', '.cfg',
        '.env', '.lock', '.gitignore', '.sql'}
MEDIA = VIDEO | AUDIO | IMAGE

# Whole directories that are regenerable. Recorded as one row each, not per file.
BUILD_DIRS = {'node_modules', '.bundle', '__pycache__', '.next', '.nuxt', '.turbo', '.cache',
              '.pytest_cache', '.mypy_cache', '.parcel-cache', 'dist', 'build', '.venv', 'venv'}

# Path segments whose MEDIA is rendered output: regenerable by re-running the project.
RENDER_SEGS = {'out', 'output', 'outputs', 'render', 'renders', 'rendered', 'export', 'exports',
               'exported_ads', 'work', 'preview', 'previews', 'stills', 'frames', 'tmp', 'temp',
               '.data', 'proxies'}

# Path segments holding irreplaceable source material. Never auto-moved.
SOURCE_SEGS = {'raw footage', 'uploads', 'upload', 'assets', 'asset', 'clients', 'client',
               'public', 'brand', 'logos', 'footage', 'source', 'sources', 'originals'}

# Path segments that mark collected reference material.
REFERENCE_HINTS = ('reference', 'references', 'refs', 'inspiration', 'moodboard', 'scrape')


def segs(rel):
    return [p.lower() for p in rel.replace('/', os.sep).split(os.sep)]


def dirsize(path):
    n = b = 0
    for dp, dn, fn in os.walk(path):
        for f in fn:
            try:
                b += os.path.getsize(os.path.join(dp, f))
                n += 1
            except OSError:
                pass
    return n, b


def classify(rel, ext, size):
    """Return (action, category, reason)."""
    s = segs(rel)
    parents = s[:-1]

    # NOTE: there is deliberately no "duplicate" rule here.
    # An earlier version flagged a folder nested inside a same-named folder as a
    # stray copy. In this workspace that pattern is the REAL location of the code
    # (J:\ai editor\automation is a junction pointing into it), and because the rule
    # ran before the source-code check it selected 1,624 files of live engine source.
    # Identical-looking paths are the junction, not a copy. Never infer duplication
    # from a path shape; compare file identity if you ever need this.

    if ext in CODE or ext in FONT:
        return 'KEEP', 'CODE', 'source code, config, docs or font'

    if ext not in MEDIA:
        if size > 50 * 1024 * 1024:
            return 'REVIEW', 'BIG-OTHER', f'unrecognised file over 50 MB ({ext or "no extension"})'
        return 'KEEP', 'OTHER', 'small non-media file'

    kind = 'video' if ext in VIDEO else 'audio' if ext in AUDIO else 'image'
    stem = os.path.splitext(os.path.basename(rel))[0].lower()
    parent = parents[-1] if parents else ''

    # A named film sitting in an output folder is a finished deliverable, not scratch.
    if (ext in VIDEO and parent in FINAL_PARENTS
            and not HASH_NAME.match(stem) and stem not in GENERIC_NAME):
        return 'REVIEW', 'DELIVERABLE', f'named film in "{parent}" - looks like a finished cut'

    # Cloned third-party repos: their media is test data the repo needs.
    for p in parents:
        if '__' in p or p in ('vendor', 'third_party', 'thirdparty'):
            return 'REVIEW', 'VENDOR', f'{kind} inside third-party clone "{p}" - re-clonable'

    for p in parents:
        if any(h in p for h in REFERENCE_HINTS):
            return 'MOVE', 'REFERENCE', f'{kind} inside reference folder "{p}"'

    for p in parents:
        if p in SOURCE_SEGS:
            return 'KEEP', 'SOURCE', f'{kind} inside source folder "{p}" - not regenerable'

    for p in parents:
        if p in RENDER_SEGS:
            return 'MOVE', 'RENDER', f'{kind} inside output folder "{p}" - re-renders from code'

    return 'REVIEW', 'UNSORTED', f'{kind} matching no rule'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=r'J:\ai editor')
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    here = os.path.join(root, 'cleanup')
    os.makedirs(here, exist_ok=True)

    rows = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        if rel_dir == '.':
            rel_dir = ''
        if segs(rel_dir)[0] in ('cleanup', '.git') and rel_dir:
            dirnames[:] = []
            continue

        # Never descend through a junction/symlink: it aliases a tree we already walk.
        links = [d for d in dirnames if is_reparse(os.path.join(dirpath, d))]
        for d in links:
            rows.append({
                'action': 'KEEP', 'category': 'LINK', 'kind': 'link', 'bytes': 0, 'files': 0,
                'path': os.path.relpath(os.path.join(dirpath, d), root),
                'reason': 'junction/symlink - an alias, not real bytes; never move it',
            })
        dirnames[:] = [d for d in dirnames if d not in links]

        for d in sorted(dirnames):
            if d in BUILD_DIRS:
                p = os.path.join(dirpath, d)
                n, b = dirsize(p)
                rows.append({
                    'action': 'MOVE', 'category': 'BUILD', 'kind': 'dir',
                    'bytes': b, 'files': n, 'path': os.path.relpath(p, root),
                    'reason': f'"{d}" is regenerable (npm install / rebuild)',
                })
        dirnames[:] = [d for d in dirnames if d not in BUILD_DIRS and not (
            d == '.git' or (rel_dir == '' and d == 'cleanup'))]

        for f in filenames:
            fp = os.path.join(dirpath, f)
            rel = os.path.relpath(fp, root)
            ext = os.path.splitext(f)[1].lower()
            try:
                size = os.path.getsize(fp)
            except OSError:
                continue
            action, cat, reason = classify(rel, ext, size)
            if action == 'KEEP' and cat in ('CODE', 'OTHER'):
                continue  # keep the manifest about what might move
            rows.append({'action': action, 'category': cat, 'kind': 'file',
                         'bytes': size, 'files': 1, 'path': rel, 'reason': reason})

    rows.sort(key=lambda r: -r['bytes'])
    man = os.path.join(here, 'manifest.csv')
    with open(man, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=['action', 'category', 'kind', 'bytes', 'files',
                                           'path', 'reason'])
        w.writeheader()
        w.writerows(rows)

    tot = {}
    for r in rows:
        k = (r['action'], r['category'])
        t = tot.setdefault(k, [0, 0])
        t[0] += r['bytes']
        t[1] += r['files']

    lines = [f'Cleanup scan of {root}', f'Generated {datetime.now():%Y-%m-%d %H:%M}', '',
             f'{"action":8} {"category":11} {"GB":>8} {"files":>8}', '-' * 40]
    for (act, cat), (b, n) in sorted(tot.items(), key=lambda kv: -kv[1][0]):
        lines.append(f'{act:8} {cat:11} {b/1e9:8.2f} {n:8}')
    lines.append('-' * 40)
    movable = sum(b for (act, _), (b, _) in tot.items() if act == 'MOVE')
    review = sum(b for (act, _), (b, _) in tot.items() if act == 'REVIEW')
    lines += ['', f'Reclaimable by MOVE : {movable/1e9:.2f} GB',
              f'Needs human REVIEW  : {review/1e9:.2f} GB', '',
              'Largest 30 movable / reviewable items:', '']
    for r in rows[:30]:
        lines.append(f'  {r["bytes"]/1e6:9.0f} MB  {r["action"]:6} {r["category"]:10} {r["path"]}')
    lines += ['', 'Nothing has been moved or deleted. Review manifest.csv, change any action',
              'you disagree with, then run:  python cleanup/apply.py']
    out = '\n'.join(lines)
    with open(os.path.join(here, 'summary.txt'), 'w', encoding='utf-8') as fh:
        fh.write(out + '\n')
    print(out)
    print(f'\nmanifest: {man}')


if __name__ == '__main__':
    main()
