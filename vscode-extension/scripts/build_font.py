"""Builds media/usage-dots.woff: a COLR color font with one glyph per fill level.

U+E000 to U+E008 hold 0 to 8 lit dots in a braille-style 2 by 4 grid, filled
from the bottom row up, left then right. Lit dots use the text color (palette
index 0xFFFF), so the status bar item's color applies. Unlit dots use a fixed
translucent grey. Without COLR support, a glyph shows its lit dots only.

Run with fonttools installed: python3 scripts/build_font.py
"""

import math
from pathlib import Path

from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

# Metrics follow VS Code's codicon font: a square em with no descent, which
# the status bar draws as a 16px box centred on the text.
UPM = 1000
ADVANCE = 555
RADIUS = 70
COLUMNS = (190, 365)
ROWS = (762, 587, 413, 238)  # top to bottom

# (column, row) in fill order: the same as ⡀ ⣀ ⣄ ⣤ ⣦ ⣶ ⣷ ⣿.
ORDER = [(0, 3), (1, 3), (0, 2), (1, 2), (0, 1), (1, 1), (0, 0), (1, 0)]
LEVELS = len(ORDER) + 1
FIRST_CODEPOINT = 0xE000

FOREGROUND = 0xFFFF
GREY = 0
PALETTE = [(0.5, 0.5, 0.5, 0.45)]

OUT = Path(__file__).resolve().parent.parent / "media" / "usage-dots.woff"


def draw_dot(pen, column, row):
    # Eight off-curve points on a slightly larger circle; TrueType implies
    # the on-curve midpoints, which land on the dot's radius.
    cx, cy = COLUMNS[column], ROWS[row]
    outer = RADIUS / math.cos(math.pi / 8)
    points = [
        (round(cx + outer * math.cos(-k * math.pi / 4)), round(cy + outer * math.sin(-k * math.pi / 4)))
        for k in range(8)
    ]
    pen.qCurveTo(*points, None)
    pen.closePath()


def glyph(dots):
    pen = TTGlyphPen(None)
    for column, row in dots:
        draw_dot(pen, column, row)
    return pen.glyph()


def main():
    dot_names = [f"dot{i}" for i in range(len(ORDER))]
    level_names = [f"level{n}" for n in range(LEVELS)]

    glyphs = {".notdef": glyph([])}
    glyphs.update({name: glyph([dot]) for name, dot in zip(dot_names, ORDER)})
    glyphs.update({name: glyph(ORDER[:n]) for n, name in enumerate(level_names)})

    builder = FontBuilder(UPM, isTTF=True)
    builder.setupGlyphOrder(list(glyphs))
    builder.setupCharacterMap({FIRST_CODEPOINT + n: name for n, name in enumerate(level_names)})
    builder.setupGlyf(glyphs)

    glyf = builder.font["glyf"]
    metrics = {}
    for name in glyphs:
        glyf[name].recalcBounds(glyf)
        metrics[name] = (ADVANCE, getattr(glyf[name], "xMin", 0))
    builder.setupHorizontalMetrics(metrics)

    builder.setupHorizontalHeader(ascent=UPM, descent=0)
    builder.setupOS2(sTypoAscender=UPM, sTypoDescender=0, usWinAscent=UPM, usWinDescent=0)
    builder.setupNameTable({"familyName": "Claude Usage Dots", "styleName": "Regular"})
    builder.setupPost()

    builder.font["COLR"] = buildCOLR(
        {
            name: [(dot, FOREGROUND if i < n else GREY) for i, dot in enumerate(dot_names)]
            for n, name in enumerate(level_names)
        },
        version=0,
    )
    builder.font["CPAL"] = buildCPAL([PALETTE])

    OUT.parent.mkdir(exist_ok=True)
    builder.font.flavor = "woff"
    builder.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
