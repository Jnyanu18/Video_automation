"""python -m services.render.cli plan.json workdir [--final]"""
import json
import sys

from .render import render_final_info, render_preview_info


def main(argv=None):
    a = argv or sys.argv[1:]
    if len(a) < 2:
        sys.exit("usage: cli plan.json workdir [--final]")
    plan = json.load(open(a[0]))
    info = (render_final_info if "--final" in a else render_preview_info)(plan, a[1])
    print(json.dumps(info))


if __name__ == "__main__":
    main()
