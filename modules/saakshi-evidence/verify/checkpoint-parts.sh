#!/usr/bin/env bash
# Checks the two continuous body-cam containers against what checkpoints and upload parts need
# (fix round 1, group 2a), with 40-second test files made by ffmpeg (not by a phone):
#   - MPEG-TS, as Android's MediaRecorder writes it; checkpoints about every 10 s of bytes, on
#     188-byte packet boundaries;
#   - fragmented MP4 with 10-second fragments, as the iPhone's asset writer hands its segments over;
#     checkpoints at the end of each fragment (moof + mdat).
# For each it shows:
#   1. a running SHA-256 snapshotted at each checkpoint equals the SHA-256 of the file's prefix
#      re-read from disk;
#   2. upload parts, each ending on a checkpoint, joined in order, are the file byte for byte;
#   3. every checkpointed prefix plays (ffprobe counts its decodable video frames);
#   4. what a prefix cut in the middle of a fragment gives (fMP4 only): checkpoints sit on fragment
#      boundaries so that each checkpointed prefix is a complete, valid file.
# Usage: checkpoint-parts.sh [work dir]
set -euo pipefail
WORK="${1:-$(mktemp -d)}"
mkdir -p "$WORK"
cd "$WORK"
SRC=(-f lavfi -i testsrc2=size=1280x720:rate=30 -f lavfi -i sine=frequency=440:sample_rate=48000
  -t 40 -c:v libx264 -preset ultrafast -g 30 -c:a aac -b:a 128k)

ffmpeg -loglevel error -y "${SRC[@]}" -f mpegts body.ts
ffmpeg -loglevel error -y "${SRC[@]}" -movflags +empty_moov+default_base_moof \
  -frag_duration 10000000 -f mp4 body.mp4

python3 - body.ts body.mp4 <<'PY'
import hashlib, os, struct, subprocess, sys

def ts_checkpoints(path):
    size = os.path.getsize(path)
    return [size * k // 4 // 188 * 188 for k in (1, 2, 3)]

def mp4_checkpoints(path):
    """Offsets just after each fragment (a moof followed by its mdat)."""
    out, at, data = [], 0, open(path, 'rb').read()
    last = None
    while at + 8 <= len(data):
        size, kind = struct.unpack('>I4s', data[at:at + 8])
        if size == 1:
            size = struct.unpack('>Q', data[at + 8:at + 16])[0]
        if size < 8:
            break
        if kind == b'mdat' and last == b'moof':
            out.append(at + size)
        last = kind
        at += size
    return [o for o in out if o < len(data)]

def frames(path):
    r = subprocess.run(['ffprobe', '-v', 'quiet', '-count_frames', '-select_streams', 'v:0',
                        '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    return (r.stdout.strip().splitlines() or ['0'])[0] or '0'

ok = True
for path in sys.argv[1:]:
    data = open(path, 'rb').read()
    checkpoints = ts_checkpoints(path) if path.endswith('.ts') else mp4_checkpoints(path)
    print(f'\n{path}: {len(data):,} bytes, checkpoints at {", ".join(f"{c:,}" for c in checkpoints)}')

    # 1. Running hash, snapshotted at each checkpoint, against the prefix re-read from disk.
    running, pos = hashlib.sha256(), 0
    for c in checkpoints:
        running.update(data[pos:c]); pos = c
        snapshot = running.copy().hexdigest()
        reread = hashlib.sha256(open(path, 'rb').read(c)).hexdigest()
        same = snapshot == reread
        ok &= same
        print(f'  checkpoint {c:>10,}: running SHA-256 {"=" if same else "!="} re-read prefix, {snapshot[:16]}…')

    # 2. Parts ending on every second checkpoint, then the rest; joined in order.
    bounds = [0] + checkpoints[1::2] + [len(data)]
    parts = [data[a:b] for a, b in zip(bounds, bounds[1:])]
    joined = b''.join(parts)
    same = joined == data
    ok &= same
    print(f'  {len(parts)} parts ({", ".join(f"{len(p):,}" for p in parts)} bytes) joined: '
          f'{"byte for byte the file" if same else "DIFFERENT"}')

    # 3. Every checkpointed prefix plays.
    for c in checkpoints:
        name = f'prefix-{c}-{os.path.basename(path)}'
        open(name, 'wb').write(data[:c])
        n = int(frames(name))
        ok &= n > 0
        print(f'  prefix to checkpoint {c:>10,}: {n} video frames decode')

    # 4. fMP4 only: a prefix cut in the middle of a fragment.
    if path.endswith('.mp4') and len(checkpoints) >= 2:
        middle = (checkpoints[0] + checkpoints[1]) // 2
        name = f'prefix-mid-{os.path.basename(path)}'
        open(name, 'wb').write(data[:middle])
        print(f'  prefix cut mid-fragment at {middle:,}: {frames(name)} video frames decode '
              f'(an incomplete fragment; the complete prefix to {checkpoints[0]:,} is a valid file)')

print('\nOK' if ok else '\nFAILED')
sys.exit(0 if ok else 1)
PY
