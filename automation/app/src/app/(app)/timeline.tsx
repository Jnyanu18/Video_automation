import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../../components/Icon';
import { T, Input } from '../../components/ui';
import { useToast } from '../../state/toast';
import { radius, spacing, useTheme } from '../../theme';

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

const TOTAL_TIMELINE_SEC = 29.4; // matches 00:00:29:12 @ 30fps

export default function TimelineEditor() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();

  // Toolbar & State
  const [version, setVersion] = useState(1);
  const [fps, setFps] = useState(30);
  const [zoomLevel, setZoomLevel] = useState(140);
  const [canUndo, setCanUndo] = useState(true);
  const [canRedo, setCanRedo] = useState(false);
  const [currentTime, setCurrentTime] = useState(8.5); // 00:00:08:15
  const [showInspector, setShowInspector] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tracks data structured from the reference
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'track-video',
      title: 'Video Cut',
      icon: 'video',
      cueCount: 4,
      locked: false,
      visible: true,
      segments: [
        {
          id: 'v1',
          label: 'Scene 1 · Hook',
          subLabel: '0:00 - 0:06',
          start: 0.0,
          end: 6.0,
          type: 'video',
          customData: { speed: 100, volume: 100, transition: 'Cut' },
        },
        {
          id: 'v2',
          label: 'Scene 2 · Problem State...',
          subLabel: '0:06 - 0:14',
          start: 6.0,
          end: 14.0,
          type: 'video',
          customData: { speed: 100, volume: 80, transition: 'Cross Dissolve' },
        },
        {
          id: 'v3',
          label: 'Scene 3 · Proof / Solution',
          subLabel: '0:14 - 0:23',
          start: 14.0,
          end: 23.0,
          type: 'video',
          customData: { speed: 100, volume: 85, transition: 'Zoom Wipe' },
        },
        {
          id: 'v4',
          label: 'Scene 4 · Call To A...',
          subLabel: '0:23 - 0:29',
          start: 23.0,
          end: 29.4,
          type: 'video',
          customData: { speed: 100, volume: 90, transition: 'Fade to Black' },
        },
      ],
    },
    {
      id: 'track-captions',
      title: 'Karaoke Capt...',
      icon: 'subtitles',
      cueCount: 4,
      locked: false,
      visible: true,
      segments: [
<<<<<<< HEAD
        { id: 'c1', label: '"Never build fe..."', start: 0.0, end: 6.0, type: 'caption' },
        { id: 'c2', label: '"6 months in dark m..."', start: 6.0, end: 14.0, type: 'caption' },
        { id: 'c3', label: '"Before coding, a..."', start: 14.0, end: 23.0, type: 'caption' },
        { id: 'c4', label: '"Send this to yo..."', start: 23.0, end: 29.4, type: 'caption' },
=======
        { id: 'c1', label: '"Never build features nobody asked for"', start: 0.0, end: 3.0, dur: '3.0s' },
        { id: 'c2', label: '"6 months in dark mode building for zero users"', start: 3.5, end: 11.5, dur: '8.0s' },
        { id: 'c3', label: '"Before coding, ask them to prepay today"', start: 12.5, end: 22.0, dur: '9.5s' },
        { id: 'c4', label: '"Send this to your cofounder before sprint"', start: 23.5, end: 29.0, dur: '5.5s' },
>>>>>>> origin/main
      ],
    },
    {
      id: 'track-zooms',
      title: 'Punch-In Mo...',
      icon: 'zap',
      cueCount: 2,
      locked: false,
      visible: true,
      segments: [
        { id: 'z1', label: 'Punch-In 1.15×', subLabel: '0:00 - 0:06', start: 0.0, end: 6.0, type: 'zoom' },
        { id: 'z2', label: 'Dynamic Cut Zo...', subLabel: '0:14 - 0:20', start: 14.0, end: 20.0, type: 'zoom' },
      ],
    },
    {
      id: 'track-sfx',
      title: 'Sound Desig...',
      icon: 'volume',
      cueCount: 3,
      locked: false,
      visible: true,
      segments: [
        { id: 's1', label: 'whoosh...', start: 0.0, end: 2.8, type: 'sfx' },
        { id: 's2', label: 'riser_te... sub...', start: 20.5, end: 25.5, type: 'sfx' },
      ],
    },
  ]);

  // Selected Clip for Inspector
  const [selectedClipId, setSelectedClipId] = useState<string>('v2');
  const [clipName, setClipName] = useState('Scene 2: Problem Statement');
  const [clipStart, setClipStart] = useState('00:06:00');
  const [clipEnd, setClipEnd] = useState('00:14:00');
  const [transition, setTransition] = useState('Cross Dissolve');
  const [playbackSpeed, setPlaybackSpeed] = useState(100);
  const [clipVolume, setClipVolume] = useState(80);

  // Transitions list
  const transitionsList = ['Cross Dissolve', 'Cut', 'Zoom Wipe', 'Dip to Black', 'Glitch Cut'];

  const handleSelectSegment = (seg: TrackSegment) => {
    setSelectedClipId(seg.id);
    setShowInspector(true);
    if (seg.id === 'v1') {
      setClipName('Scene 1: Hook');
      setClipStart('00:00:00');
      setClipEnd('00:06:00');
      setPlaybackSpeed(100);
      setClipVolume(100);
      setTransition('Cut');
    } else if (seg.id === 'v2') {
      setClipName('Scene 2: Problem Statement');
      setClipStart('00:06:00');
      setClipEnd('00:14:00');
      setPlaybackSpeed(100);
      setClipVolume(80);
      setTransition('Cross Dissolve');
    } else if (seg.id === 'v3') {
      setClipName('Scene 3: Proof / Solution');
      setClipStart('00:14:00');
      setClipEnd('00:23:00');
      setPlaybackSpeed(100);
      setClipVolume(85);
      setTransition('Zoom Wipe');
    } else if (seg.id === 'v4') {
      setClipName('Scene 4: Call To Action');
      setClipStart('00:23:00');
      setClipEnd('00:29:12');
      setPlaybackSpeed(100);
      setClipVolume(90);
      setTransition('Dip to Black');
    } else {
      setClipName(seg.label);
      setClipStart(`00:0${Math.floor(seg.start)}:00`);
      setClipEnd(`00:${Math.floor(seg.end) < 10 ? '0' : ''}${Math.floor(seg.end)}:00`);
    }
  };

  const toggleTrackVisibility = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
  };

  const toggleTrackLock = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  };

  // Convert current seconds to timecode format
  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const frames = Math.floor((sec % 1) * fps);
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const playheadPercent = (currentTime / TOTAL_TIMELINE_SEC) * 100;

  return (
    <View style={localStyles.screenContainer}>
      {/* Main Workspace (Left) */}
      <View style={localStyles.mainContentArea}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={localStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header Row */}
          <View style={localStyles.headerRow}>
            <View style={{ gap: 2 }}>
              <T style={localStyles.pageTitle}>Timeline Editor</T>
              <T style={localStyles.pageSubtitle}>
                Multi-track non-linear editor with frame-accurate precision
              </T>
            </View>

            <Pressable
              style={({ pressed }: any) => [
                localStyles.newReelBtn,
                pressed && { opacity: 0.9 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={() => router.push('/new')}
            >
              <Icon name="plus" size={16} color="#FFFFFF" />
              <T style={localStyles.newReelBtnText}>New Reel</T>
            </Pressable>
          </View>

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
            </View>

            {/* Right Status Indicator */}
            <View style={localStyles.subHeaderRight}>
              <View style={localStyles.statusLiveDot} />
              <T style={localStyles.statusLiveText}>All services active</T>
              <T style={localStyles.statusMutedText}>Autosaved just now</T>
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
              <T style={localStyles.timecodeTotal}>00:00:29:12</T>
            </View>

            {/* Right Action Buttons */}
            <View style={localStyles.transportRightGroup}>
              <Pressable
                style={({ pressed }: any) => [
                  localStyles.cutSilencesBtn,
                  pressed && { backgroundColor: '#F3F4F6' },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={() => toast('Cut 4 silent pauses (-2.3s trimmed)')}
              >
                <Icon name="scissors" size={14} color="#4B5563" />
                <T style={localStyles.cutSilencesText}>Cut{'\n'}Silences</T>
              </Pressable>

              <Pressable
                style={({ pressed }: any) => [
                  localStyles.renderCutBtn,
                  pressed && { opacity: 0.9 },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={() => router.push('/studio')}
              >
                <Icon name="camera" size={16} color="#FFFFFF" />
                <T style={localStyles.renderCutText}>Render{'\n'}Cut</T>
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
                  setCurrentTime(parseFloat((ratio * TOTAL_TIMELINE_SEC).toFixed(2)));
                }}
              >
                {['0:00', '0:05', '0:10', '0:15', '0:20', '0:25', '0:30'].map((timeStr, idx) => (
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
                  { left: `calc(130px + (100% - 130px) * ${currentTime / TOTAL_TIMELINE_SEC})` as any },
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
                    <T style={localStyles.cueCountText}>4 cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-video')}>
                      <Icon name="eye" size={13} color="#64748B" />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-video')}>
                      <Icon name="lock" size={13} color="#64748B" />
                    </Pressable>
                  </View>
                </View>

                {/* Video Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[0].segments.map((seg) => {
                    const leftPct = (seg.start / TOTAL_TIMELINE_SEC) * 100;
                    const widthPct = ((seg.end - seg.start) / TOTAL_TIMELINE_SEC) * 100;
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
                        <T style={localStyles.blockSubText} numberOfLines={1}>
                          {seg.subLabel}
                        </T>
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
                    <T style={localStyles.cueCountText}>4 cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-captions')}>
                      <Icon name="eye" size={13} color="#64748B" />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-captions')}>
                      <Icon name="lock" size={13} color="#64748B" />
                    </Pressable>
                  </View>
                </View>

                {/* Caption Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[1].segments.map((seg) => {
                    const leftPct = (seg.start / TOTAL_TIMELINE_SEC) * 100;
                    const widthPct = ((seg.end - seg.start) / TOTAL_TIMELINE_SEC) * 100;
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
                    <T style={localStyles.cueCountText}>2 cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-zooms')}>
                      <Icon name="eye" size={13} color="#64748B" />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-zooms')}>
                      <Icon name="lock" size={13} color="#64748B" />
                    </Pressable>
                  </View>
                </View>

                {/* Zoom Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[2].segments.map((seg) => {
                    const leftPct = (seg.start / TOTAL_TIMELINE_SEC) * 100;
                    const widthPct = ((seg.end - seg.start) / TOTAL_TIMELINE_SEC) * 100;
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
                        <T style={localStyles.zoomSubText} numberOfLines={1}>
                          {seg.subLabel}
                        </T>
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
                    <T style={localStyles.cueCountText}>3 cues</T>
                  </View>
                  <View style={localStyles.trackActions}>
                    <Pressable onPress={() => toggleTrackVisibility('track-sfx')}>
                      <Icon name="eye" size={13} color="#64748B" />
                    </Pressable>
                    <Pressable onPress={() => toggleTrackLock('track-sfx')}>
                      <Icon name="lock" size={13} color="#64748B" />
                    </Pressable>
                  </View>
                </View>

                {/* SFX Segments Lane */}
                <View style={localStyles.trackLane}>
                  {tracks[3].segments.map((seg) => {
                    const leftPct = (seg.start / TOTAL_TIMELINE_SEC) * 100;
                    const widthPct = ((seg.end - seg.start) / TOTAL_TIMELINE_SEC) * 100;
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
                <View style={[localStyles.minimapChunk, { flex: 6, backgroundColor: '#3B436B' }]} />
                <View style={[localStyles.minimapChunk, { flex: 8, backgroundColor: '#4F46E5' }]} />
                <View style={[localStyles.minimapChunk, { flex: 9, backgroundColor: '#3B436B' }]} />
                <View style={[localStyles.minimapChunk, { flex: 6.4, backgroundColor: '#312E81' }]} />
                {/* Active viewport slider window */}
                <View style={localStyles.minimapViewportIndicator} />
              </View>

              <T style={localStyles.minimapTotalText}>00:29.4 total</T>
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
                <T style={localStyles.playerSceneBadgeText}>Scene 2</T>
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
  newReelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C4CF0',
    paddingVertical: 10,
    paddingHorizontal: 18,
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
    fontSize: 14,
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

  /* Right Action Buttons */
  transportRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cutSilencesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  cutSilencesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 14,
  },
  renderCutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6C4CF0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    shadowColor: '#6C4CF0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  renderCutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
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
