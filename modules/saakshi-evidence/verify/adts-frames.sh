#!/usr/bin/env bash
# Checks the Android module's AdtsFrames (repair round A, group 2) on a JVM: where whole ADTS AAC
# frames end, for the checkpoints of body-cam's sound-only file.
# Usage: adts-frames.sh [work dir, default a new temp dir]
set -euo pipefail

WORK="${1:-$(mktemp -d)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../android/src/main/java/expo/modules/saakshievidence/AdtsFrames.java"

mkdir -p "$WORK/classes"
javac -d "$WORK/classes" "$SRC" "$HERE/AdtsFramesCheck.java" 2>&1 | grep -v '^Picked up' || true
java -cp "$WORK/classes" AdtsFramesCheck 2>&1 | grep -v '^Picked up'
