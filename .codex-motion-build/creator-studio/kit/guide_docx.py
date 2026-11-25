"""Every guide we make is a document (Vishnu, 2026-11-02): dm-guide.md -> dm-guide.docx, to upload to Google Drive and open
with Google Docs, never copied from a preview (a copy carries the preview's pale text colour into the doc).

    python kit/guide_docx.py <slug>            videos/<slug>/dm-guide.md -> videos/<slug>/dm-guide.docx

Black Arial, real Title and Heading 1 to 3 styles, bullets, bold, inline code, a shaded note for "> " lines, live links,
and commands on a shaded monospace line: a fenced block, or a plain line that starts with curl, irm, jarvis, claude,
npm, pnpm, git, export, $env: or timezone =. Numbered items keep their literal numbers (a Word list would carry the
count across sections). fast.py final runs this and publishes the .docx, not the .md.
"""
import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import video_dir

CMD = re.compile(r"^(curl |irm |jarvis( |$)|claude |npm |pnpm |git |export |\$env:|timezone = )")
INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|https?://[^\s)\]>]+)")
BLACK = RGBColor(0, 0, 0)
REL_LINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"


def shade(par, fill):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    par._p.get_or_add_pPr().append(shd)


def link(par, url):
    rid = par.part.relate_to(url, REL_LINK, is_external=True)
    h = OxmlElement("w:hyperlink")
    h.set(qn("r:id"), rid)
    r = OxmlElement("w:r")
    rp = OxmlElement("w:rPr")
    c = OxmlElement("w:color")
    c.set(qn("w:val"), "1155CC")
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rp.append(c)
    rp.append(u)
    r.append(rp)
    t = OxmlElement("w:t")
    t.text = url
    r.append(t)
    h.append(r)
    par._p.append(h)


def code_run(par, text, size=10.5):
    r = par.add_run(text)
    r.font.name = "Consolas"
    r.font.size = Pt(size)
    return r


def inline(par, text, bold=False):
    for i, piece in enumerate(INLINE.split(text)):
        if not piece:
            continue
        if piece.startswith("**") and piece.endswith("**") and len(piece) > 4:
            inline(par, piece[2:-2], bold=True)
        elif piece.startswith("`") and piece.endswith("`"):
            code_run(par, piece[1:-1]).bold = bold
        elif piece.startswith("http") and i % 2:
            tail = ""
            while piece and piece[-1] in ".,;:":
                tail, piece = piece[-1] + tail, piece[:-1]
            link(par, piece)
            if tail:
                par.add_run(tail).bold = bold
        else:
            par.add_run(piece).bold = bold


def build(md: str, dst: Path) -> None:
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name, st.font.size, st.font.color.rgb = "Arial", Pt(11), BLACK
    for name, size in (("Title", 26), ("Heading 1", 20), ("Heading 2", 15), ("Heading 3", 12.5), ("List Bullet", 11)):
        s = doc.styles[name]
        s.font.name, s.font.size, s.font.color.rgb = "Arial", Pt(size), BLACK
        if name != "List Bullet":
            s.font.bold = True

    buf: list[str] = []
    cur = None  # the open bullet paragraph, which wrapped lines continue

    def flush():
        nonlocal buf, cur
        if buf:
            p = cur if cur is not None else doc.add_paragraph()
            if cur is None:
                p.paragraph_format.space_after = Pt(8)
            if cur is not None:
                p.add_run(" ")
            inline(p, " ".join(buf))
        buf, cur = [], None

    lines = md.split("\n")
    n, first, i = len(lines), True, 0
    while i < n:
        ln = lines[i].rstrip()
        i += 1
        if not ln.strip():
            flush()
            continue
        if ln.startswith("```"):
            flush()
            body = []
            while i < n and not lines[i].startswith("```"):
                body.append(lines[i].rstrip())
                i += 1
            i += 1
            for c in body:
                p = doc.add_paragraph()
                code_run(p, c)
                shade(p, "F1F3F4")
                p.paragraph_format.left_indent = Pt(10)
                p.paragraph_format.space_after = Pt(2)
            continue
        m = re.match(r"^(#{1,3}) (.*)", ln)
        if m:
            flush()
            if first and len(m.group(1)) == 1:
                doc.add_paragraph(m.group(2), style="Title")
            else:
                doc.add_heading(m.group(2), level=len(m.group(1)))
            first = False
            continue
        first = False
        if ln.startswith(">"):
            flush()
            p = doc.add_paragraph()
            inline(p, ln.lstrip("> ").strip())
            shade(p, "FFF6D6")
            p.paragraph_format.left_indent = Pt(10)
            continue
        m = re.match(r"^\s*[-*] (.*)", ln)
        if m:
            flush()
            cur = doc.add_paragraph(style="List Bullet")
            cur.paragraph_format.space_after = Pt(4)
            buf = [m.group(1)]
            continue
        m = re.match(r"^(\d+)\. (.*)", ln)
        if m and not buf:
            flush()
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(24)
            p.paragraph_format.first_line_indent = Pt(-18)
            p.paragraph_format.space_after = Pt(4)
            p.add_run(f"{m.group(1)}.  ")
            inline(p, m.group(2))
            continue
        if not buf and CMD.match(ln):
            p = doc.add_paragraph()
            code_run(p, ln)
            shade(p, "F1F3F4")
            p.paragraph_format.left_indent = Pt(10)
            p.paragraph_format.space_after = Pt(8)
            continue
        if re.fullmatch(r"\*\*[^*]+\*\*", ln.strip()) and not buf:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True
            inline(p, ln.strip())
            continue
        buf.append(ln.strip() if cur is None else ln.strip())
    flush()
    doc.save(dst)


if __name__ == "__main__":
    d = video_dir(sys.argv[1])
    src, dst = d / "dm-guide.md", d / "dm-guide.docx"
    if not src.exists():
        sys.exit(f"{src} not found")
    build(src.read_text(encoding="utf-8"), dst)
    print(f"Wrote {dst}. Upload it to Google Drive and open it with Google Docs; do not copy from a preview.")
