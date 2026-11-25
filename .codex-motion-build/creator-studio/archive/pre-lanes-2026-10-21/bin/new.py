"""Start a video: python bin/new.py <slug> "Working title"

Makes videos/<slug>/ with the brief, script, storyboard and CHECKS.md templates, a scene file in
remotion/src/videos/, and registers it so Remotion Studio shows it.
"""
import re
import sys
from common import ROOT, VIDEOS

if len(sys.argv) < 3:
    sys.exit('Usage: python bin/new.py <slug> "Working title"')
slug, title = sys.argv[1], sys.argv[2]
if not re.fullmatch(r"[a-z0-9-]+", slug):
    sys.exit("The slug is lowercase letters, digits and dashes only.")
d = VIDEOS / slug
if d.exists():
    sys.exit(f"videos/{slug} already exists.")
(d / "voice").mkdir(parents=True)

(d / "brief.md").write_text(f"""# Brief: {title}

<!-- Stage 0. Written with Claude in conversation before a word of script. -->

- **Brand:** personal (Vishnu) or agency (Auralion Labs)
- **Who it is for:**
- **The one point:**
- **The hook (first 5 seconds):**
- **Shape and length:**
- **The metaphor or visual idea:**
- **Real numbers it uses, and where they come from:**
- **The question it ends on:**
""", encoding="utf-8")

(d / "script.md").write_text(f"""# {title}

<!-- One paragraph per thought. Each paragraph becomes one voice file, so a bad take is re-rolled on
its own. Written the way Vishnu talks: short, plain, "I". No em dashes. -->

""", encoding="utf-8")

(d / "storyboard.md").write_text("""# Storyboard

<!-- One beat per picture change. The first beat starts at 0.
## beat-id | the exact words this beat starts on
chapter: Optional chapter title for the description
What is on screen. -->

""", encoding="utf-8")

(d / "CHECKS.md").write_text(f"""# Checks: {title}

Tick a stage (change [ ] to [x]) only after reading or hearing its file. A stage does not run until the
one before it is ticked.

- [ ] 0 Brief: brief.md
- [ ] 1 Voice: voice/voice.mp3, listened to in full
- [ ] 2 Words: words-check.md
- [ ] 3 Cues: cues.md
- [ ] 4 Scene: stills/contact-sheet.png, then the sweatbox with sound
- [ ] 5 Render: out/, title and thumbnail picked
""", encoding="utf-8")

pascal = "".join(p.capitalize() for p in slug.split("-"))
scene = ROOT / "remotion" / "src" / "videos" / f"{slug}.tsx"
scene.write_text(f"""import React from "react";
import {{ Frame }} from "../kit/Frame";
import {{ Headline }} from "../kit/Blocks";
import {{ Cue, Word }} from "../kit/theme";
import cuesJson from "../../../videos/{slug}/cues.json";
import wordsJson from "../../../videos/{slug}/words.json";
import voiceMeta from "../../../videos/{slug}/voice/meta.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end : 5;

// One entry per beat id in storyboard.md. Built from the kit in remotion/src/kit.
export const {pascal}: React.FC = () => (
  <Frame
    slug="{slug}"
    cues={{cues}}
    words={{words}}
    draftVoice={{voiceMeta.draft}}
    beats={{{{}}}}
  />
);
""", encoding="utf-8")
# Placeholders so the scene compiles before Stage 2 and 3 have run.
(d / "cues.json").write_text("[]\n", encoding="utf-8")
(d / "words.json").write_text("[]\n", encoding="utf-8")
(d / "voice" / "meta.json").write_text('{"draft": true}\n', encoding="utf-8")

reg = ROOT / "remotion" / "src" / "videos" / "registry.ts"
text = reg.read_text(encoding="utf-8")
imp = f'import {{ {pascal}, seconds as {pascal}Seconds }} from "./{slug}";\n'
entry = f'  {{ slug: "{slug}", Scene: {pascal}, seconds: {pascal}Seconds }},\n'
text = imp + text if imp not in text else text
text = text.replace("  // registry:entries\n", "  // registry:entries\n" + entry)
reg.write_text(text, encoding="utf-8")

print(f"Made videos/{slug}/ and remotion/src/videos/{slug}.tsx. Next: write brief.md with Claude, then script.md.")
