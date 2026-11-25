"""Title and text-card placement controls (keeps cards off a speaker's face)."""
from services.render.composition import _place, _text_style


def px(v):
    return f"{v:.1f}px"


def test_cards_can_be_placed_by_fraction_of_height():
    assert _place({"y": 0.3}, 1920, px).startswith("inset:auto;") and "top:30.0%" in _place({"y": 0.3}, 1920, px)
    assert _place({}, 1920, px) == ""                                   # default stays centred
    assert "top:18.0%" in _place({"position": "top"}, 1920, px)          # the old position names still work
    assert "top:4.0%" in _place({"y": -5}, 1920, px) and "top:96.0%" in _place({"y": 9}, 1920, px)  # clamped inside the frame


def test_cards_can_be_sized_and_boxed():
    style = _text_style({"size": 46, "box": True}, px)
    assert "font-size:46.0px" in style and "background:rgba(0,0,0,.6)" in style
    assert _text_style({}, px) == ""
