import { useEventListener } from 'expo';
import { useVideoPlayer, type VideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components';
import { radius, spacing } from '@/theme';

import { needsCopy, playableUri } from '../export/videoActions';
import { anyActive } from '../locker/active';
import { fileLocker, subscribeToLocker } from '../locker/store';
import type { EvidenceItem } from '../types';
import { clockLabel, lengthLabel } from './labels';
import { planPlayback } from './playback';

type Phase = 'idle' | 'preparing' | 'playing' | 'paused' | 'ended' | 'error';

/** Moves to `seconds` into the file (past sound the file before already played). */
function seek(player: VideoPlayer, seconds: number): void {
  player.currentTime = seconds;
}

/** Plays from `seconds` into the file. */
function start(player: VideoPlayer, seconds: number): void {
  if (seconds > 0) seek(player, seconds);
  player.play();
}

/**
 * Plays a record's files one after the other, with their sound, as one recording (fix round 1,
 * group 3): body-cam's video and sound-only files, or bug mode's sound. Android .ts videos play from
 * their MP4 copy (made the first time); everything else plays from the original, which is only read.
 * Nothing plays while Saakshi is recording.
 */
export function RecordingPlayer({
  sessionId,
  items,
  autoPlay = false,
  showParts = true,
}: {
  sessionId: string;
  items: readonly EvidenceItem[];
  /** Start at once (for one sound file the user asked to play). */
  autoPlay?: boolean;
  showParts?: boolean;
}) {
  const { t } = useTranslation('record');
  const plan = useMemo(() => planPlayback(items), [items]);
  const recording = useSyncExternalStore(subscribeToLocker, anyActive);
  const first = plan.parts[0];
  // A first file that needs no copy can be handed to the player straight away.
  const direct = autoPlay && first && !needsCopy(first.item) ? fileLocker.mediaUri(sessionId, first.item.media) : null;
  const player = useVideoPlayer(direct ? { uri: direct } : null, (p) => {
    p.timeUpdateEventInterval = 0.5;
    if (direct && !recording) start(p, first.startAt);
  });
  const view = useRef<VideoView>(null);
  const index = useRef(0);
  const generation = useRef(0);
  const [phase, setPhase] = useState<Phase>(direct && !recording ? 'playing' : 'idle');
  const [part, setPart] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async (next: number) => {
    const target = plan.parts[next];
    if (!target) return;
    const mine = ++generation.current;
    index.current = next;
    setPart(next);
    setPhase('preparing');
    setPositionMs(target.offsetMs);
    try {
      const { uri } = await playableUri(sessionId, target.item);
      if (mine !== generation.current) return;
      await player.replaceAsync({ uri });
      if (mine !== generation.current) return;
      if (anyActive()) {
        // A recording started while this file was being got ready: wait, ready to play from here.
        if (target.startAt > 0) seek(player, target.startAt);
        setPhase('paused');
        return;
      }
      start(player, target.startAt);
      setPhase('playing');
    } catch (e) {
      if (mine !== generation.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  useEventListener(player, 'playToEnd', () => {
    const next = index.current + 1;
    if (next < plan.parts.length) {
      // load() itself waits if a recording has started.
      void load(next);
    } else {
      setPhase('ended');
      setPositionMs(plan.totalMs);
    }
  });

  // The button follows the player, which iOS also pauses (for example when the app leaves the screen).
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    setPhase((p) => (!isPlaying && p === 'playing' ? 'paused' : isPlaying && p === 'paused' ? 'playing' : p));
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const current = plan.parts[index.current];
    if (current) setPositionMs(current.offsetMs + Math.max(0, currentTime - current.startAt) * 1000);
  });

  // A recording started while this was playing: stop at once.
  useEffect(() => {
    if (recording) player.pause();
  }, [recording, player]);

  if (!plan.parts.length) return null;

  const playing = phase === 'playing' && !recording;
  const toggle = () => {
    if (anyActive()) return;
    if (playing) {
      player.pause();
      setPhase('paused');
    } else if (phase === 'paused' || phase === 'playing') {
      player.play();
      setPhase('playing');
    } else {
      setError(null);
      void load(0);
    }
  };

  const current = plan.parts[part];
  const hasVideo = plan.parts.some((p) => p.item.kind === 'video');
  const label = phase === 'ended' ? t('player.again') : playing ? t('player.pause') : t('player.play');

  return (
    <View style={styles.wrap}>
      {hasVideo ? (
        <View style={[styles.screen, { backgroundColor: '#000', borderRadius: radius.md }]}>
          <VideoView ref={view} player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" />
          {current?.item.kind === 'audio' ? (
            <View style={styles.overlay}>
              <AppText style={styles.overlayText}>{t('player.soundOnly')}</AppText>
            </View>
          ) : null}
        </View>
      ) : (
        // Sound only: the player still needs a view to attach to, but there is nothing to see.
        <VideoView player={player} style={styles.hidden} nativeControls={false} />
      )}
      <AppText color="textMuted" accessibilityLiveRegion="polite">
        {t('player.position', { at: clockLabel(positionMs), total: clockLabel(plan.totalMs) })}
        {showParts && plan.parts.length > 1 ? ` · ${t('player.part', { n: part + 1, count: plan.parts.length })}` : ''}
      </AppText>
      {plan.soundAlongside ? <AppText color="textMuted">{t('player.soundAlongside')}</AppText> : null}
      {showParts && current && current.gapBeforeMs > 1000 && phase !== 'idle' ? (
        <AppText color="textMuted">{t('player.gap', { length: lengthLabel(t, current.gapBeforeMs) })}</AppText>
      ) : null}
      {recording ? (
        <AppText color="warning">{t('player.busy')}</AppText>
      ) : (
        <View style={styles.buttons}>
          <Button variant="secondary" label={phase === 'preparing' ? t('player.preparing') : label} busy={phase === 'preparing'} onPress={toggle} />
          {hasVideo && current?.item.kind === 'video' && (phase === 'playing' || phase === 'paused') ? (
            <Button variant="secondary" label={t('player.fullscreen')} onPress={() => void view.current?.enterFullscreen()} />
          ) : null}
        </View>
      )}
      {phase === 'error' && error ? <AppText color="danger">{t('player.error', { detail: error })}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  screen: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  overlayText: { color: '#fff', textAlign: 'center' },
  hidden: { width: 1, height: 1, opacity: 0 },
  buttons: { gap: spacing.sm },
});
