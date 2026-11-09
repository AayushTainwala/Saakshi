#!/usr/bin/env bash
# Checks the recovery code's slow hash on Android (Pbkdf2.kt, PBKDF2-HMAC-SHA256 over the platform's
# HmacSHA256; round 2, group 1.6) on the JVM, against RFC 7914's test vectors and against Node's
# crypto.pbkdf2Sync, which the JavaScript tests use, at the app's own settings.
# Needs a JDK, Node.js and the Kotlin compiler (KOTLINC, default: kotlinc on the PATH).
# Usage: pbkdf2.sh [work dir]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC_KT="$HERE/../android/src/main/java/expo/modules/saakshidevice/Pbkdf2.kt"
KOTLINC="${KOTLINC:-kotlinc}"
WORK="${1:-$(mktemp -d)}"
mkdir -p "$WORK"

node_vector() {
  node -e 'const [p, s, i, n] = process.argv.slice(1); console.log(require("crypto").pbkdf2Sync(p, Buffer.from(s, "hex"), +i, +n, "sha256").toString("hex"))' "$@"
}
ARGS=()
for spec in "saakshi.recovery.v1|7KQM4WXH9RTD 00112233445566778899aabbccddeeff 100000 32" \
            "saakshi.recovery.v1|ABCDEFGHJKMN ffeeddccbbaa99887766554433221100 3 32" \
            "पासवर्ड 0a0b 2 48"; do
  read -r p s i n <<<"$spec"
  ARGS+=("$p" "$s" "$i" "$n" "$(node_vector "$p" "$s" "$i" "$n")")
done

"$KOTLINC" -nowarn "$SRC_KT" "$HERE/Pbkdf2Check.kt" -include-runtime -d "$WORK/check.jar" 2>&1 | grep -v '^Picked up' || true
# Arguments reach the JVM as UTF-8 only under a UTF-8 locale.
LC_ALL=C.UTF-8 java -cp "$WORK/check.jar" Pbkdf2CheckKt "${ARGS[@]}" 2>&1 | grep -v '^Picked up'
