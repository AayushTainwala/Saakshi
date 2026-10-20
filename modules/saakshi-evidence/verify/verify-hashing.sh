#!/usr/bin/env bash
# Checks the Android module's StreamingHasher against coreutils on a large file, with the JVM heap
# capped far below the file size, to show the hash is streamed and correct.
# Usage: verify-hashing.sh [size in MiB, default 1024] [work dir, default a new temp dir]
set -euo pipefail

SIZE_MIB="${1:-1024}"
WORK="${2:-$(mktemp -d)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../android/src/main/java/expo/modules/saakshievidence/StreamingHasher.java"

mkdir -p "$WORK/classes"
javac -d "$WORK/classes" "$SRC" "$HERE/HashLargeFile.java"

FILE="$WORK/sample.bin"
echo "Writing ${SIZE_MIB} MiB of random data to $FILE"
head -c "$((SIZE_MIB * 1024 * 1024))" /dev/urandom > "$FILE"

echo "StreamingHasher (JVM heap capped at 16 MB):"
OUT="$(java -Xmx16m -cp "$WORK/classes" HashLargeFile "$FILE")"
echo "$OUT"

get() { echo "$OUT" | sed -n "s/^$1=//p"; }
EXPECT_SIZE="$(stat -c %s "$FILE")"
EXPECT_SHA256="$(sha256sum "$FILE" | cut -d' ' -f1)"
EXPECT_SHA1="$(sha1sum "$FILE" | cut -d' ' -f1)"
EXPECT_MD5="$(md5sum "$FILE" | cut -d' ' -f1)"
EXPECT_CRC="$(python3 -I -c 'import sys, zlib
crc = 0
with open(sys.argv[1], "rb") as f:
    for chunk in iter(lambda: f.read(1 << 20), b""):
        crc = zlib.crc32(chunk, crc)
print(crc)' "$FILE")"

FAIL=0
check() {
  if [ "$2" = "$3" ]; then echo "OK   $1"; else echo "FAIL $1: got $2, expected $3"; FAIL=1; fi
}
check size "$(get size)" "$EXPECT_SIZE"
check sha256 "$(get sha256)" "$EXPECT_SHA256"
check sha1 "$(get sha1)" "$EXPECT_SHA1"
check md5 "$(get md5)" "$EXPECT_MD5"
check crc32 "$(get crc32)" "$EXPECT_CRC"

rm -f "$FILE"
exit "$FAIL"
