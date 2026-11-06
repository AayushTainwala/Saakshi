#!/usr/bin/env bash
# Checks bug mode's Android checkpoints (fix round 1: one continuous file, like body-cam) with a
# 40-second AAC file in ADTS framing made by ffmpeg at the recorder's settings (mono, 44.1 kHz,
# 64 kbit/s), not by a phone:
#   1. AdtsCheckpointer.kt, compiled and run on the JVM, checkpoints a file that grows the way AOSP's
#      AACWriter writes it (each header byte by byte, then the frame's data); every checkpoint is on
#      a frame boundary, and its SHA-256 equals the SHA-256 of that prefix re-read;
#   2. upload parts ending on checkpoints, joined in order, are the file byte for byte;
#   3. every checkpointed prefix plays: ffprobe decodes all its frames;
#   4. bytes that are not ADTS stop checkpoints with one error, and a file shorter than its
#      checkpoints is refused.
# Needs ffmpeg, ffprobe, a JDK and the Kotlin compiler (KOTLINC, default: kotlinc on the PATH).
# Usage: adts-checkpoints.sh [work dir]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC_KT="$HERE/../android/src/main/java/expo/modules/saakshisos/AdtsCheckpointer.kt"
KOTLINC="${KOTLINC:-kotlinc}"
WORK="${1:-$(mktemp -d)}"
mkdir -p "$WORK"

ffmpeg -loglevel error -y -f lavfi -i sine=frequency=440:sample_rate=44100 -t 40 \
  -ac 1 -c:a aac -b:a 64k -f adts "$WORK/bug.aac"

"$KOTLINC" -nowarn "$SRC_KT" "$HERE/AdtsCheckpointerCheck.kt" -include-runtime -d "$WORK/check.jar" 2>&1 | grep -v '^Picked up' || true
java -cp "$WORK/check.jar" AdtsCheckpointerCheckKt "$WORK/bug.aac" "$WORK/out" 2>&1 | grep -v '^Picked up'

whole=$(ffprobe -v error -count_frames -select_streams a:0 -show_entries stream=nb_read_frames -of csv=p=0 "$WORK/bug.aac")
echo "whole file: $whole frames decode"
for prefix in "$WORK"/out/prefix-*.aac; do
  frames=$(ffprobe -v error -count_frames -select_streams a:0 -show_entries stream=nb_read_frames -of csv=p=0 "$prefix")
  errors=$(ffmpeg -v error -i "$prefix" -f null - 2>&1 | wc -l)
  echo "$(basename "$prefix"): $(stat -c %s "$prefix") bytes, $frames frames decode, $errors decoder errors"
  [ "$errors" -eq 0 ] || { echo "FAIL: $prefix does not decode cleanly"; exit 1; }
done
