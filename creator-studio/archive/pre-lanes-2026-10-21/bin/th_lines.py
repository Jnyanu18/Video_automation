"""Shared by the talking-head steps: words into spoken lines, and the filler words the cut removes."""
from common import norm

FILLERS = {"um", "uh", "uhm", "umm", "erm", "er", "ah", "hmm", "mm", "mhm"}


def lines_of(words, gap=0.6):
    """Group words into lines, breaking on a pause longer than `gap` seconds or at the end of a sentence."""
    lines, cur = [], []
    for i, w in enumerate(words):
        prev = words[i - 1] if i else None
        if cur and (w["start"] - prev["end"] > gap or prev["w"].rstrip()[-1:] in ".?!"):
            lines.append(cur)
            cur = []
        cur.append(i)
    if cur:
        lines.append(cur)
    return [{"idx": l, "start": words[l[0]]["start"], "end": words[l[-1]]["end"],
             "text": " ".join(words[i]["w"] for i in l)} for l in lines]


def is_filler(word):
    return norm(word) in FILLERS
