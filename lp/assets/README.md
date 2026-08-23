# assets

`Murecho-800-subset.ttf` is the face drawn into the Open Graph card
(`src/app/[locale]/opengraph-image.tsx`). It is the same display face the site
uses for its headings, cut down to the characters the card actually shows.

Any character missing from it silently falls back to a different face, so when
the card's copy changes, rebuild the subset:

```sh
curl -sL -o /tmp/Murecho[wght].ttf \
  "https://github.com/google/fonts/raw/main/ofl/murecho/Murecho[wght].ttf"

fonttools varLib.instancer /tmp/Murecho[wght].ttf wght=800 -o /tmp/Murecho-800.ttf

pyftsubset /tmp/Murecho-800.ttf \
  --text="Macopy 直前の10件を、ショートカット1つで Your last ten copies, one shortcut away" \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+3000-303F,U+30FB" \
  --output-file=assets/Murecho-800-subset.ttf \
  --no-hinting --desubroutinize --layout-features=''
```
