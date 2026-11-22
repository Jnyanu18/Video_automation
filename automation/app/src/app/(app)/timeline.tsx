import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Icon, IconName } from '../../components/Icon';
import { T, Input, Button, EmptyState, Chips } from '../../components/ui';
import { useToast } from '../../state/toast';
import { useStoryboards } from '../../state/useStoryboards';
import { editor, Storyboard, Scene } from '../../api/editor';
import { errorText } from '../../api/client';
import { radius, spacing, useTheme } from '../../theme';
import { StudioTabs } from '../../components/StudioTabs';

interface TrackSegment {
  id: string;
  label: string;
  subLabel?: string;
  start: number; // in seconds
  end: number;   // in seconds
  type: 'video' | 'caption' | 'zoom' | 'sfx';
  customData?: {
    speed?: number;
    volume?: number;
    transition?: string;
  };
}

interface Track {
  id: string;
  title: string;
  icon: IconName;
  cueCount: number;
  locked: boolean;
  visible: boolean;
  segments: TrackSegment[];
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

function parseOutputTimestamp(rangeStr?: string, fallbackStart = 0, fallbackDuration = 3): { start: number; end: number } {
  if (rangeStr && rangeStr.includes('-')) {
    const [rawStart, rawEnd] = rangeStr.split('-').map((s) => s.trim());
    const start = parseTimeToSeconds(rawStart);
    const end = parseTimeToSeconds(rawEnd);
    if (end > start) {
      return { start, end };
    }
  }
  return { start: fallbackStart, end: fallbackStart + fallbackDuration };
}

export default function TimelineEditor() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();

  // Read ?sb=<id>
  const params = useLocalSearchParams<{ sb?: string }>();
  const { list, current: sb, select, reload, loading } = useStoryboards();

  // Toolbar & Inspector state
  const [version, setVersion] = useState(1);
  const [fps, setFps] = useState(30);
  const [zoomLevel, setZoomLevel] = useState(140);
  const [canUndo, setCanUndo] = useState(true);
  const [canRedo, setCanRedo] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showInspector, setShowInspector] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rendering, setRendering] = useState<'preview' | 'final' | null>(null);

  // Inspector clip values
  const [selectedClipId, setSelectedClipId] = useState<string>('');
  const [clipName, setClipName] = useState('');
  const [clipStart, setClipStart] = useState('00:00:00');
  const [clipEnd, setClipEnd] = useState('00:03:00');
  const [transition, setTransition] = useState('Cut');
  const [playbackSpeed, setPlaybackSpeed] = useState(100);
  const [clipVolume, setClipVolume] = useState(100);

  // Transitions list
  const transitionsList = ['Cut', 'Cross Dissolve', 'Zoom Wipe', 'Dip to Black', 'Glitch Cut'];

  // Track lock and visibility states
  const [trackMeta, setTrackMeta] = useState<Record<string, { visible: boolean; locked: boolean }>>({
    'track-video': { visible: true, locked: false },
    'track-captions': { visible: true, locked: false },
    'track-zooms': { visible: true, locked: false },
    'track-sfx': { visible: true, locked: false },
  });

  const toggleTrackVisibility = (trackId: string) => {
    setTrackMeta((prev) => ({
      ...prev,
      [trackId]: {
        visible: prev[trackId] ? !prev[trackId].visible : false,
        locked: prev[trackId]?.locked ?? false,
      },
    }));
  };

  const toggleTrackLock = (trackId: string) => {
    setTrackMeta((prev) => ({
      ...prev,
      [trackId]: {
        visible: prev[trackId]?.visible ?? true,
        locked: prev[trackId] ? !prev[trackId].locked : true,
      },
    }));
  };

  // Convert current seconds to timecode format
  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const frames = Math.floor((sec % 1) * fps);
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Calculate TOTAL_TIMELINE_SEC dynamically from sb.storyboard.duration.output_seconds or sum of scene durations
  const totalTimelineSec = useMemo(() => {
    if (sb?.storyboard?.duration?.output_seconds && sb.storyboard.duration.output_seconds > 0) {
      return sb.storyboard.duration.output_seconds;
    }
    const scenes = sb?.storyboard?.scenes ?? [];
    if (scenes.length > 0) {
      let maxEnd = 0;
      let sumDur = 0;
      scenes.forEach((sc, i) => {
        const { end } = parseOutputTimestamp(sc.timestamp_output, sumDur, sc.duration || 3);
        if (end > maxEnd) maxEnd = end;
        sumDur += sc.duration || (end > sumDur ? end - sumDur : 3);
      });
      if (maxEnd > 0) return maxEnd;
      if (sumDur > 0) return sumDur;
    }
    return 30;
  }, [sb]);

  // Parse storyboard into multi-track data
  const tracks: Track[] = useMemo(() => {
    const scenes: Scene[] = sb?.storyboard?.scenes ?? [];

    // Track 1: Video Cut
    const videoSegments: TrackSegment[] = scenes.map((sc, i) => {
      const { start, end } = parseOutputTimestamp(sc.timestamp_output, i * 3, sc.duration || 3);
      const sub = [sc.framing, sc.camera_motion].filter(Boolean).join(' · ');
      return {
        id: `v-${sc.scene_number || i + 1}`,
        label: `Scene ${sc.scene_number || i + 1} · ${sc.type || 'Cut'}`,
        subLabel: sub || `${sc.framing} · ${sc.camera_motion}`,
        start,
        end,
        type: 'video',
        customData: { speed: 100, volume: 100, transition: 'Cut' },
      };
    });

    // Track 2: Karaoke Captions
    const captionSegments: TrackSegment[] = scenes
      .filter((sc) => sc.caption && sc.caption.trim().length > 0)
      .map((sc, i) => {
        const { start, end } = parseOutputTimestamp(sc.timestamp_output, i * 3, sc.duration || 3);
        return {
          id: `c-${sc.scene_number || i + 1}`,
          label: `"${sc.caption}"`,
          start,
          end,
          type: 'caption',
        };
      });

    // Track 3: Punch-In Motion (zooms)
    const zoomSegments: TrackSegment[] = [];
    if (sb?.director?.plan?.zooms?.length) {
      sb.director.plan.zooms.forEach((z, i) => {
        zoomSegments.push({
          id: `z-${i + 1}`,
          label: 'Punch-In 1.15×',
          subLabel: `${z.start.toFixed(1)}s - ${z.end.toFixed(1)}s`,
          start: z.start,
          end: z.end,
          type: 'zoom',
        });
      });
    } else {
      scenes.forEach((sc, i) => {
        const motion = (sc.camera_motion || '').toLowerCase();
        const action = (sc.action || '').toLowerCase();
        if (
          motion.includes('punch') ||
          motion.includes('push') ||
          motion.includes('zoom') ||
          action.includes('punch-in')
        ) {
          const { start, end } = parseOutputTimestamp(sc.timestamp_output, i * 3, sc.duration || 3);
          zoomSegments.push({
            id: `z-${sc.scene_number || i + 1}`,
            label: sc.camera_motion || 'Punch-In 1.15×',
            subLabel: `${start.toFixed(1)}s - ${end.toFixed(1)}s`,
            start,
            end,
            type: 'zoom',
          });
        }
      });
    }

    // Track 4: Sound Design & SFX
    const sfxSegments: TrackSegment[] = [];
    scenes.forEach((sc, i) => {
      const { start: sceneStart } = parseOutputTimestamp(sc.timestamp_output, i * 3, sc.duration || 3);
      if (Array.isArray(sc.sfx)) {
        sc.sfx.forEach((item, sfxIdx) => {
          const atOffset = item.at ?? 0;
          const sfxStart = sceneStart + atOffset;
          const sfxEnd = sfxStart + 0.8;
          sfxSegments.push({
            id: `sfx-${sc.scene_number || i + 1}-${sfxIdx}`,
            label: `♫ ${item.name}`,
            start: sfxStart,
            end: sfxEnd,
            type: 'sfx',
          });
        });
      }
    });

    return [
      {
        id: 'track-video',
        title: 'Video Cut',
        icon: 'video',
        cueCount: videoSegments.length,
        locked: trackMeta['track-video']?.locked ?? false,
        visible: trackMeta['track-video']?.visible ?? true,
        segments: videoSegments,
      },
      {
        id: 'track-captions',
        title: 'Karaoke Capt...',
        icon: 'subtitles',
        cueCount: captionSegments.length,
        locked: trackMeta['track-captions']?.locked ?? false,
        visible: trackMeta['track-captions']?.visible ?? true,
        segments: captionSegments,
      },
      {
        id: 'track-zooms',
        title: 'Punch-In Mo...',
        icon: 'zap',
        cueCount: zoomSegments.length,
        locked: trackMeta['track-zooms']?.locked ?? false,
        visible: trackMeta['track-zooms']?.visible ?? true,
        segments: zoomSegments,
      },
      {
        id: 'track-sfx',
        title: 'Sound Desig...',
        icon: 'volume',
        cueCount: sfxSegments.length,
        locked: trackMeta['track-sfx']?.locked ?? false,
        visible: trackMeta['track-sfx']?.visible ?? true,
        segments: sfxSegments,
      },
    ];
  }, [sb, trackMeta]);

  // Sync selected clip with first segment when storyboard changes
  useEffect(() => {
    if (tracks[0]?.segments?.length) {
      const first = tracks[0].segments[0];
      setSelectedClipId(first.id);
      setClipName(first.label);
      setClipStart(formatTimecode(first.start));
      setClipEnd(formatTimecode(first.end));
    }
  }, [sb?.id]);

  // Handle selecting a segment in the timeline
  const handleSelectSegment = (seg: TrackSegment) => {
    setSelectedClipId(seg.id);
    setShowInspector(true);
    setClipName(seg.label);
    setClipStart(formatTimecode(seg.start));
    setClipEnd(formatTimecode(seg.end));
    setPlaybackSpeed(seg.customData?.speed ?? 100);
    setClipVolume(seg.customData?.volume ?? (seg.type === 'sfx' ? 90 : 100));
    setTransition(seg.customData?.transition ?? 'Cut');
  };

  // Render trigger handler
  const handleRender = async (quality: 'preview' | 'final') => {
    if (!sb?.id) return;
    setRendering(quality);
    try {
      await editor.render(sb.id, quality);
      toast(`${quality === 'preview' ? 'Preview' : 'Final'} render started!`);
      await reload();
    } catch (e) {
      toast(`Render failed: ${errorText(e)}`);
    } finally {
      setRendering(null);
    }
  };

  // Dynamic ruler marks based on total duration
  const rulerTicks = useMemo(() => {
    const count = 6;
    const step = totalTimelineSec / count;
    const ticks: string[] = [];
    for (let i = 0; i <= count; i++) {
      const sec = i * step;
      const mins = Math.floor(sec / 60);
      const secs = Math.floor(sec % 60);
      ticks.push(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
    return ticks;
  }, [totalTimelineSec]);

  // Empty or Loading State
  if (loading || !sb || !sb.storyboard || !sb.storyboard.scenes || sb.storyboard.scenes.length === 0) {
    return (
      <View style={localStyles.screenContainer}>
        <View style={localStyles.mainContentArea}>
          {list && list.length > 0 && (
            <View style={localStyles.switcherRow}>
              <View style={localStyles.switcherLabelWrap}>
                <Icon name="film" size={14} color="#6B7280" />
                <T style={localStyles.switcherLabel}>Storyboards:</T>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={localStyles.switcherChipsContainer}
              >
                <Chips
                  options={list.map((s) => ({
                    value: s.id,
                    label: s.storyboard?.title || `Storyboard ${s.id.slice(0, 6)}`,
                  }))}
                  value={sb?.id ?? ''}
                  onChange={(id) => {
                    if (id) select(id);
                  }}
                />
              </ScrollView>
            </View>
          )}
          <EmptyState
            icon="film"
            title="No storyboard loaded"
            message="No storyboard loaded. Create a storyboard in Auto-Edit or select one to view its timeline."
            action={
              <Button
                label="Create Storyboard"
                icon="plus"
                variant="primary"
                onPress={() => router.push('/new')}
              />
            }
          />
        </View>
      </View>
    );
  }

  const scenes = sb.storyboard.scenes;

  return (
    <View style={localStyles.screenContainer}>
      {/* Main Workspace (Left) */}
      <View style={localStyles.mainContentArea}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={localStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Unified Creative Suite Navigation Bar */}
          <StudioTabs
            activeTab="timeline"
            sbId={sb.id}
            title={sb.storyboard?.title}
            stage={sb.stage}
            approved={sb.approved}
            rendering={rendering !== null}
            onPreviewRender={() => handleRender('preview')}
            onFinalRender={sb.approved ? () => handleRender('final') : undefined}
          />

          {/* Subheader / Status Bar */}
          <View style={localStyles.subHeaderBar}>
            {/* Left Controls */}
            <View style={localStyles.subHeaderLeft}>
              <Pressable
                style={localStyles.pillDropdown}
                onPress={() => {
                  const nextV = version === 1 ? 2 : 1;
                  setVersion(nextV);
                  toast(`Switched to Plan Version ${nextV}`);
                }}
              >
                <T style={localStyles.pillDropdownText}>{`Plan Version ${version}`}</T>
                <Icon name="chevron-down" size={14} color="#6B7280" />
              </Pressable>

              <Pressable
                style={localStyles.pillDropdown}
                onPress={() => {
                  const nextFps = fps === 30 ? 60 : fps === 60 ? 24 : 30;
                  setFps(nextFps);
                  toast(`Frame base set to ${nextFps} fps`);
                }}
              >
                <T style={localStyles.pillDropdownText}>{`${fps} fps`}</T>
                <Icon name="chevron-down" size={14} color="#6B7280" />
              </Pressable>

              {/* Approval status pill */}
              <View style={localStyles.approvalBadge}>
                <Icon
                  name={sb.approved ? 'check-circle' : 'alert'}
                  size={13}
                  color={sb.approved ? '#10B981' : '#F59E0B'}
                />
                <T
                  style={[
                    localStyles.approvalText,
                    { color: sb.approved ? '#065F46' : '#92400E' },
                  ]}
                >
                  {sb.approved ? 'Approved' : 'Unapproved'}
                </T>
              </View>
            </View>

            {/* Right Status Indicator */}
            <View style={localStyles.subHeaderRight}>
              <View
                style={[
                  localStyles.statusLiveDot,
                  sb.render_job?.status === 'running' && { backgroundColor: '#3B82F6' },
                ]}
              />
              <T style={localStyles.statusLiveText}>
                {sb.render_job?.status === 'running'
                  ? 'Render running…'
                  : sb.status === 'processing'
                  ? 'Processing storyboard…'
                  : 'Storyboard ready'}
              </T>
              <T style={localStyles.statusMutedText}>
                {sb.updated_at
                  ? `Updated ${new Date(sb.updated_at * 1000).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Autosaved'}
              </T>
            </View>
          </View>

          {/* Transport / Actions Toolbar */}
          <View style={localStyles.transportBar}>
            {/* Left Tools Group */}
            <View style={localStyles.transportLeftGroup}>
              <Pressable
                style={[localStyles.toolIconBtn, !canUndo && { opacity: 0.4 }]}
                disabled={!canUndo}
                onPress={() => {
                  setCanUndo(false);
                  setCanRedo(true);
                  toast('Undo action performed');
                }}
              >
                <Icon name="back" size={16} color="#4B5563" />
              </Pressable>

              <Pressable
                style={[localStyles.toolIconBtn, !canRedo && { opacity: 0.4 }]}
                disabled={!canRedo}
                onPress={() => {
                  setCanRedo(false);
                  setCanUndo(true);
                  toast('Redo action performed');
                }}
              >
                <Icon name="forward" size={16} color="#4B5563" />
              </Pressable>

              {/* Zoom Widget */}
              <View style={localStyles.zoomWidget}>
                <Pressable
                  style={localStyles.zoomBtn}
                  onPress={() => setZoomLevel((z) => Math.max(80, z - 20))}
                >
                  <Icon name="zoom-out" size={14} color="#4B5563" />
                </Pressable>
                <T style={localStyles.zoomText}>{`${zoomLevel}%`}</T>
                <Pressable
                  style={localStyles.zoomBtn}
                  onPress={() => setZoomLevel((z) => Math.min(240, z + 20))}
                >
                  <Icon name="zoom-in" size={14} color="#4B5563" />
                </Pressable>
              </View>

              {/* Fit / Maximize Tool */}
              <Pressable
                style={localStyles.toolIconBtn}
                onPress={() => toast('Fit to view enabled')}
              >
                <Icon name="maximize" size={16} color="#4B5563" />
              </Pressable>

              {/* Playhead Split Control */}
              <Pressable
                style={localStyles.splitMarkerBtn}
                onPress={() => toast('Razor cut applied at current playhead')}
              >
                <T style={localStyles.splitMarkerText}>-0-</T>
              </Pressable>
            </View>

            {/* Center Timecode Display */}
            <View style={localStyles.timecodeContainer}>
              <T style={localStyles.timecodeCurrent}>{formatTimecode(currentTime)}</T>
              <T style={localStyles.timecodeDivider}>/</T>
              <T style={localStyles.timecodeTotal}>{formatTimecode(totalTimelineSec)}</T>
            </View>

            {/* Right Action Buttons */}
            <View style={localStyles.transportRightGroup}>
              {/* Preview Render Button */}
              <Pressable
                style={({ pressed }: any) => [
                  localStyles.previewRenderBtn,
                  rendering === 'preview' && { opacity: 0.6 },
                  pressed && { backgroundColor: '#F3F4F6' },
                  Platform.OS === 'web' && ({ cursor: rendering ? 'not-allowed' : 'pointer' } as any),
                ]}
                disabled={!!rendering}
                onPress={() => handleRender('preview')}
              >
                <Icon name="play" size={14} color="#4B5563" />
                <T style={localStyles.previewRenderText}>
                  {rendering === 'preview' ? 'Rendering…' : 'Preview Render'}
                </T>
              </Pressable>

              {/* Final Render Button (enabled if sb.approved) */}
              <Pressable
                style={({ pressed }: any) => [
                  localStyles.finalRenderBtn,
                  !sb.approved && localStyles.btnDisabled,
                  rendering === 'final' && { opacity: 0.6 },
                  pressed && sb.approved && { opacity: 0.9 },
                  Platform.OS === 'web' && ({ cursor: !sb.approved || rendering ? 'not-allowed' : 'pointer' } as any),
                ]}
                disabled={!sb.approved || !!rendering}
                onPress={() => handleRender('final')}
                // @ts-ignore
                title={!sb.approved ? 'Requires approval in Storyboard cards' : undefined}
              >
                <Icon name="check" size={15} color="#FFFFFF" />
                <T style={localStyles.finalRenderText}>
                  {rendering === 'final' ? 'Rendering…' : 'Final Render'}
                </T>
              </Pressable>
            </View>
          </View>

          {/* Timeline Multi-Track Canvas Card */}
          <View style={localStyles.timelineCard}>
            {/* Time Ruler Bar */}
            <View style={localStyles.rulerRow}>
              <View style={localStyles.rulerTracksHeader}>
                <T style={localStyles.tracksTitleText}>TRACKS</T>
              </View>

              {/* Timeline Ruler Marks with Playhead */}
              <Pressable
                style={localStyles.rulerMarksContainer}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // @ts-ignore
                  const width = e.currentTarget?.offsetWidth || 600;
                  const ratio = Math.max(0, Math.min(1, locationX / width));
                  setCurrentTime(parseFloat((ratio * totalTimelineSec).toFixed(2)));
                }}
              >
                {rulerTicks.map((timeStr, idx) => (
                  <View key={idx} style={localStyles.rulerTick}>
                    <T style={localStyles.rulerTickText}>{timeStr}</T>
                  </View>
                ))}
              </Pressable>
            </View>

            {/* Tracks Stack & Integrated Playhead Line */}
            <View style={localStyles.tracksContainer}>
              {/* Playhead Overlay Vertical Line */}
              <View
                pointerEvents="none"
                style={[
                  localStyles.playheadVerticalLine,
                  {
                    left: `calc(130px + (100% - 130px) * ${
                      totalTimelineSec > 0 ? Math.min(1, Math.max(0, currentTime / totalTimelineSec)) : 0
                    })` as any,
                  },
                ]}
              >
                {/* Playhead Needle Head */}
                <View style={localStyles.playheadNeedleHead} />
              </View>

              {/* Track 1: Video Cut */}
              <View style={localStyles.trackRow}>
                <View style={localStyles.trackHeaderCol}>
                  <View style={[localStyles.trackIconCircle, { backgroundColor: '#2B3252' }]}>
                    <Icon name="video" size={14} color="#818CF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={localStyles.trackNameText}>Video Cut</T>
                    <T style={localStyles.cueCountText}>{tracks[0].cueCount} cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-video')}>
                      <Icon
                        name="eye"
                        size={13}
                        color={tracks[0].visible ? '#818CF8' : '#475569'}
                      />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-video')}>
                      <Icon
                        name="lock"
                        size={13}
                        color={tracks[0].locked ? '#F59E0B' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Video Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[0].visible &&
                    tracks[0].segments.map((seg) => {
                      const leftPct = totalTimelineSec > 0 ? (seg.start / totalTimelineSec) * 100 : 0;
                      const widthPct =
                        totalTimelineSec > 0
                          ? Math.max(1, ((seg.end - seg.start) / totalTimelineSec) * 100)
                          : 10;
                      const isSelected = selectedClipId === seg.id;

                      return (
                        <Pressable
                          key={seg.id}
                          onPress={() => handleSelectSegment(seg)}
                          style={[
                            localStyles.videoBlock,
                            {
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            },
                            isSelected && localStyles.selectedBlockHighlight,
                            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                          ]}
                        >
                          <T style={localStyles.blockTitleText} numberOfLines={1}>
                            {seg.label}
                          </T>
                          {seg.subLabel ? (
                            <T style={localStyles.blockSubText} numberOfLines={1}>
                              {seg.subLabel}
                            </T>
                          ) : null}
                        </Pressable>
                      );
                    })}
                </View>
              </View>

              {/* Track 2: Karaoke Captions */}
              <View style={localStyles.trackRow}>
                <View style={localStyles.trackHeaderCol}>
                  <View style={[localStyles.trackIconCircle, { backgroundColor: '#23254A' }]}>
                    <Icon name="subtitles" size={14} color="#A78BFA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={localStyles.trackNameText}>Karaoke Capt...</T>
                    <T style={localStyles.cueCountText}>{tracks[1].cueCount} cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-captions')}>
                      <Icon
                        name="eye"
                        size={13}
                        color={tracks[1].visible ? '#A78BFA' : '#475569'}
                      />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-captions')}>
                      <Icon
                        name="lock"
                        size={13}
                        color={tracks[1].locked ? '#F59E0B' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Caption Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[1].visible &&
                    tracks[1].segments.map((seg) => {
                      const leftPct = totalTimelineSec > 0 ? (seg.start / totalTimelineSec) * 100 : 0;
                      const widthPct =
                        totalTimelineSec > 0
                          ? Math.max(1, ((seg.end - seg.start) / totalTimelineSec) * 100)
                          : 10;
                      const isSelected = selectedClipId === seg.id;

                      return (
                        <Pressable
                          key={seg.id}
                          onPress={() => handleSelectSegment(seg)}
                          style={[
                            localStyles.captionBlock,
                            {
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            },
                            isSelected && localStyles.selectedBlockHighlight,
                            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                          ]}
                        >
                          <T style={localStyles.captionText} numberOfLines={1}>
                            {seg.label}
                          </T>
                        </Pressable>
                      );
                    })}
                </View>
              </View>

              {/* Track 3: Punch-In Motion */}
              <View style={localStyles.trackRow}>
                <View style={localStyles.trackHeaderCol}>
                  <View style={[localStyles.trackIconCircle, { backgroundColor: '#3A270D' }]}>
                    <Icon name="zap" size={14} color="#FBBF24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={localStyles.trackNameText}>Punch-In Mo...</T>
                    <T style={localStyles.cueCountText}>{tracks[2].cueCount} cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-zooms')}>
                      <Icon
                        name="eye"
                        size={13}
                        color={tracks[2].visible ? '#FBBF24' : '#475569'}
                      />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-zooms')}>
                      <Icon
                        name="lock"
                        size={13}
                        color={tracks[2].locked ? '#F59E0B' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Zoom Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[2].visible &&
                    tracks[2].segments.map((seg) => {
                      const leftPct = totalTimelineSec > 0 ? (seg.start / totalTimelineSec) * 100 : 0;
                      const widthPct =
                        totalTimelineSec > 0
                          ? Math.max(1, ((seg.end - seg.start) / totalTimelineSec) * 100)
                          : 10;
                      const isSelected = selectedClipId === seg.id;

                      return (
                        <Pressable
                          key={seg.id}
                          onPress={() => handleSelectSegment(seg)}
                          style={[
                            localStyles.zoomBlock,
                            {
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            },
                            isSelected && localStyles.selectedBlockHighlight,
                            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                          ]}
                        >
                          <T style={localStyles.zoomTitleText} numberOfLines={1}>
                            {seg.label}
                          </T>
                          {seg.subLabel ? (
                            <T style={localStyles.zoomSubText} numberOfLines={1}>
                              {seg.subLabel}
                            </T>
                          ) : null}
                        </Pressable>
                      );
                    })}
                </View>
              </View>

              {/* Track 4: Sound Design & SFX */}
              <View style={localStyles.trackRow}>
                <View style={localStyles.trackHeaderCol}>
                  <View style={[localStyles.trackIconCircle, { backgroundColor: '#0B332C' }]}>
                    <Icon name="volume" size={14} color="#34D399" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={localStyles.trackNameText}>Sound Desig...</T>
                    <T style={localStyles.cueCountText}>{tracks[3].cueCount} cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-sfx')}>
                      <Icon
                        name="eye"
                        size={13}
                        color={tracks[3].visible ? '#34D399' : '#475569'}
                      />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-sfx')}>
                      <Icon
                        name="lock"
                        size={13}
                        color={tracks[3].locked ? '#F59E0B' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* SFX Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[3].visible &&
                    tracks[3].segments.map((seg) => {
                      const leftPct = totalTimelineSec > 0 ? (seg.start / totalTimelineSec) * 100 : 0;
                      const widthPct =
                        totalTimelineSec > 0
                          ? Math.max(1, ((seg.end - seg.start) / totalTimelineSec) * 100)
                          : 8;
                      const isSelected = selectedClipId === seg.id;

                      return (
                        <Pressable
                          key={seg.id}
                          onPress={() => handleSelectSegment(seg)}
                          style={[
                            localStyles.sfxBlock,
                            {
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            },
                            isSelected && localStyles.selectedBlockHighlight,
                            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                          ]}
                        >
                          {/* Audio Waveform visualization */}
                          <View style={localStyles.audioWaveGraphic}>
                            <View style={[localStyles.audioBar, { height: 8 }]} />
                            <View style={[localStyles.audioBar, { height: 16 }]} />
                            <View style={[localStyles.audioBar, { height: 12 }]} />
                            <View style={[localStyles.audioBar, { height: 20 }]} />
                            <View style={[localStyles.audioBar, { height: 10 }]} />
                            <View style={[localStyles.audioBar, { height: 6 }]} />
                          </View>
                          <T style={localStyles.sfxTitleText} numberOfLines={1}>
                            {seg.label}
                          </T>
                        </Pressable>
                      );
                    })}
                </View>
              </View>
            </View>

            {/* Bottom Scrubber / Overview Minimap */}
            <View style={localStyles.minimapBar}>
              <View style={{ paddingHorizontal: spacing.sm }}>
                <Icon name="sliders" size={14} color="#64748B" />
              </View>

              <View style={localStyles.minimapRail}>
                {scenes.map((sc, idx) => {
                  const dur = sc.duration || 3;
                  const bgColors = ['#3B436B', '#4F46E5', '#3B436B', '#312E81', '#4338CA', '#2563EB'];
                  return (
                    <View
                      key={`minimap-${sc.scene_number || idx}`}
                      style={[
                        localStyles.minimapChunk,
                        { flex: Math.max(1, dur), backgroundColor: bgColors[idx % bgColors.length] },
                      ]}
                    />
                  );
                })}
                {/* Active viewport slider window */}
                <View style={localStyles.minimapViewportIndicator} />
              </View>

              <T style={localStyles.minimapTotalText}>{formatTimecode(totalTimelineSec)} total</T>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Right Inspector Panel: Clip Properties */}
      {showInspector && (
        <View style={localStyles.inspectorPanel}>
          {/* Panel Header */}
          <View style={localStyles.inspectorHeader}>
            <T style={localStyles.inspectorTitle}>Clip Properties</T>
            <Pressable
              onPress={() => setShowInspector(false)}
              hitSlop={8}
              style={({ pressed }: any) => [
                localStyles.closeBtn,
                pressed && { opacity: 0.7 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Icon name="x" size={18} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={localStyles.inspectorScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Video Player Preview Window */}
            <View style={localStyles.playerPreviewBox}>
              <Pressable
                style={localStyles.playCenterButton}
                onPress={() => setIsPlaying(!isPlaying)}
              >
                <Icon name={isPlaying ? 'refresh' : 'play'} size={24} color="#FFFFFF" />
              </Pressable>
              <View style={localStyles.playerSceneBadge}>
                <T style={localStyles.playerSceneBadgeText} numberOfLines={1}>
                  {clipName || 'Scene Preview'}
                </T>
              </View>
            </View>

            {/* Clip Name Field */}
            <View style={localStyles.fieldGroup}>
              <T style={localStyles.fieldLabel}>Clip name</T>
              <Input
                value={clipName}
                onChangeText={setClipName}
                style={localStyles.formInput}
              />
            </View>

            {/* Start and End Times Side by Side */}
            <View style={localStyles.sideBySideRow}>
              <View style={{ flex: 1 }}>
                <T style={localStyles.fieldLabel}>Start</T>
                <Input
                  value={clipStart}
                  onChangeText={setClipStart}
                  style={[localStyles.formInput, localStyles.monoInput]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <T style={localStyles.fieldLabel}>End</T>
                <Input
                  value={clipEnd}
                  onChangeText={setClipEnd}
                  style={[localStyles.formInput, localStyles.monoInput]}
                />
              </View>
            </View>

            {/* Transition in Dropdown */}
            <View style={localStyles.fieldGroup}>
              <T style={localStyles.fieldLabel}>Transition in</T>
              <Pressable
                style={localStyles.dropdownTrigger}
                onPress={() => {
                  const currIdx = transitionsList.indexOf(transition);
                  const nextTr = transitionsList[(currIdx + 1) % transitionsList.length];
                  setTransition(nextTr);
                  toast(`Transition set to ${nextTr}`);
                }}
              >
                <T style={localStyles.dropdownTriggerText}>{transition}</T>
                <Icon name="chevron-down" size={14} color="#6B7280" />
              </Pressable>
            </View>

            {/* Playback Speed Slider */}
            <View style={localStyles.sliderGroup}>
              <View style={localStyles.sliderLabelRow}>
                <T style={localStyles.fieldLabel}>Playback speed</T>
                <T style={localStyles.sliderValueText}>{`${playbackSpeed}%`}</T>
              </View>

              <Pressable
                style={localStyles.sliderTrack}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // @ts-ignore
                  const width = e.currentTarget?.offsetWidth || 280;
                  const pct = Math.round(Math.max(25, Math.min(200, (locationX / width) * 200)));
                  setPlaybackSpeed(pct);
                }}
              >
                <View
                  style={[
                    localStyles.sliderFillBar,
                    { width: `${Math.min(100, (playbackSpeed / 200) * 100)}%` },
                  ]}
                />
                <View
                  style={[
                    localStyles.sliderThumb,
                    { left: `${Math.min(96, (playbackSpeed / 200) * 100)}%` },
                  ]}
                />
              </Pressable>
            </View>

            {/* Clip Volume Slider */}
            <View style={localStyles.sliderGroup}>
              <View style={localStyles.sliderLabelRow}>
                <T style={localStyles.fieldLabel}>Clip volume</T>
                <T style={localStyles.sliderValueText}>{`${clipVolume}%`}</T>
              </View>

              <Pressable
                style={localStyles.sliderTrack}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // @ts-ignore
                  const width = e.currentTarget?.offsetWidth || 280;
                  const pct = Math.round(Math.max(0, Math.min(100, (locationX / width) * 100)));
                  setClipVolume(pct);
                }}
              >
                <View style={[localStyles.sliderFillBar, { width: `${clipVolume}%` }]} />
                <View style={[localStyles.sliderThumb, { left: `${Math.min(96, clipVolume)}%` }]} />
              </Pressable>
            </View>

            {/* Bottom Apply Action */}
            <View style={{ marginTop: spacing.md }}>
              <Pressable
                style={({ pressed }: any) => [
                  localStyles.applyAllBtn,
                  pressed && { backgroundColor: '#F3F4F6' },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={() => toast(`Applied "${transition}" transition to all cuts`)}
              >
                <T style={localStyles.applyAllBtnText}>Apply transition to all cuts</T>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
  },
  mainContentArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  scrollContent: {
    gap: spacing.lg,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  cardsLinkText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },
  newReelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C4CF0',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    shadowColor: '#6C4CF0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newReelBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Storyboard Switcher Bar */
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switcherLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  switcherLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  switcherChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  /* Subheader Controls */
  subHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  subHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pillDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  pillDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  approvalText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusLiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusMutedText: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  /* Transport Bar */
  transportBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  transportLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolIconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  zoomWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    height: 34,
  },
  zoomBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 4,
  },
  splitMarkerBtn: {
    paddingHorizontal: 8,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  splitMarkerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6C4CF0',
    letterSpacing: 0.5,
  },

  /* Timecode */
  timecodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timecodeCurrent: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
    letterSpacing: 0.5,
  },
  timecodeDivider: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  timecodeTotal: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },

  /* Right Action Buttons in Transport Bar */
  transportRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewRenderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  previewRenderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  finalRenderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  finalRenderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.45,
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
    shadowOpacity: 0,
  },

  /* Dark Timeline Canvas Card */
  timelineCard: {
    backgroundColor: '#0C0E17',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2437',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },

  /* Ruler Row */
  rulerRow: {
    flexDirection: 'row',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2033',
    alignItems: 'center',
  },
  rulerTracksHeader: {
    width: 130,
    paddingHorizontal: spacing.md,
  },
  tracksTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  rulerMarksContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    position: 'relative',
    height: '100%',
    alignItems: 'center',
  },
  rulerTick: {
    alignItems: 'center',
  },
  rulerTickText: {
    fontSize: 10,
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
    color: '#64748B',
    fontWeight: '500',
  },

  /* Tracks Stack Container */
  tracksContainer: {
    position: 'relative',
    paddingVertical: 4,
  },

  /* Playhead Line */
  playheadVerticalLine: {
    position: 'absolute',
    top: -38,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
  playheadNeedleHead: {
    position: 'absolute',
    top: 0,
    left: -5,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6C4CF0',
  },

  /* Track Row */
  trackRow: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#141824',
    alignItems: 'center',
  },
  trackHeaderCol: {
    width: 130,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  cueCountText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  trackActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  /* Track Lane */
  trackLane: {
    flex: 1,
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
  },

  /* Track Blocks / Clips */
  videoBlock: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: '#272F4A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374266',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  selectedBlockHighlight: {
    backgroundColor: '#353D68',
    borderColor: '#6C4CF0',
    borderWidth: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 0 12px rgba(108, 76, 240, 0.5)',
      },
    }),
  },
  blockTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  blockSubText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },

  captionBlock: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: '#1E2345',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2D3466',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  captionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C7D2FE',
  },

  zoomBlock: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: '#52340E',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#784D16',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  zoomTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FEF3C7',
  },
  zoomSubText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FDE68A',
  },

  sfxBlock: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: '#0B3B34',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#135C52',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audioWaveGraphic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  audioBar: {
    width: 2,
    backgroundColor: '#34D399',
    borderRadius: 1,
  },
  sfxTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A7F3D0',
  },

  /* Minimap / Scrubber */
  minimapBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    backgroundColor: '#090B12',
    borderTopWidth: 1,
    borderTopColor: '#171B2B',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  minimapRail: {
    flex: 1,
    flexDirection: 'row',
    height: 10,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    gap: 1,
  },
  minimapChunk: {
    height: '100%',
  },
  minimapViewportIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '0%',
    width: '45%',
    borderWidth: 1,
    borderColor: '#818CF8',
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 2,
  },
  minimapTotalText: {
    fontSize: 10,
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
    color: '#64748B',
    fontWeight: '500',
  },

  /* Inspector Panel (Right) */
  inspectorPanel: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    flexDirection: 'column',
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inspectorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  inspectorScroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },

  /* Player Preview Box */
  playerPreviewBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#12141F',
    borderRadius: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E2333',
  },
  playCenterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  playerSceneBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  playerSceneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Inspector Form Fields */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  formInput: {
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  monoInput: {
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },
  dropdownTrigger: {
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },

  /* Sliders */
  sliderGroup: {
    gap: 8,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sliderFillBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#6C4CF0',
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6C4CF0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#6C4CF0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },

  /* Apply Action Button */
  applyAllBtn: {
    width: '100%',
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  applyAllBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
});
