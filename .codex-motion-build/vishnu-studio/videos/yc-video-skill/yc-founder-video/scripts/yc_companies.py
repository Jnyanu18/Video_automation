"""Search every YC company (the open yc-oss dataset) for ones in your space, and see how they word their one-liner.

Needs only Python 3.9+.

    python yc_companies.py "ai agent" saas          # YC companies whose one-liner or description has all the words
    python yc_companies.py --oneliner "An AI agent inside your SaaS that does user tasks"
"""
import argparse, json, re, statistics as st, urllib.request

DATA = "https://yc-oss.github.io/api/companies/all.json"


def load():
    return json.loads(urllib.request.urlopen(DATA, timeout=60).read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words", nargs="*", help="words that must all appear, e.g. scheduling ai")
    ap.add_argument("--oneliner", help="your own one-liner, to compare its length with every YC company's")
    ap.add_argument("--limit", type=int, default=25)
    a = ap.parse_args()
    cos = load()
    lines = [c["one_liner"] for c in cos if c.get("one_liner")]
    lens = sorted(len(x) for x in lines)
    print(f"{len(cos)} YC companies. One-liners: median {st.median(lens):.0f} characters, "
          f"{100 * sum(l <= 50 for l in lens) / len(lens):.0f}% are 50 or fewer.")
    if a.oneliner:
        n = len(a.oneliner)
        print(f"Yours: {n} characters, shorter than {100 * sum(l > n for l in lens) / len(lens):.0f}% of YC one-liners.")
    if a.words:
        hits = []
        for c in cos:
            text = " ".join([c.get("one_liner") or "", c.get("long_description") or "", " ".join(c.get("tags") or [])]).lower()
            if all(re.search(rf"\b{re.escape(w.lower())}", text) for w in a.words):
                hits.append(c)
        hits.sort(key=lambda c: c.get("launched_at") or 0, reverse=True)
        print(f"\n{len(hits)} YC companies match {a.words} (newest first):\n")
        for c in hits[: a.limit]:
            print(f"- {c['name']} ({c.get('batch')}, {c.get('status')}): {c.get('one_liner')}\n  {c.get('url')}")
        print("\nIf YC funded one of these, say in your application how you differ. That they exist shows the market is real.")


if __name__ == "__main__":
    main()
