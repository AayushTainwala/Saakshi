#!/usr/bin/env bash
# Checks the Android module's AtomicFile (repair round A, group 1) on a JVM: a writer rewrites one
# file over and over and is killed (kill -9) at random moments; after every kill the file must be
# one whole payload, never empty, short or mixed.
# This shows the swap is all-or-nothing when the process dies. It cannot show what a power cut
# does: that needs a phone.
# Usage: atomic-write.sh [kills, default 200] [work dir, default a new temp dir]
set -euo pipefail

KILLS="${1:-200}"
WORK="${2:-$(mktemp -d)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../android/src/main/java/expo/modules/saakshievidence/AtomicFile.java"
SIZE=65536

mkdir -p "$WORK/classes"
javac -d "$WORK/classes" "$SRC" "$HERE/AtomicWriteCheck.java" 2>&1 | grep -v '^Picked up' || true

FILE="$WORK/session.json"
rm -f "$FILE" "$FILE.tmp"
for i in $(seq 1 "$KILLS"); do
  java -cp "$WORK/classes" AtomicWriteCheck write "$FILE" "$SIZE" 2>/dev/null &
  pid=$!
  # Until the first write has landed, then a random moment within the next 50 ms.
  until [ -s "$FILE" ]; do sleep 0.01; done
  sleep "0.0$((RANDOM % 5))$((RANDOM % 10))"
  kill -9 "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  if ! OUT="$(java -cp "$WORK/classes" AtomicWriteCheck check "$FILE" "$SIZE" 2>/dev/null)"; then
    echo "$OUT"
    echo "FAIL after kill $i"
    exit 1
  fi
done
echo "OK: after each of $KILLS kills the file was one whole payload."
