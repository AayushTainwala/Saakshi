#!/usr/bin/env bash
# Shows what survives when a recording is cut off part-way, for three containers: MPEG-TS (the
# Android recorder), QuickTime with 10-second movie fragments (iPhone's AVCaptureMovieFileOutput
# default) and plain MP4 (CameraX). Each 30-second test file is truncated at 60% of its bytes,
# the way a crash or forced power-off leaves it, and ffprobe counts the frames that still decode.
# The files are made by ffmpeg, not by a phone: this checks the formats, not the phones' writers.
# Usage: cutoff-formats.sh [work dir]
set -euo pipefail
WORK="${1:-$(mktemp -d)}"
mkdir -p "$WORK"
cd "$WORK"
SRC=(-f lavfi -i testsrc2=size=1280x720:rate=30 -f lavfi -i sine=frequency=440:sample_rate=48000
  -t 30 -c:v libx264 -preset ultrafast -g 30 -c:a aac -b:a 128k)

ffmpeg -loglevel error -y "${SRC[@]}" -f mpegts ts.ts
ffmpeg -loglevel error -y "${SRC[@]}" -movflags +frag_custom -frag_duration 10000000 -f mov frag10.mov
ffmpeg -loglevel error -y "${SRC[@]}" -f mp4 plain.mp4

printf '%-12s %-14s %s\n' file "video frames" "of 900 (30 s at 30 fps), cut at 60%"
for f in ts.ts frag10.mov plain.mp4; do
  size=$(stat -c %s "$f")
  head -c $((size * 6 / 10)) "$f" > "cut-$f"
  frames=$(ffprobe -v quiet -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "cut-$f" | head -1 || true)
  printf '%-12s %-14s\n' "$f" "${frames:-0}"
done
