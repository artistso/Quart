#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Quart — icon generator
#
# Renders the full icon set from a single vector-ish recipe so the artwork can
# be regenerated deterministically on any machine with ImageMagick 6/7:
#
#   assets/icon-512.png            PWA "any"      (rounded squircle, full art)
#   assets/icon-maskable-512.png   PWA "maskable" (full-bleed, safe-zone art)
#   assets/icon-192.png            PWA "any"
#   assets/icon-maskable-192.png   PWA "maskable"
#   assets/apple-touch-icon.png    iOS home screen (180)
#   assets/favicon.png / .ico      browser tab
#   assets/splash-1280x800.png     TWA / PWA splash artwork
#
# Usage:  npm run icons        (or: bash scripts/build-icons.sh)
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p assets

CONVERT=convert
command -v magick >/dev/null 2>&1 && CONVERT="magick"

M=1024                       # master canvas
C=$((M / 2))                 # center
VIOLET='#7c5cff'
CYAN='#00e5ff'
ROSE='#ff3366'
VOID='#0a0a12'

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "◈ rendering master icon at ${M}x${M}"

# 1 — deep-space radial background -------------------------------------------
$CONVERT -size ${M}x${M} radial-gradient:'#1c1140'-'#07070e' "$TMP/bg.png"

# 2 — faint star field (deterministic pseudo-random specks) ------------------
$CONVERT -size ${M}x${M} xc:none -fill 'rgba(255,255,255,0.55)' \
  -draw "circle 168,214 168,218  circle 812,166 812,169  circle 300,880 300,883
         circle 902,760 902,764  circle 120,640 120,643  circle 700,300 700,303
         circle 480,120 480,122  circle 940,470 940,473  circle 250,520 250,522" \
  -blur 0x1.2 "$TMP/stars.png"

# 3 — violet halo behind the orb --------------------------------------------
$CONVERT -size ${M}x${M} xc:none -fill "$VIOLET" -stroke none \
  -draw "circle $C,$C $C,$((C + 250))" -blur 0x90 "$TMP/halo.png"

# 4 — the quantum core: white-hot center falling off into violet -------------
$CONVERT -size 560x560 radial-gradient:'#ffffff'-'rgba(124,92,255,0)' \
  -resize 560x560 "$TMP/core.png"

# 5 — orbital rings (two ellipses at different inclinations) ----------------
#     -rotate grows the canvas, so re-center & crop back to MxM afterwards.
#     Draw each electron dot on its ring BEFORE rotating the layer so the dot
#     stays exactly on the orbit.
$CONVERT -size ${M}x${M} xc:none -fill none -stroke "$CYAN" -strokewidth 9 \
  -draw "ellipse $C,$C 340,124 0,360" \
  -fill "$CYAN" -stroke none -draw "circle 172,$C 172,$((C + 16))" \
  -background none -rotate -22 \
  -gravity center -extent ${M}x${M} -blur 0x0 "$TMP/ring1.png"
$CONVERT -size ${M}x${M} xc:none -fill none -stroke "$ROSE" -strokewidth 9 \
  -draw "ellipse $C,$C 340,124 0,360" \
  -fill "$ROSE" -stroke none -draw "circle 852,$C 852,$((C + 16))" \
  -background none -rotate 24 \
  -gravity center -extent ${M}x${M} -blur 0x0 "$TMP/ring2.png"

# 6 — ◈ diamond shell + inner facet -----------------------------------------
D=372   # half-diagonal of the outer diamond
d=96    # half-diagonal of the inner facet
$CONVERT -size ${M}x${M} xc:none -fill none -stroke "$VIOLET" -strokewidth 22 \
  -draw "polygon $C,$((C - D)) $((C + D)),$C $C,$((C + D)) $((C - D)),$C" \
  "$TMP/diamond.png"
$CONVERT -size ${M}x${M} xc:none -fill 'rgba(255,255,255,0.92)' -stroke none \
  -draw "polygon $C,$((C - d)) $((C + d)),$C $C,$((C + d)) $((C - d)),$C" \
  -blur 0x2 "$TMP/facet.png"

# ---- composite the master (full-bleed / maskable artwork) ------------------
$CONVERT "$TMP/bg.png" \
  \( "$TMP/stars.png" \) -composite \
  \( "$TMP/halo.png" \) -compose screen -composite -compose over \
  \( "$TMP/ring1.png" \) -composite \
  \( "$TMP/ring2.png" \) -composite \
  \( "$TMP/core.png" \) -gravity center -composite \
  \( "$TMP/facet.png" \) -composite \
  \( "$TMP/diamond.png" \) -composite \
  "$TMP/master.png"

# Maskable-safe variant: artwork pulled in to the central 66% safe zone ------
$CONVERT "$TMP/bg.png" \
  \( "$TMP/master.png" -resize 66% \) -gravity center -composite \
  "$TMP/maskable.png"

# Rounded squircle mask used for the "any" purpose icons ---------------------
R=224
$CONVERT -size ${M}x${M} xc:none -fill white -draw "roundrectangle 0,0 $((M-1)),$((M-1)),$R,$R" \
  "$TMP/mask.png"

emit () { # emit <source> <size> <outfile> [round]
  local src="$1" size="$2" out="$3" round="${4:-no}"
  local quant=""
  [ "$size" -ge 128 ] && quant="-colors 200 -dither FloydSteinberg"
  if [ "$round" = "round" ]; then
    $CONVERT "$src" -filter Lanczos -resize ${size}x${size} $quant \
      \( "$TMP/mask.png" -filter Lanczos -resize ${size}x${size} \) -alpha set \
      -compose copyopacity -composite -define png:compression-level=9 -strip "$out"
  else
    $CONVERT "$src" -filter Lanczos -resize ${size}x${size} $quant -define png:compression-level=9 -strip "$out"
  fi
  echo "  → assets/$(basename "$out")  (${size}x${size})"
}

emit "$TMP/master.png"   512 assets/icon-512.png          round
emit "$TMP/master.png"   192 assets/icon-192.png          round
emit "$TMP/maskable.png" 512 assets/icon-maskable-512.png
emit "$TMP/maskable.png" 192 assets/icon-maskable-192.png
emit "$TMP/master.png"   180 assets/apple-touch-icon.png
emit "$TMP/master.png"    64 assets/favicon.png
$CONVERT "$TMP/master.png" -resize 48x48 "$TMP/48.png"
$CONVERT "$TMP/master.png" -resize 32x32 "$TMP/32.png"
$CONVERT "$TMP/master.png" -resize 16x16 "$TMP/16.png"
$CONVERT "$TMP/16.png" "$TMP/32.png" "$TMP/48.png" assets/favicon.ico
echo "  → assets/favicon.ico  (16/32/48)"

# TWA / PWA splash artwork (landscape, artboard ratio) ----------------------
$CONVERT -size 1280x800 radial-gradient:'#160f33'-'#07070e' \
  \( "$TMP/master.png" -resize 420x420 \) -gravity center -composite \
  -fill white -font DejaVu-Sans -pointsize 44 -gravity south \
  -annotate +0+96 'QUART' -colors 220 -dither FloydSteinberg -define png:compression-level=9 -strip assets/splash-1280x800.png
echo "  → assets/splash-1280x800.png  (1280x800)"

echo "◈ icon set complete"
