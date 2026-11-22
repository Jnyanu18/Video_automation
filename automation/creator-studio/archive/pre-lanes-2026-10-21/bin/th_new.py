"""Start a talking-head video: python bin/th_new.py <slug> "Working title" [--brand personal|agency] [--like <slug>]

Makes videos/<slug>/ with everything the talking-head lane needs. Safe on an existing folder: it only
adds what is missing and never overwrites. --like copies format.md and the Settings of edit.md from a
video that worked, so its format can be repeated.
"""
import argparse
import re
from common import VIDEOS

BRANDS = {
    "personal": {"name": "Vishnu", "line": "building AskVerb in public", "url": "askverb.com"},
    "agency": {"name": "Auralion Labs", "line": "building in public", "url": "auralionlabs.com"},
}

CHECKS = """# Checks: {title}

Talking-head lane. Tick a stage (change [ ] to [x]) only after watching or reading its file. A stage
does not run until the one before it is ticked.

- [ ] 0 Brief: brief.md, with at least one of purple-cow or story-loops
- [ ] 1 Script: script.md, read aloud once
- [ ] 2 Raw: ingest.md, every take is there, sound is clean
- [ ] 3 Words: transcript.md
- [ ] 4 Cut: work/cut.mp4 watched in full, cuts.md as wanted
- [ ] 5 Edit: work/preview.mp4 and work/contact-sheet.png
- [ ] 6 Render: out/, title and thumbnail picked
"""

BRIEF = """# Brief: {title}

- **Brand:** {brand}
- **Who it is for:**
- **The one point:**
- **Purple cow:** (skill: purple-cow) one sentence; shows at: first frame and first words; pays off at:
- **Loops:** (skill: story-loops) A+ ... / A- ...
- **Shape and length:**
- **Real numbers, and where each comes from:**
- **The question it ends on:**

At least one of purple-cow or story-loops is used. Write "not used" for the other.
"""

SCRIPT = """# {title}

<!-- Read to camera, one take per paragraph; repeat a paragraph as often as you like, the cut step
keeps the last take. Loop markers like <!-- A+ --> are comments and are never spoken. No em dashes. -->

"""

EDIT = """# Edit plan: {title}

<!-- Written with Claude after the cut is approved. Times come from the words, so a beat stays on its
word even if the cut changes. Run: python bin/th_plan.py {slug} -->

## Settings
brand: {brand}
captions: on
lower-third: {name} | {line}
music: off
end-card: {question} | {url}

## Beats
<!-- One per line, in the order they happen. The quoted words are where it starts.
- zoom "words" 1.12 1.6            scale, seconds
- text "words" | Line on screen | words on gold
- stat "words" 2,500+ | users
- broll "words" broll/file.mp4 2.5 [pip]
-->
"""

POSTS = """# Posts: {title}

<!-- Written with Claude after the render is approved, using the `captions` skill. One section per
platform. Fill the Posted table once it is live, then the results table in format.md. -->

Brand: {brand}
Series line:
Facts used (each with its source):

## X

Reply:

## Instagram

Cover text:

## YouTube Short

Title:
Description:
Pinned comment:

## YouTube long form

(only for a long video)

## LinkedIn

## Posted

| Platform | Date | Link |
| --- | --- | --- |
"""

FORMAT = """# Format: {title}

<!-- If this video does well, start the next one with: python bin/th_new.py <new-slug> "Title" --like {slug} -->

- Brand: {brand}
- Lane: talking head
- Purple cow:
- Loops:
- Hook, first 3 seconds:
- Length:

<!-- auto:edit -->
(filled in by th_render.py)
<!-- /auto:edit -->

## Results (fill in at 48 hours and at 7 days)

| Platform | Posted | Views 48h | Views 7d | Average watched | Comments | Follows | Sign-ups that named it |
| --- | --- | --- | --- | --- | --- | --- | --- |
"""


def write_missing(path, text):
    if not path.exists():
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("title")
    ap.add_argument("--brand", choices=list(BRANDS), default="personal")
    ap.add_argument("--like", help="slug of an earlier video whose format to repeat")
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", a.slug):
        raise SystemExit("The slug is lowercase letters, digits and dashes only.")
    d = VIDEOS / a.slug
    for sub in ("raw", "broll", "work", "out"):
        (d / sub).mkdir(parents=True, exist_ok=True)
    b = BRANDS[a.brand]
    v = {"title": a.title, "slug": a.slug, "brand": a.brand, "name": b["name"], "line": b["line"],
         "url": b["url"], "question": "Follow along and see if it works."}
    made = []
    for name, text in (("CHECKS.md", CHECKS), ("brief.md", BRIEF), ("script.md", SCRIPT), ("edit.md", EDIT),
                       ("format.md", FORMAT), ("posts.md", POSTS)):
        if write_missing(d / name, text.format(**v)):
            made.append(name)
    write_missing(d / "raw" / "PUT-TAKES-HERE.txt",
                  "Drop the phone videos here (mp4, mov, mkv, webm). They are used in name order, so name\n"
                  "them 01.mp4, 02.mp4 and so on if there is more than one. Then: python bin/th_ingest.py "
                  f"{a.slug}\n")
    write_missing(d / "broll" / "LICENCES.md",
                  "# B-roll licences\n\nOne line per clip: file, where it came from, the licence. Your own "
                  "screen recordings: write \"own recording\".\n")

    if a.like:
        src = VIDEOS / a.like
        if not (src / "format.md").exists():
            raise SystemExit(f"videos/{a.like}/format.md not found.")
        fmt = (src / "format.md").read_text(encoding="utf-8")
        (d / "format.md").write_text(f"<!-- Started from the format of {a.like}. -->\n" + fmt, encoding="utf-8")
        old = (src / "edit.md").read_text(encoding="utf-8") if (src / "edit.md").exists() else ""
        settings = re.search(r"## Settings\n(.*?)(?=\n## |\Z)", old, re.S)
        if settings:
            cur = (d / "edit.md").read_text(encoding="utf-8")
            cur = re.sub(r"## Settings\n(.*?)(?=\n## |\Z)", "## Settings\n" + settings.group(1).replace("\\", "\\\\"),
                         cur, count=1, flags=re.S)
            (d / "edit.md").write_text(cur, encoding="utf-8")
        made.append(f"format from {a.like}")

    print(f"videos/{a.slug}/ ready ({', '.join(made) or 'nothing new, everything was already there'}).")
    print("Next: brief.md with Claude (purple-cow, story-loops), then script.md. Tick each in CHECKS.md.")


if __name__ == "__main__":
    main()
