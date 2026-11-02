#!/usr/bin/env bash
# Baut aus den gerenderten Bildern und der Tonspur das fertige MP4.
#
# Aufruf (im Ordner pipeline/):
#   ./mux.sh projekte/gta6-welt              → out/gta6-welt/gta6-welt.mp4 (mit Ton, −14 LUFS)
#   ./mux.sh projekte/gta6-welt --ohne-ton   → out/gta6-welt/vorschau_ohne_ton.mp4
#   ./mux.sh projekte/gta6-welt --teppich regen --teppich-db -11   (weitere Optionen gehen an klang.py)
# Windows: in Git Bash ausführen (ffmpeg und python im PATH).
#
# Ton: Stimme (audio/stimme.mp3, falls vorhanden) + selbst erzeugte Effekte (automatisch aus audio/ereignisse.json)
# und Klangteppich zum Thema (klang.py), Lautheit zweistufig mit ffmpeg loudnorm auf −14 LUFS, True Peak −1,5 dBTP.
set -euo pipefail

PROJEKT="${1:?Aufruf: ./mux.sh <projektordner> [--ohne-ton | Optionen für klang.py]}"
MODUS="${2:-}"
shift
KLANG_OPTIONEN=("$@")
HIER="$(cd "$(dirname "$0")" && pwd)"
NAME="$(basename "$PROJEKT")"
OUT="$HIER/out/$NAME"
FRAMES="$OUT/frames"
PY="$(command -v python3 || command -v python)"

[ -d "$FRAMES" ] || { echo "Keine Bilder in $FRAMES – zuerst: node render.js $PROJEKT"; exit 1; }
FPS="$("$PY" -c "import json;print(json.load(open('$OUT/ereignisse.json')).get('fps',30))" 2>/dev/null || echo 30)"
# Bilder müssen bei f_00000 beginnen (sonst ab der ersten vorhandenen Nummer)
START="$(ls "$FRAMES" | grep -m1 -E '^f_[0-9]+' | sed -E 's/^f_0*([0-9]+).*/\1/' || true)"  # || true: grep -m1 beendet die Pipe früh (SIGPIPE bei ls + pipefail)
START="${START:-0}"
ERSTES=""
for f in "$FRAMES"/f_*; do ERSTES="$f"; break; done
ENDUNG="${ERSTES##*.}"
ANZAHL="$(find "$FRAMES" -name 'f_*' | wc -l | tr -d ' ')"
echo "Bilder: $ANZAHL ($ENDUNG, $FPS fps) → $(awk "BEGIN{printf \"%.2f\", $ANZAHL/$FPS}") s"

VIDEO=(-framerate "$FPS" -start_number "$START" -i "$FRAMES/f_%05d.$ENDUNG")
KODIER=(-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -tune film
        -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
        -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart)

if [ "$MODUS" = "--ohne-ton" ]; then
  ffmpeg -y -v error -stats "${VIDEO[@]}" "${KODIER[@]}" -an "$OUT/vorschau_ohne_ton.mp4"
  echo "Fertig: $OUT/vorschau_ohne_ton.mp4"
  exit 0
fi

# 1) Tonspur mischen (Stimme + Effekte + Musik)
if [ -z "${TON_FERTIG:-}" ]; then "$PY" "$HIER/klang.py" "$PROJEKT" "${KLANG_OPTIONEN[@]}"; else echo "Ton: vorhandene Tonspur $OUT/ton.wav (TON_FERTIG)"; fi

# 2) Lautheit messen (Durchgang 1) und anwenden (Durchgang 2, linear)
# Ein sanfter Limiter vorab hält die Spitzen klein, damit loudnorm linear (ohne Pumpen) arbeiten kann
VOR="alimiter=limit=0.6:attack=4:release=60:level=false"
# Fertige Atmo-Spur (TON_FERTIG, Account 2, atmo.py): ist schon begrenzt und auf −14 LUFS gebracht → kein Vorbegrenzer, der den Höhepunkt platt drückt
[ -n "${TON_FERTIG:-}" ] && VOR="anull"
MESS="$(ffmpeg -hide_banner -nostats -i "$OUT/ton.wav" -af "$VOR,loudnorm=I=-14:TP=-1.5:LRA=${LRA_ZIEL:-11}:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
WERT() { echo "$MESS" | "$PY" -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
FILTER="loudnorm=I=-14:TP=-1.5:LRA=${LRA_ZIEL:-11}:measured_I=$(WERT input_i):measured_TP=$(WERT input_tp):measured_LRA=$(WERT input_lra):measured_thresh=$(WERT input_thresh):offset=$(WERT target_offset):linear=true:print_format=summary"
ffmpeg -y -v error -i "$OUT/ton.wav" -af "$VOR,$FILTER,aresample=48000${TON_FERTIG:+,alimiter=limit=0.7:level=false}" -c:a pcm_s16le "$OUT/ton_norm.wav"

# 3) Video + Ton
ffmpeg -y -v error -stats "${VIDEO[@]}" -i "$OUT/ton_norm.wav" "${KODIER[@]}" -c:a aac -b:a 192k -ar 48000 -shortest "$OUT/$NAME.mp4"

# 4) Kontrolle: Lautheit des Ergebnisses
ffmpeg -hide_banner -nostats -i "$OUT/$NAME.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tail -n 2
echo "Fertig: $OUT/$NAME.mp4"
