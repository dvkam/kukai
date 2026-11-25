# Figtree in Kukai iOS

The four iOS TTFs are byte-identical to static instances reproduced from the Figtree 2.000 Roman variable font at `erikdkennedy/figtree@200de49f71e1dd2b01290bc3bc2c98118e10c62d`. Google Fonts imported the same variable font blob, `a7cc6b58c27619ca94f4d4e168e60504011ca9cb`, from that revision. The replay establishes the source bytes and transformations. The iOS commits record the addition of the fonts without identifying where they were downloaded. [Figtree source](https://github.com/erikdkennedy/figtree/tree/200de49f71e1dd2b01290bc3bc2c98118e10c62d/fonts/variable) · [Google Fonts import](https://github.com/google/fonts/commit/9442a512899380dae15e520deafa12f2b2954e31) · [Initial iOS addition](https://github.com/kukai-wallet/kukai-mobile-ios/commit/a554ffff506733726c767499f81d2bc40141dc07) · [SemiBold addition](https://github.com/kukai-wallet/kukai-mobile-ios/commit/c0e2982a6dd2afa56bd652e22c0073d53a6acc0e)

| File at `kukai-mobile-ios@cb8eb9ad8a97addd36c0549d77470183deb1fa31` | Weight | SHA-256 of inherited and replayed bytes |
| --- | --- | --- |
| `Kukai Mobile/Fonts/Figtree-Regular.ttf` | 400 | `ce15191211bb569c8b5bc20b262c3b47174ec6827933362842b722a6b5f2afa5` |
| `Kukai Mobile/Fonts/Figtree-Medium.ttf` | 500 | `a67e48d53b5170be4f764c2aceb6a8569cd9a5e0a5970949de475046343daad1` |
| `Kukai Mobile/Fonts/Figtree-SemiBold.ttf` | 600 | `ff5a925da5efc0997b21d24a6fa72e731f9ce7f54dcbeab84e65536986c7debd` |
| `Kukai Mobile/Fonts/Figtree-Bold.ttf` | 700 | `235f83d45c88d3dfcf5e06d4db264658c07eac298899d2f5fd09ad9c1a087d63` |

The [retained upstream OFL.txt](notices/figtree-OFL.txt) contains the 2022 Figtree Project Authors copyright notice and the full SIL Open Font License 1.1 (`OFL-1.1`). Section 2 calls for the copyright notice and license to accompany each redistributed copy. SHA-256 of the upstream notice and the retained file is `140d37233e7f3ce7313798befa9600893bcceaf41a55fa0fa5ad52f7f657a268`. The font copies remain excluded from the PoC pending the reuse review in issue #2. [Upstream OFL.txt](https://github.com/erikdkennedy/figtree/blob/200de49f71e1dd2b01290bc3bc2c98118e10c62d/OFL.txt)

## Reproduce the four files

Run from the Kukai repository root with `curl` and Python 3.12. The replay uses FontTools 4.38.0 and uharfbuzz 0.37.3. It subsets the variable font to its encoded characters and their dependent glyphs, keeps the `.notdef` outline, and instantiates each weight. HarfBuzz packs the OpenType layout tables. Writing tables in dependency order and preserving timestamps and global bounds reproduces the file bytes. [FontTools 4.38.0](https://pypi.org/project/fonttools/4.38.0/) · [uharfbuzz 0.37.3](https://pypi.org/project/uharfbuzz/0.37.3/)

```sh
(
  set -eu
  work_dir=$(mktemp -d)
  figtree=https://raw.githubusercontent.com/erikdkennedy/figtree/200de49f71e1dd2b01290bc3bc2c98118e10c62d
  ios=https://raw.githubusercontent.com/kukai-wallet/kukai-mobile-ios/cb8eb9ad8a97addd36c0549d77470183deb1fa31
  curl -fLsS "$figtree/fonts/variable/Figtree%5Bwght%5D.ttf" -o "$work_dir/variable.ttf"
  curl -fLsS "$figtree/OFL.txt" -o "$work_dir/OFL.txt"
  cmp docs/program/provenance/notices/figtree-OFL.txt "$work_dir/OFL.txt"
  for style in Regular Medium SemiBold Bold; do
    curl -fLsS "$ios/Kukai%20Mobile/Fonts/Figtree-$style.ttf" -o "$work_dir/Figtree-$style.ttf"
  done
  python3 -m venv "$work_dir/venv"
  "$work_dir/venv/bin/python" -m pip --isolated install --no-cache-dir --no-deps fonttools==4.38.0 uharfbuzz==0.37.3
  "$work_dir/venv/bin/python" - "$work_dir" <<'PY'
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.otBase import USE_HARFBUZZ_REPACKER
from fontTools.varLib.instancer import instantiateVariableFont

directory = Path(sys.argv[1])
variable = (directory / 'variable.ttf').read_bytes()
assert sha256(variable).hexdigest() == 'd5d277a5e4de8e17c0527a074eb2f89560188ea10a827c72fe405180c33a41c0'
for style, weight in [('Regular', 400), ('Medium', 500), ('SemiBold', 600), ('Bold', 700)]:
    font = TTFont(BytesIO(variable), recalcBBoxes=False, recalcTimestamp=False)
    font.cfg[USE_HARFBUZZ_REPACKER] = True
    options = subset.Options(name_IDs=['*'], glyph_names=True, layout_features=['*'], notdef_outline=True)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=font.getBestCmap())
    subsetter.subset(font)
    instance = instantiateVariableFont(font, {'wght': weight}, updateFontNames=True)
    output = BytesIO()
    instance.save(output, reorderTables=None)
    result = output.getvalue()
    assert result == (directory / f'Figtree-{style}.ttf').read_bytes(), style
    print(f'Figtree-{style}.ttf {sha256(result).hexdigest()}')
PY
)
```
