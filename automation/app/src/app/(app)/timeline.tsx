import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../../components/Icon';
import { T, Input } from '../../components/ui';
import { useToast } from '../../state/toast';
import { radius, spacing } from '../../theme';

export interface TrackSegment {
  id: string;
  label: string;
  subLabel?: string;
  start: number; // in seconds
  end: number;   // in seconds
  type: 'video' | 'caption' | 'zoom' | 'sfx';
  speed?: number;
  volume?: number;
  transition?: string;
  faceCentering?: boolean;
}

export interface Track {
  id: string;
  code: string;
  title: string;
  icon: IconName;
  locked: boolean;
  visible: boolean;
  segments: TrackSegment[];
}

const DEFAULT_TIMELINE_SEC = 29.4; // 00:00:29:12 @ 30fps

export default function TimelineEditor() {
  const router = useRouter();
  const toast = useToast();

  // Top Bar State
  const [version, setVersion] = useState(1);
  const [fps, setFps] = useState(30);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');

  // Left Drawer Tabs: 'media' | 'broll' | 'captions' | 'sfx' | 'transitions'
  const [activeDrawerTab, setActiveDrawerTab] = useState<'media' | 'broll' | 'captions' | 'sfx' | 'transitions'>('media');
  const [captionPreset, setCaptionPreset] = useState<'karaoke' | 'hormozi' | 'minimal'>('karaoke');

  // Toolbar & Mode State
  const [activeTool, setActiveTool] = useState<'select' | 'razor'>('select');
  const [snapping, setSnapping] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Playback Engine State
  const [currentTime, setCurrentTime] = useState(8.5); // Start at 00:00:08:15
  const [isPlaying, setIsPlaying] = useState(false);
  const playheadAnim = useRef(new Animated.Value(8.5)).current;
  const lastTimeRef = useRef<number>(Date.now());
  const rafIdRef = useRef<number | null>(null);

  // Tracks State
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'track-v1',
      code: 'V1',
      title: 'Video Cut',
      icon: 'video',
      locked: false,
      visible: true,
      segments: [
        {
          id: 'v1',
          label: 'Scene 1: Hook',
          subLabel: '0:00 - 0:06',
          start: 0.0,
          end: 6.0,
          type: 'video',
          speed: 1.0,
          volume: 100,
          transition: 'Cut',
          faceCentering: true,
        },
        {
          id: 'v2',
          label: 'Scene 2: Problem Statement',
          subLabel: '0:06 - 0:14',
          start: 6.0,
          end: 14.0,
          type: 'video',
          speed: 1.0,
          volume: 80,
          transition: 'Cross Dissolve',
          faceCentering: true,
        },
        {
          id: 'v3',
          label: 'Scene 3: Proof / Solution',
          subLabel: '0:14 - 0:23',
          start: 14.0,
          end: 23.0,
          type: 'video',
          speed: 1.0,
          volume: 85,
          transition: 'Zoom Wipe',
          faceCentering: true,
        },
        {
          id: 'v4',
          label: 'Scene 4: Call To Action',
          subLabel: '0:23 - 0:29',
          start: 23.0,
          end: 29.4,
          type: 'video',
          speed: 1.0,
          volume: 90,
          transition: 'Dip to Black',
          faceCentering: false,
        },
      ],
    },
    {
      id: 'track-t1',
      code: 'T1',
      title: 'Captions',
      icon: 'subtitles',
      locked: false,
      visible: true,
      segments: [
        { id: 'c1', label: '"Never build features in dark..."', start: 0.0, end: 6.0, type: 'caption' },
        { id: 'c2', label: '"6 months in dark mode..."', start: 6.0, end: 14.0, type: 'caption' },
        { id: 'c3', label: '"Before coding, ask users..."', start: 14.0, end: 23.0, type: 'caption' },
        { id: 'c4', label: '"Send this to your team..."', start: 23.0, end: 29.4, type: 'caption' },
      ],
    },
    {
      id: 'track-fx1',
      code: 'FX1',
      title: 'Punch-In',
      icon: 'zap',
      locked: false,
      visible: true,
      segments: [
        { id: 'z1', label: 'Punch-In 1.15×', subLabel: '0:00 - 0:06', start: 0.0, end: 6.0, type: 'zoom' },
        { id: 'z2', label: 'Dynamic Cut 1.25×', subLabel: '0:14 - 0:20', start: 14.0, end: 20.0, type: 'zoom' },
      ],
    },
    {
      id: 'track-a1',
      code: 'A1',
      title: 'Audio SFX',
      icon: 'volume',
      locked: false,
      visible: true,
      segments: [
        { id: 's1', label: 'whoosh..', start: 0.0, end: 2.8, type: 'sfx' },
        { id: 's2', label: 'riser_sound... sub...', start: 20.5, end: 25.5, type: 'sfx' },
      ],
    },
  ]);

  // Selected Clip for Inspector
  const [selectedClipId, setSelectedClipId] = useState<string>('v2');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-v1');

  // Inspector Form State
  const [clipName, setClipName] = useState('Scene 2: Problem Statement');
  const [clipStart, setClipStart] = useState('00:06.00');
  const [clipEnd, setClipEnd] = useState('00:14.00');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [clipVolume, setClipVolume] = useState(80);
  const [transition, setTransition] = useState('Cross Dissolve');
  const [aiFaceCentering, setAiFaceCentering] = useState(true);

  const transitionsList = ['Cross Dissolve', 'Cut', 'Zoom Wipe', 'Dip to Black', 'Glitch Cut'];

  // Calculate dynamic total duration from last clip end
  const totalTimelineSec = Math.max(
    DEFAULT_TIMELINE_SEC,
    ...tracks.flatMap((t) => t.segments.map((s) => s.end))
  );

  // Timecode formatting
  const formatTimecode = (sec: number) => {
    const safeSec = Math.max(0, sec);
    const mins = Math.floor(safeSec / 60);
    const secs = Math.floor(safeSec % 60);
    const frames = Math.floor((safeSec % 1) * fps);
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const seekTime = (targetSec: number) => {
    let bounded = Math.max(0, Math.min(totalTimelineSec, targetSec));
    if (snapping) {
      // Magnetic snapping to clip start/ends within 0.3s
      for (const track of tracks) {
        for (const seg of track.segments) {
          if (Math.abs(bounded - seg.start) < 0.25) {
            bounded = seg.start;
            break;
          }
          if (Math.abs(bounded - seg.end) < 0.25) {
            bounded = seg.end;
            break;
          }
        }
      }
    }
    const val = parseFloat(bounded.toFixed(2));
    setCurrentTime(val);
    playheadAnim.setValue(val);
  };

  // ---------------------------------------------------------------------------
  // LIVE PLAYBACK ENGINE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }

    lastTimeRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec * playbackSpeed;
        if (next >= totalTimelineSec) {
          setIsPlaying(false);
          return 0; // Loop or stop
        }
        return parseFloat(next.toFixed(2));
      });

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isPlaying, playbackSpeed, totalTimelineSec]);

  // Spacebar hotkey listener for Play/Pause on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyV') {
        setActiveTool('select');
      } else if (e.code === 'KeyC') {
        setActiveTool('razor');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---------------------------------------------------------------------------
  // DYNAMIC PREVIEW DATA (SYNCHRONIZED WITH CURRENT TIME)
  // ---------------------------------------------------------------------------
  const videoTrack = tracks.find((t) => t.id === 'track-v1');
  const captionTrack = tracks.find((t) => t.id === 'track-t1');
  const zoomTrack = tracks.find((t) => t.id === 'track-fx1');
  const sfxTrack = tracks.find((t) => t.id === 'track-a1');

  const activeVideoClip = videoTrack?.visible
    ? videoTrack.segments.find((s) => currentTime >= s.start && currentTime < s.end)
    : undefined;

  const activeCaptionClip = captionTrack?.visible
    ? captionTrack.segments.find((s) => currentTime >= s.start && currentTime < s.end)
    : undefined;

  const activeZoomClip = zoomTrack?.visible
    ? zoomTrack.segments.find((s) => currentTime >= s.start && currentTime < s.end)
    : undefined;

  const activeSfxClip = sfxTrack?.visible
    ? sfxTrack.segments.find((s) => currentTime >= s.start && currentTime < s.end)
    : undefined;

  // Zoom scale for simulated camera inside phone
  const zoomScale = activeZoomClip ? (activeZoomClip.label.includes('1.25') ? 1.25 : 1.15) : 1.0;

  // ---------------------------------------------------------------------------
  // SELECT & UPDATE CLIP
  // ---------------------------------------------------------------------------
  const handleSelectSegment = (trackId: string, seg: TrackSegment) => {
    // If Razor tool is active, clicking splits the clip instead of selecting!
    if (activeTool === 'razor') {
      splitClipAtPlayhead(trackId, seg.id);
      return;
    }

    setSelectedClipId(seg.id);
    setSelectedTrackId(trackId);
    setClipName(seg.label);
    setClipStart(`00:${Math.floor(seg.start).toString().padStart(2, '0')}.00`);
    setClipEnd(`00:${Math.floor(seg.end).toString().padStart(2, '0')}.00`);
    if (seg.speed) setPlaybackSpeed(seg.speed);
    if (seg.volume !== undefined) setClipVolume(seg.volume);
    if (seg.transition) setTransition(seg.transition);
    if (seg.faceCentering !== undefined) setAiFaceCentering(seg.faceCentering);
  };

  // Mutate selected clip state live
  const updateSelectedClip = (updates: Partial<TrackSegment>) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id !== selectedTrackId) return track;
        return {
          ...track,
          segments: track.segments.map((s) => {
            if (s.id !== selectedClipId) return s;
            return { ...s, ...updates };
          }),
        };
      })
    );
  };

  // Name update handler
  const handleClipNameChange = (text: string) => {
    setClipName(text);
    updateSelectedClip({ label: text });
  };

  // Start Time update handler
  const handleClipStartChange = (text: string) => {
    setClipStart(text);
    const parsed = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      updateSelectedClip({ start: parsed });
    }
  };

  // End Time update handler
  const handleClipEndChange = (text: string) => {
    setClipEnd(text);
    const parsed = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      updateSelectedClip({ end: parsed });
    }
  };

  // Speed update handler
  const handleSpeedChange = (speedVal: number) => {
    setPlaybackSpeed(speedVal);
    updateSelectedClip({ speed: speedVal });
  };

  // Volume update handler
  const handleVolumeChange = (volVal: number) => {
    setClipVolume(volVal);
    updateSelectedClip({ volume: volVal });
  };

  // Transition update handler
  const handleTransitionChange = (tr: string) => {
    setTransition(tr);
    updateSelectedClip({ transition: tr });
  };

  // Face Centering toggle
  const handleFaceCenteringToggle = () => {
    const nextVal = !aiFaceCentering;
    setAiFaceCentering(nextVal);
    updateSelectedClip({ faceCentering: nextVal });
    toast(nextVal ? 'AI Face Centering enabled' : 'AI Face Centering disabled');
  };

  // Apply Transition to All Cuts
  const handleApplyToAllCuts = () => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === 'track-v1'
          ? {
              ...t,
              segments: t.segments.map((s) => ({ ...s, transition })),
            }
          : t
      )
    );
    toast(`Applied "${transition}" transition to all video cuts`);
  };

  // Delete Selected Clip
  const handleDeleteSelectedClip = () => {
    if (!selectedClipId) return;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTrackId) return t;
        return {
          ...t,
          segments: t.segments.filter((s) => s.id !== selectedClipId),
        };
      })
    );
    toast(`Deleted clip from timeline`);
    setSelectedClipId('');
  };

  // ---------------------------------------------------------------------------
  // TOOL OPERATIONS (RAZOR CUT & CUT SILENCES)
  // ---------------------------------------------------------------------------
  const splitClipAtPlayhead = (trackId: string, clipId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    if (track.locked) {
      toast('Cannot cut: track is locked');
      return;
    }

    const clip = track.segments.find((s) => s.id === clipId);
    if (!clip) return;

    if (currentTime <= clip.start + 0.3 || currentTime >= clip.end - 0.3) {
      toast('Playhead must be inside clip to slice');
      return;
    }

    const newClipA: TrackSegment = {
      ...clip,
      id: `${clip.id}_a`,
      end: currentTime,
      subLabel: `${clip.start.toFixed(1)}s - ${currentTime.toFixed(1)}s`,
    };

    const newClipB: TrackSegment = {
      ...clip,
      id: `${clip.id}_b`,
      start: currentTime,
      subLabel: `${currentTime.toFixed(1)}s - ${clip.end.toFixed(1)}s`,
      label: `${clip.label} (Part 2)`,
    };

    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const newSegs = t.segments.flatMap((s) => (s.id === clipId ? [newClipA, newClipB] : [s]));
        return { ...t, segments: newSegs };
      })
    );

    setSelectedClipId(newClipB.id);
    setSelectedTrackId(trackId);
    toast(`Razor sliced "${clip.label}" at ${formatTimecode(currentTime)}`);
  };

  // Auto Cut Silences
  const handleCutSilences = () => {
    // Compress gaps between video clips
    setTracks((prev) => {
      let shiftOffset = 0;
      const vTrack = prev.find((t) => t.id === 'track-v1');
      if (!vTrack) return prev;

      let currentCursor = 0;
      const compactedVideoSegments = vTrack.segments.map((seg) => {
        const gap = seg.start - currentCursor;
        if (gap > 0.1) {
          shiftOffset += gap;
        }
        const newStart = currentCursor;
        const duration = seg.end - seg.start;
        const newEnd = newStart + duration;
        currentCursor = newEnd;
        return {
          ...seg,
          start: parseFloat(newStart.toFixed(2)),
          end: parseFloat(newEnd.toFixed(2)),
          subLabel: `${newStart.toFixed(1)}s - ${newEnd.toFixed(1)}s`,
        };
      });

      // Synchronize other tracks accordingly
      return prev.map((t) => {
        if (t.id === 'track-v1') return { ...t, segments: compactedVideoSegments };
        // Compact synchronized captions
        return {
          ...t,
          segments: t.segments.map((s) => ({
            ...s,
            start: Math.max(0, parseFloat((s.start - shiftOffset * 0.5).toFixed(2))),
            end: Math.max(0.5, parseFloat((s.end - shiftOffset * 0.5).toFixed(2))),
          })),
        };
      });
    });

    toast('Cut 3 silent pauses (-2.4s total trimmed)');
  };

  // Toggle Track Visibility
  const toggleTrackVisibility = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
  };

  // Toggle Track Lock
  const toggleTrackLock = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  };

  // ---------------------------------------------------------------------------
  // ADD MEDIA / ASSETS FROM DRAWER
  // ---------------------------------------------------------------------------
  const handleInsertMediaAsset = (name: string, duration: number) => {
    const vTrack = tracks.find((t) => t.id === 'track-v1');
    if (!vTrack || vTrack.locked) {
      toast('Cannot insert: Video track is locked');
      return;
    }

    const lastEnd = vTrack.segments.length > 0 ? vTrack.segments[vTrack.segments.length - 1].end : 0;
    const newSeg: TrackSegment = {
      id: `v_${Date.now()}`,
      label: name,
      subLabel: `${lastEnd.toFixed(1)}s - ${(lastEnd + duration).toFixed(1)}s`,
      start: lastEnd,
      end: lastEnd + duration,
      type: 'video',
      speed: 1.0,
      volume: 100,
      transition: 'Cross Dissolve',
      faceCentering: true,
    };

    setTracks((prev) =>
      prev.map((t) => (t.id === 'track-v1' ? { ...t, segments: [...t.segments, newSeg] } : t))
    );
    setSelectedClipId(newSeg.id);
    setSelectedTrackId('track-v1');
    toast(`Added "${name}" to Video Track`);
  };

  const handleInsertBrollAsset = (name: string) => {
    handleInsertMediaAsset(`B-Roll: ${name}`, 4.0);
  };

  const handleInsertSfxCue = (sfxName: string) => {
    const newSfx: TrackSegment = {
      id: `sfx_${Date.now()}`,
      label: sfxName,
      start: currentTime,
      end: currentTime + 1.8,
      type: 'sfx',
      volume: 85,
    };

    setTracks((prev) =>
      prev.map((t) => (t.id === 'track-a1' ? { ...t, segments: [...t.segments, newSfx] } : t))
    );
    toast(`Inserted SFX "${sfxName}" at ${formatTimecode(currentTime)}`);
  };

  // ---------------------------------------------------------------------------
  // RENDER PIPELINE SIMULATION
  // ---------------------------------------------------------------------------
  const handleStartRender = () => {
    setIsRendering(true);
    setRenderProgress(10);
    setRenderStage('Compiling multi-track timeline cuts...');

    setTimeout(() => {
      setRenderProgress(35);
      setRenderStage('Normalizing audio loudness (-14 LUFS) & mixing SFX...');
    }, 700);

    setTimeout(() => {
      setRenderProgress(70);
      setRenderStage('Applying AI Karaoke caption timings & punch-ins...');
    }, 1400);

    setTimeout(() => {
      setRenderProgress(100);
      setRenderStage('Export complete: 1080×1920 60fps MP4 ready!');
      setTimeout(() => {
        setIsRendering(false);
        router.push('/studio');
      }, 900);
    }, 2200);
  };

  return (
    <View style={styles.rootContainer}>
      {/* =========================================================================
          1. TOP NAVIGATION / HEADER
          ========================================================================= */}
      <View style={styles.topHeader}>
        {/* Left: Brand & Project Name */}
        <View style={styles.headerLeft}>
          <View style={styles.brandBadge}>
            <Icon name="sparkles" size={13} color="#FFFFFF" />
            <T style={styles.brandBadgeText}>GROWTHOS</T>
          </View>
          <T style={styles.projectTitle}>Reel #12 · "AI Coding"</T>
          <View style={styles.savedBadge}>
            <View style={styles.savedDot} />
            <T style={styles.savedText}>Autosaved</T>
          </View>
        </View>

        {/* Right: Plan version, FPS, Render CTA */}
        <View style={styles.headerRight}>
          <Pressable
            style={styles.pillDropdown}
            onPress={() => {
              const nextV = version === 1 ? 2 : 1;
              setVersion(nextV);
              toast(`Switched to Plan Version ${nextV}`);
            }}
          >
            <T style={styles.pillDropdownText}>{`Plan v${version}`}</T>
            <Icon name="chevron-down" size={13} color="#6B7280" />
          </Pressable>

          <Pressable
            style={styles.pillDropdown}
            onPress={() => {
              const nextFps = fps === 30 ? 60 : fps === 60 ? 24 : 30;
              setFps(nextFps);
              toast(`Framerate set to ${nextFps} fps`);
            }}
          >
            <T style={styles.pillDropdownText}>{`${fps} fps`}</T>
            <Icon name="chevron-down" size={13} color="#6B7280" />
          </Pressable>

          <Pressable
            style={({ pressed }: any) => [
              styles.renderButton,
              pressed && { opacity: 0.9 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            onPress={handleStartRender}
          >
            <Icon name="film" size={15} color="#FFFFFF" />
            <T style={styles.renderButtonText}>+ Render Reel</T>
          </Pressable>
        </View>
      </View>

      {/* =========================================================================
          2. UPPER WORKSPACE (3-COLUMN LAYOUT)
          [Media & Effects] | [Preview Monitor] | [Clip Inspector]
          ========================================================================= */}
      <View style={styles.upperWorkspace}>
        {/* PANEL 1: MEDIA & EFFECTS DRAWER (LEFT) */}
        <View style={styles.mediaDrawer}>
          <View style={styles.drawerHeader}>
            <T style={styles.drawerTitle}>MEDIA & EFFECTS</T>
          </View>

          {/* Drawer Category Tabs */}
          <View style={styles.drawerTabsBar}>
            {[
              { id: 'media', label: 'Media Bins', icon: 'folder' },
              { id: 'broll', label: 'AI B-Roll', icon: 'sparkles' },
              { id: 'captions', label: 'Captions', icon: 'subtitles' },
              { id: 'sfx', label: 'SFX Bank', icon: 'volume' },
              { id: 'transitions', label: 'Transitions', icon: 'zap' },
            ].map((tab) => {
              const isActive = activeDrawerTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.drawerTabBtn, isActive && styles.drawerTabBtnActive]}
                  onPress={() => setActiveDrawerTab(tab.id as any)}
                >
                  <Icon
                    name={tab.icon as IconName}
                    size={12}
                    color={isActive ? '#6C4CF0' : '#6B7280'}
                  />
                  <T style={[styles.drawerTabText, isActive && styles.drawerTabTextActive]}>
                    {tab.label}
                  </T>
                </Pressable>
              );
            })}
          </View>

          {/* Drawer Items Content */}
          <ScrollView style={styles.drawerScrollArea} showsVerticalScrollIndicator={false}>
            {activeDrawerTab === 'media' && (
              <View style={styles.drawerItemList}>
                <Pressable
                  style={styles.mediaAssetCard}
                  onPress={() => handleInsertMediaAsset('take_01_hook.mp4', 6.0)}
                >
                  <View style={styles.mediaThumb}>
                    <Icon name="video" size={15} color="#6C4CF0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={styles.mediaName}>take_01_hook.mp4</T>
                    <T style={styles.mediaMeta}>1080×1920 · 06.00s</T>
                  </View>
                  <Icon name="plus" size={14} color="#6C4CF0" />
                </Pressable>

                <Pressable
                  style={[styles.mediaAssetCard, styles.mediaAssetCardActive]}
                  onPress={() => handleInsertMediaAsset('take_02_problem.mp4', 8.0)}
                >
                  <View style={[styles.mediaThumb, { backgroundColor: '#EDE9FE' }]}>
                    <Icon name="video" size={15} color="#6C4CF0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={styles.mediaName}>take_02_problem.mp4</T>
                    <T style={styles.mediaMeta}>1080×1920 · 08.00s</T>
                  </View>
                  <Icon name="plus" size={14} color="#6C4CF0" />
                </Pressable>

                <Pressable
                  style={styles.mediaAssetCard}
                  onPress={() => handleInsertMediaAsset('take_03_solution.mp4', 9.0)}
                >
                  <View style={styles.mediaThumb}>
                    <Icon name="video" size={15} color="#6C4CF0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={styles.mediaName}>take_03_solution.mp4</T>
                    <T style={styles.mediaMeta}>1080×1920 · 09.00s</T>
                  </View>
                  <Icon name="plus" size={14} color="#6C4CF0" />
                </Pressable>
              </View>
            )}

            {activeDrawerTab === 'broll' && (
              <View style={styles.drawerItemList}>
                <Pressable
                  style={styles.mediaAssetCard}
                  onPress={() => handleInsertBrollAsset('Code Editor Zoom')}
                >
                  <View style={[styles.mediaThumb, { backgroundColor: '#E0E7FF' }]}>
                    <Icon name="monitor" size={15} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={styles.mediaName}>code_editor_zoom.mp4</T>
                    <T style={styles.mediaMeta}>AI Synthesized · 04.5s</T>
                  </View>
                  <Icon name="plus" size={14} color="#4F46E5" />
                </Pressable>

                <Pressable
                  style={styles.mediaAssetCard}
                  onPress={() => handleInsertBrollAsset('Terminal Typing')}
                >
                  <View style={[styles.mediaThumb, { backgroundColor: '#E0E7FF' }]}>
                    <Icon name="cpu" size={15} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={styles.mediaName}>terminal_typing.mp4</T>
                    <T style={styles.mediaMeta}>AI Synthesized · 03.2s</T>
                  </View>
                  <Icon name="plus" size={14} color="#4F46E5" />
                </Pressable>
              </View>
            )}

            {activeDrawerTab === 'captions' && (
              <View style={styles.drawerItemList}>
                {[
                  { id: 'karaoke', name: 'Karaoke Glow', desc: 'Glowing yellow word highlight' },
                  { id: 'hormozi', name: 'Hormozi Bold', desc: 'Uppercase bold typography' },
                  { id: 'minimal', name: 'Minimal Typewriter', desc: 'Monospace subtle badge' },
                ].map((preset) => {
                  const isCur = captionPreset === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[styles.mediaAssetCard, isCur && styles.mediaAssetCardActive]}
                      onPress={() => {
                        setCaptionPreset(preset.id as any);
                        toast(`Caption style set to "${preset.name}"`);
                      }}
                    >
                      <View style={[styles.mediaThumb, { backgroundColor: '#F3E8FF' }]}>
                        <Icon name="type" size={15} color="#9333EA" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T style={styles.mediaName}>{preset.name}</T>
                        <T style={styles.mediaMeta}>{preset.desc}</T>
                      </View>
                      {isCur && <Icon name="check" size={14} color="#6C4CF0" />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {activeDrawerTab === 'sfx' && (
              <View style={styles.drawerItemList}>
                {[
                  { name: 'Fast Whoosh', dur: '0.8s' },
                  { name: 'Sub Riser Drop', dur: '2.5s' },
                  { name: 'Camera Shutter', dur: '0.4s' },
                  { name: 'Impact Thud', dur: '1.2s' },
                ].map((sfx, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.mediaAssetCard}
                    onPress={() => handleInsertSfxCue(sfx.name)}
                  >
                    <View style={[styles.mediaThumb, { backgroundColor: '#D1FAE5' }]}>
                      <Icon name="volume" size={15} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T style={styles.mediaName}>{sfx.name}</T>
                      <T style={styles.mediaMeta}>{sfx.dur} · Click to insert</T>
                    </View>
                    <Icon name="plus" size={14} color="#059669" />
                  </Pressable>
                ))}
              </View>
            )}

            {activeDrawerTab === 'transitions' && (
              <View style={styles.drawerItemList}>
                {transitionsList.map((trName, idx) => (
                  <Pressable
                    key={idx}
                    style={[styles.mediaAssetCard, transition === trName && styles.mediaAssetCardActive]}
                    onPress={() => {
                      handleTransitionChange(trName);
                      toast(`Transition set to ${trName}`);
                    }}
                  >
                    <View style={[styles.mediaThumb, { backgroundColor: '#FEF3C7' }]}>
                      <Icon name="zap" size={15} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T style={styles.mediaName}>{trName}</T>
                      <T style={styles.mediaMeta}>0.5s duration</T>
                    </View>
                    {transition === trName && <Icon name="check" size={14} color="#6C4CF0" />}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        {/* PANEL 2: PREVIEW MONITOR (CENTER) */}
        <View style={styles.previewMonitorArea}>
          <View style={styles.previewHeaderRow}>
            <T style={styles.previewTitle}>PREVIEW MONITOR</T>
            <T style={styles.previewResolution}>9:16 · 1080×1920</T>
          </View>

          {/* Centered Phone Screen Frame */}
          <View style={styles.phoneOuterContainer}>
            <View style={styles.phoneDeviceFrame}>
              {/* Top Speaker Notch */}
              <View style={styles.phoneNotchSpeaker} />

              {/* Realistic Video Canvas Surface */}
              <View
                style={[
                  styles.phoneScreenSurface,
                  !videoTrack?.visible && { opacity: 0.3 },
                ]}
              >
                {/* Simulated Camera & Presenter Frame (Scales with Punch-In Zoom!) */}
                <View
                  style={[
                    styles.simulatedPresenterFace,
                    {
                      transform: [{ scale: zoomScale }],
                    },
                  ]}
                >
                  <Icon name="camera" size={32} color="#818CF8" />

                  {/* AI Face Centering Bounding Box Overlay */}
                  {aiFaceCentering && (
                    <View style={styles.faceCenteringBox}>
                      <View style={styles.faceTargetReticle} />
                      <T style={styles.faceLockLabel}>AI FACE LOCKED</T>
                    </View>
                  )}
                </View>

                {/* Top Corner Scene Tag */}
                <View style={styles.sceneIndicatorPill}>
                  <T style={styles.sceneIndicatorText}>
                    {activeVideoClip ? activeVideoClip.label : 'Transition / Gap'}
                  </T>
                </View>

                {/* Active Audio SFX Pulse Indicator */}
                {activeSfxClip && (
                  <View style={styles.sfxActivePill}>
                    <Icon name="volume" size={12} color="#34D399" />
                    <T style={styles.sfxActiveText}>{activeSfxClip.label}</T>
                  </View>
                )}

                {/* Dynamic Captions / Subtitles Overlay */}
                {captionTrack?.visible && activeCaptionClip && (
                  <View
                    style={[
                      styles.captionOverlayBox,
                      captionPreset === 'hormozi' && {
                        backgroundColor: '#000000',
                        borderRadius: 2,
                        paddingVertical: 5,
                      },
                      captionPreset === 'minimal' && {
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        borderRadius: 4,
                      },
                    ]}
                  >
                    <T
                      style={[
                        styles.captionOverlayText,
                        captionPreset === 'hormozi' && {
                          color: '#22C55E',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                        },
                        captionPreset === 'minimal' && {
                          color: '#000000',
                          fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {activeCaptionClip.label}
                    </T>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Transport Controls Bar */}
          <View style={styles.transportControlsRow}>
            {/* Jump to start */}
            <Pressable
              style={styles.transportBtn}
              onPress={() => seekTime(0)}
            >
              <Icon name="skip-back" size={15} color="#94A3B8" />
            </Pressable>

            {/* Step back 1s */}
            <Pressable
              style={styles.transportBtn}
              onPress={() => seekTime(currentTime - 1)}
            >
              <Icon name="back" size={15} color="#94A3B8" />
            </Pressable>

            {/* Play/Pause Button */}
            <Pressable
              style={styles.playPauseCircle}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
            </Pressable>

            {/* Step forward 1s */}
            <Pressable
              style={styles.transportBtn}
              onPress={() => seekTime(currentTime + 1)}
            >
              <Icon name="forward" size={15} color="#94A3B8" />
            </Pressable>

            {/* Jump to end */}
            <Pressable
              style={styles.transportBtn}
              onPress={() => seekTime(totalTimelineSec)}
            >
              <Icon name="skip-forward" size={15} color="#94A3B8" />
            </Pressable>

            {/* Frame-accurate Timecode */}
            <View style={styles.timecodePill}>
              <T style={styles.timecodeCurrent}>{formatTimecode(currentTime)}</T>
              <T style={styles.timecodeDivider}>/</T>
              <T style={styles.timecodeTotal}>{formatTimecode(totalTimelineSec)}</T>
            </View>
          </View>
        </View>

        {/* PANEL 3: CLIP INSPECTOR (RIGHT) */}
        <View style={styles.inspectorPanel}>
          <View style={styles.inspectorHeader}>
            <T style={styles.inspectorTitle}>CLIP INSPECTOR</T>
            <View style={styles.selectedBadge}>
              <T style={styles.selectedBadgeText}>
                {selectedClipId ? `Selected: ${selectedClipId.toUpperCase()}` : 'None'}
              </T>
            </View>
          </View>

          <ScrollView style={styles.inspectorScroll} showsVerticalScrollIndicator={false}>
            {/* Clip Name */}
            <View style={styles.inspectorField}>
              <T style={styles.fieldLabel}>Clip Name</T>
              <Input
                value={clipName}
                onChangeText={handleClipNameChange}
                style={styles.formInput}
              />
            </View>

            {/* Start & End Times */}
            <View style={styles.sideBySideRow}>
              <View style={{ flex: 1 }}>
                <T style={styles.fieldLabel}>Start</T>
                <Input
                  value={clipStart}
                  onChangeText={handleClipStartChange}
                  style={[styles.formInput, styles.monoInput]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <T style={styles.fieldLabel}>End</T>
                <Input
                  value={clipEnd}
                  onChangeText={handleClipEndChange}
                  style={[styles.formInput, styles.monoInput]}
                />
              </View>
            </View>

            {/* Speed Slider */}
            <View style={styles.inspectorField}>
              <View style={styles.sliderHeaderRow}>
                <T style={styles.fieldLabel}>Playback Speed</T>
                <T style={styles.sliderValueText}>{`${playbackSpeed.toFixed(1)}x`}</T>
              </View>
              <Pressable
                style={styles.sliderTrack}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // @ts-ignore
                  const width = e.currentTarget?.offsetWidth || 240;
                  const ratio = Math.max(0.5, Math.min(2.0, (locationX / width) * 2.0));
                  handleSpeedChange(parseFloat(ratio.toFixed(1)));
                }}
              >
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${Math.min(100, (playbackSpeed / 2.0) * 100)}%` },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    { left: `${Math.min(94, (playbackSpeed / 2.0) * 100)}%` },
                  ]}
                />
              </Pressable>
            </View>

            {/* Volume Slider */}
            <View style={styles.inspectorField}>
              <View style={styles.sliderHeaderRow}>
                <T style={styles.fieldLabel}>Clip Volume</T>
                <T style={styles.sliderValueText}>{`${clipVolume}%`}</T>
              </View>
              <Pressable
                style={styles.sliderTrack}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // @ts-ignore
                  const width = e.currentTarget?.offsetWidth || 240;
                  const pct = Math.round(Math.max(0, Math.min(100, (locationX / width) * 100)));
                  handleVolumeChange(pct);
                }}
              >
                <View style={[styles.sliderFill, { width: `${clipVolume}%` }]} />
                <View style={[styles.sliderThumb, { left: `${Math.min(94, clipVolume)}%` }]} />
              </Pressable>
            </View>

            {/* Transition Dropdown */}
            <View style={styles.inspectorField}>
              <T style={styles.fieldLabel}>Transition In</T>
              <Pressable
                style={styles.dropdownBtn}
                onPress={() => {
                  const currIdx = transitionsList.indexOf(transition);
                  const nextTr = transitionsList[(currIdx + 1) % transitionsList.length];
                  handleTransitionChange(nextTr);
                  toast(`Transition set to ${nextTr}`);
                }}
              >
                <T style={styles.dropdownBtnText}>{transition}</T>
                <Icon name="chevron-down" size={14} color="#6B7280" />
              </Pressable>
            </View>

            {/* AI Toggle: Face Centering */}
            <Pressable
              style={styles.toggleRow}
              onPress={handleFaceCenteringToggle}
            >
              <View style={{ flex: 1 }}>
                <T style={styles.toggleLabel}>AI Face Centering</T>
                <T style={styles.toggleSub}>Lock presenter in 9:16 safe zone</T>
              </View>
              <View style={[styles.toggleSwitch, aiFaceCentering && styles.toggleSwitchActive]}>
                <View style={[styles.toggleThumb, aiFaceCentering && styles.toggleThumbActive]} />
              </View>
            </Pressable>

            {/* Action Buttons */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Pressable
                style={({ pressed }: any) => [
                  styles.applyCutsBtn,
                  pressed && { backgroundColor: '#F3F4F6' },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={handleApplyToAllCuts}
              >
                <T style={styles.applyCutsBtnText}>Apply transition to all cuts</T>
              </Pressable>

              {selectedClipId ? (
                <Pressable
                  style={({ pressed }: any) => [
                    styles.deleteClipBtn,
                    pressed && { opacity: 0.8 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                  onPress={handleDeleteSelectedClip}
                >
                  <Icon name="trash" size={13} color="#EF4444" />
                  <T style={styles.deleteClipBtnText}>Delete Selected Clip</T>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* =========================================================================
          3. TIMELINE TOOLBAR (DIVIDER BAR)
          [Select V] [Razor C] [Snapping] [Cut Silences] | [- 100% +] 00:08:15
          ========================================================================= */}
      <View style={styles.timelineToolbar}>
        {/* Left Tools */}
        <View style={styles.toolbarLeftGroup}>
          {/* Tool: Select */}
          <Pressable
            style={[styles.toolBtn, activeTool === 'select' && styles.toolBtnActive]}
            onPress={() => {
              setActiveTool('select');
              toast('Select tool enabled');
            }}
          >
            <Icon
              name="chevron"
              size={13}
              color={activeTool === 'select' ? '#6C4CF0' : '#4B5563'}
            />
            <T style={[styles.toolBtnText, activeTool === 'select' && styles.toolBtnTextActive]}>
              Select (V)
            </T>
          </Pressable>

          {/* Tool: Razor */}
          <Pressable
            style={[styles.toolBtn, activeTool === 'razor' && styles.toolBtnActive]}
            onPress={() => {
              setActiveTool('razor');
              toast('Razor tool enabled: click on any clip to slice at playhead');
            }}
          >
            <Icon
              name="scissors"
              size={13}
              color={activeTool === 'razor' ? '#6C4CF0' : '#4B5563'}
            />
            <T style={[styles.toolBtnText, activeTool === 'razor' && styles.toolBtnTextActive]}>
              Razor (C)
            </T>
          </Pressable>

          {/* Tool: Snapping */}
          <Pressable
            style={[styles.toolBtn, snapping && styles.toolBtnActive]}
            onPress={() => {
              const nextVal = !snapping;
              setSnapping(nextVal);
              toast(nextVal ? 'Magnetic snapping enabled' : 'Snapping disabled');
            }}
          >
            <Icon
              name="magnet"
              size={13}
              color={snapping ? '#6C4CF0' : '#4B5563'}
            />
            <T style={[styles.toolBtnText, snapping && styles.toolBtnTextActive]}>
              Snapping
            </T>
          </Pressable>

          <View style={styles.toolbarDivider} />

          {/* Cut Silences */}
          <Pressable
            style={styles.cutSilencesBtn}
            onPress={handleCutSilences}
          >
            <Icon name="sparkles" size={13} color="#6C4CF0" />
            <T style={styles.cutSilencesText}>Cut Silences</T>
          </Pressable>
        </View>

        {/* Right Zoom & Timecode */}
        <View style={styles.toolbarRightGroup}>
          <View style={styles.zoomPill}>
            <Pressable
              style={styles.zoomSubBtn}
              onPress={() => setZoomLevel((z) => Math.max(70, z - 15))}
            >
              <Icon name="zoom-out" size={13} color="#4B5563" />
            </Pressable>
            <T style={styles.zoomValueText}>{`${zoomLevel}%`}</T>
            <Pressable
              style={styles.zoomSubBtn}
              onPress={() => setZoomLevel((z) => Math.min(200, z + 15))}
            >
              <Icon name="zoom-in" size={13} color="#4B5563" />
            </Pressable>
          </View>

          <View style={styles.activeTimecodeBox}>
            <T style={styles.activeTimecodeText}>{formatTimecode(currentTime)}</T>
          </View>
        </View>
      </View>

      {/* =========================================================================
          4. BOTTOM TIMELINE CANVAS (FULL WIDTH MULTI-TRACK)
          TRACKS | 00:00  00:05  00:10  00:15  00:20  00:25
          ========================================================================= */}
      <View style={styles.timelineCanvas}>
        {/* Ruler Row */}
        <View style={styles.rulerRow}>
          <View style={styles.rulerTracksHeader}>
            <T style={styles.tracksHeaderText}>TRACKS</T>
          </View>

          <Pressable
            style={styles.rulerTicksContainer}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              // @ts-ignore
              const width = e.currentTarget?.offsetWidth || 800;
              const ratio = Math.max(0, Math.min(1, locationX / width));
              seekTime(ratio * totalTimelineSec);
            }}
          >
            {['00:00', '00:05', '00:10', '00:15', '00:20', '00:25', '00:29.4'].map((tick, i) => (
              <View key={i} style={styles.rulerTickMark}>
                <View style={styles.rulerTickLine} />
                <T style={styles.rulerTickLabel}>{tick}</T>
              </View>
            ))}
          </Pressable>
        </View>

        {/* Tracks Stack with Horizontal Zoom Scaling */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={{ minWidth: `${zoomLevel}%`, flex: 1 }}
        >
          <View style={styles.tracksStack}>
            {/* Vertical Playhead Needle */}
            <View
              pointerEvents="none"
              style={[
                styles.playheadNeedle,
                { left: `calc(130px + (100% - 130px) * ${currentTime / totalTimelineSec})` as any },
              ]}
            >
              <View style={styles.playheadHead} />
            </View>

            {/* Track 1: V1 Video */}
            <View style={styles.trackRow}>
              <View style={styles.trackHeaderCol}>
                <View style={[styles.trackCodeBadge, { backgroundColor: '#2B3252' }]}>
                  <T style={styles.trackCodeText}>V1</T>
                </View>
                <T style={styles.trackTitleText}>Video</T>
                <View style={styles.trackActions}>
                  <Pressable onPress={() => toggleTrackVisibility('track-v1')}>
                    <Icon
                      name="eye"
                      size={13}
                      color={tracks[0].visible ? '#94A3B8' : '#475569'}
                    />
                  </Pressable>
                  <Pressable onPress={() => toggleTrackLock('track-v1')}>
                    <Icon
                      name="lock"
                      size={13}
                      color={tracks[0].locked ? '#F59E0B' : '#475569'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.trackLaneArea}>
                {tracks[0].segments.map((seg) => {
                  const leftPct = (seg.start / totalTimelineSec) * 100;
                  const widthPct = ((seg.end - seg.start) / totalTimelineSec) * 100;
                  const isSelected = selectedClipId === seg.id;

                  return (
                    <Pressable
                      key={seg.id}
                      onPress={() => handleSelectSegment('track-v1', seg)}
                      style={[
                        styles.videoClipBlock,
                        { left: `${leftPct}%`, width: `${widthPct}%` },
                        isSelected && styles.clipBlockSelected,
                        !tracks[0].visible && { opacity: 0.35 },
                        Platform.OS === 'web' && ({
                          cursor: activeTool === 'razor' ? 'crosshair' : 'pointer',
                        } as any),
                      ]}
                    >
                      <T style={styles.clipBlockTitle} numberOfLines={1}>
                        {seg.label}
                      </T>
                      <T style={styles.clipBlockSub} numberOfLines={1}>
                        {seg.subLabel}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Track 2: T1 Captions */}
            <View style={styles.trackRow}>
              <View style={styles.trackHeaderCol}>
                <View style={[styles.trackCodeBadge, { backgroundColor: '#2E2654' }]}>
                  <T style={styles.trackCodeText}>T1</T>
                </View>
                <T style={styles.trackTitleText}>Text</T>
                <View style={styles.trackActions}>
                  <Pressable onPress={() => toggleTrackVisibility('track-t1')}>
                    <Icon
                      name="eye"
                      size={13}
                      color={tracks[1].visible ? '#94A3B8' : '#475569'}
                    />
                  </Pressable>
                  <Pressable onPress={() => toggleTrackLock('track-t1')}>
                    <Icon
                      name="lock"
                      size={13}
                      color={tracks[1].locked ? '#F59E0B' : '#475569'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.trackLaneArea}>
                {tracks[1].segments.map((seg) => {
                  const leftPct = (seg.start / totalTimelineSec) * 100;
                  const widthPct = ((seg.end - seg.start) / totalTimelineSec) * 100;
                  const isSelected = selectedClipId === seg.id;

                  return (
                    <Pressable
                      key={seg.id}
                      onPress={() => handleSelectSegment('track-t1', seg)}
                      style={[
                        styles.captionClipBlock,
                        { left: `${leftPct}%`, width: `${widthPct}%` },
                        isSelected && styles.clipBlockSelected,
                        !tracks[1].visible && { opacity: 0.35 },
                        Platform.OS === 'web' && ({
                          cursor: activeTool === 'razor' ? 'crosshair' : 'pointer',
                        } as any),
                      ]}
                    >
                      <T style={styles.captionClipText} numberOfLines={1}>
                        {seg.label}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Track 3: FX1 Punch-In */}
            <View style={styles.trackRow}>
              <View style={styles.trackHeaderCol}>
                <View style={[styles.trackCodeBadge, { backgroundColor: '#452B0E' }]}>
                  <T style={styles.trackCodeText}>FX1</T>
                </View>
                <T style={styles.trackTitleText}>Punch-In</T>
                <View style={styles.trackActions}>
                  <Pressable onPress={() => toggleTrackVisibility('track-fx1')}>
                    <Icon
                      name="eye"
                      size={13}
                      color={tracks[2].visible ? '#94A3B8' : '#475569'}
                    />
                  </Pressable>
                  <Pressable onPress={() => toggleTrackLock('track-fx1')}>
                    <Icon
                      name="lock"
                      size={13}
                      color={tracks[2].locked ? '#F59E0B' : '#475569'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.trackLaneArea}>
                {tracks[2].segments.map((seg) => {
                  const leftPct = (seg.start / totalTimelineSec) * 100;
                  const widthPct = ((seg.end - seg.start) / totalTimelineSec) * 100;
                  const isSelected = selectedClipId === seg.id;

                  return (
                    <Pressable
                      key={seg.id}
                      onPress={() => handleSelectSegment('track-fx1', seg)}
                      style={[
                        styles.zoomClipBlock,
                        { left: `${leftPct}%`, width: `${widthPct}%` },
                        isSelected && styles.clipBlockSelected,
                        !tracks[2].visible && { opacity: 0.35 },
                        Platform.OS === 'web' && ({
                          cursor: activeTool === 'razor' ? 'crosshair' : 'pointer',
                        } as any),
                      ]}
                    >
                      <T style={styles.zoomClipTitle} numberOfLines={1}>
                        {seg.label}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Track 4: A1 Audio */}
            <View style={styles.trackRow}>
              <View style={styles.trackHeaderCol}>
                <View style={[styles.trackCodeBadge, { backgroundColor: '#0C3D34' }]}>
                  <T style={styles.trackCodeText}>A1</T>
                </View>
                <T style={styles.trackTitleText}>Audio</T>
                <View style={styles.trackActions}>
                  <Pressable onPress={() => toggleTrackVisibility('track-a1')}>
                    <Icon
                      name="eye"
                      size={13}
                      color={tracks[3].visible ? '#94A3B8' : '#475569'}
                    />
                  </Pressable>
                  <Pressable onPress={() => toggleTrackLock('track-a1')}>
                    <Icon
                      name="lock"
                      size={13}
                      color={tracks[3].locked ? '#F59E0B' : '#475569'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.trackLaneArea}>
                {tracks[3].segments.map((seg) => {
                  const leftPct = (seg.start / totalTimelineSec) * 100;
                  const widthPct = ((seg.end - seg.start) / totalTimelineSec) * 100;
                  const isSelected = selectedClipId === seg.id;

                  return (
                    <Pressable
                      key={seg.id}
                      onPress={() => handleSelectSegment('track-a1', seg)}
                      style={[
                        styles.sfxClipBlock,
                        { left: `${leftPct}%`, width: `${widthPct}%` },
                        isSelected && styles.clipBlockSelected,
                        !tracks[3].visible && { opacity: 0.35 },
                        Platform.OS === 'web' && ({
                          cursor: activeTool === 'razor' ? 'crosshair' : 'pointer',
                        } as any),
                      ]}
                    >
                      {/* Audio Waveform visualization */}
                      <View style={styles.waveformContainer}>
                        <View style={[styles.waveBar, { height: 6 }]} />
                        <View style={[styles.waveBar, { height: 14 }]} />
                        <View style={[styles.waveBar, { height: 10 }]} />
                        <View style={[styles.waveBar, { height: 16 }]} />
                        <View style={[styles.waveBar, { height: 8 }]} />
                      </View>
                      <T style={styles.sfxClipTitle} numberOfLines={1}>
                        {seg.label}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Scrubber Minimap */}
        <Pressable
          style={styles.timelineMinimap}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            // @ts-ignore
            const width = e.currentTarget?.offsetWidth || 800;
            const ratio = Math.max(0, Math.min(1, locationX / width));
            seekTime(ratio * totalTimelineSec);
          }}
        >
          <View style={styles.minimapRail}>
            <View style={[styles.minimapChunk, { flex: 6, backgroundColor: '#3B436B' }]} />
            <View style={[styles.minimapChunk, { flex: 8, backgroundColor: '#6C4CF0' }]} />
            <View style={[styles.minimapChunk, { flex: 9, backgroundColor: '#3B436B' }]} />
            <View style={[styles.minimapChunk, { flex: 6.4, backgroundColor: '#282E47' }]} />
            {/* Viewport Box */}
            <View
              style={[
                styles.minimapLens,
                { left: `${(currentTime / totalTimelineSec) * 75}%` },
              ]}
            />
          </View>
          <T style={styles.minimapDuration}>{formatTimecode(totalTimelineSec)} total</T>
        </Pressable>
      </View>

      {/* =========================================================================
          5. RENDER MODAL OVERLAY
          ========================================================================= */}
      <Modal visible={isRendering} transparent animationType="fade">
        <View style={styles.renderModalBackdrop}>
          <View style={styles.renderModalCard}>
            <View style={styles.renderModalHeader}>
              <Icon name="film" size={20} color="#6C4CF0" />
              <T style={styles.renderModalTitle}>Rendering Reel Cuts</T>
            </View>
            <T style={styles.renderModalStage}>{renderStage}</T>

            {/* Progress Bar */}
            <View style={styles.renderProgressTrack}>
              <View style={[styles.renderProgressFill, { width: `${renderProgress}%` }]} />
            </View>
            <T style={styles.renderProgressPercent}>{`${renderProgress}%`}</T>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F3F4F6',
  },

  /* 1. TOP HEADER */
  topHeader: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6C4CF0',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  savedText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  pillDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  renderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C4CF0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    shadowColor: '#6C4CF0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  renderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* 2. UPPER WORKSPACE (3 PANELS) */
  upperWorkspace: {
    flex: 1.1,
    minHeight: 380,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  /* LEFT: MEDIA DRAWER */
  mediaDrawer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.1,
  },
  drawerTabsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: radius.sm,
    backgroundColor: '#F3F4F6',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  drawerTabBtnActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  drawerTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  drawerTabTextActive: {
    color: '#6C4CF0',
  },
  drawerScrollArea: {
    flex: 1,
    padding: spacing.sm,
  },
  drawerItemList: {
    gap: 6,
  },
  mediaAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  mediaAssetCardActive: {
    borderColor: '#818CF8',
    backgroundColor: '#F5F3FF',
  },
  mediaThumb: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  mediaMeta: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },

  /* CENTER: PREVIEW MONITOR */
  previewMonitorArea: {
    flex: 1,
    backgroundColor: '#11131E',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  previewHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  previewResolution: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  phoneOuterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  phoneDeviceFrame: {
    width: 174,
    height: 310,
    backgroundColor: '#000000',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#262A3B',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  phoneNotchSpeaker: {
    width: 44,
    height: 4,
    backgroundColor: '#262A3B',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 6,
    zIndex: 10,
  },
  phoneScreenSurface: {
    flex: 1,
    backgroundColor: '#141829',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatedPresenterFace: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#232946',
    borderWidth: 2,
    borderColor: '#434A6E',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  faceCenteringBox: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: -10,
    right: -10,
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  faceTargetReticle: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 8,
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  faceLockLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#10B981',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 3,
    borderRadius: 2,
    marginTop: -8,
  },
  sceneIndicatorPill: {
    position: 'absolute',
    top: 14,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sceneIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sfxActivePill: {
    position: 'absolute',
    top: 14,
    right: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  sfxActiveText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  captionOverlayBox: {
    position: 'absolute',
    bottom: 20,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  captionOverlayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  /* Transport Row */
  transportControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1E2F',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  transportBtn: {
    padding: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  playPauseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C4CF0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  timecodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#2B3245',
  },
  timecodeCurrent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },
  timecodeDivider: {
    fontSize: 11,
    color: '#64748B',
  },
  timecodeTotal: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },

  /* RIGHT: CLIP INSPECTOR */
  inspectorPanel: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    flexDirection: 'column',
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inspectorTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.1,
  },
  selectedBadge: {
    backgroundColor: '#EDE9FE',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6C4CF0',
  },
  inspectorScroll: {
    flex: 1,
    padding: spacing.md,
  },
  inspectorField: {
    marginBottom: spacing.md,
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  formInput: {
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  monoInput: {
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    justifyContent: 'center',
    marginTop: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sliderFill: {
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
    shadowRadius: 2,
  },
  dropdownBtn: {
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  dropdownBtnText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: spacing.md,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  toggleSwitch: {
    width: 34,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#6C4CF0',
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  applyCutsBtn: {
    width: '100%',
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  applyCutsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  deleteClipBtn: {
    width: '100%',
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteClipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },

  /* 3. TIMELINE TOOLBAR (DIVIDER BAR) */
  timelineToolbar: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  toolbarLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.sm,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  toolBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  toolBtnTextActive: {
    color: '#6C4CF0',
  },
  toolbarDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  cutSilencesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cutSilencesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C4CF0',
  },
  toolbarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    height: 28,
  },
  zoomSubBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  zoomValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 4,
  },
  activeTimecodeBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  activeTimecodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },

  /* 4. BOTTOM TIMELINE CANVAS (FULL WIDTH MULTI-TRACK) */
  timelineCanvas: {
    height: 270,
    backgroundColor: '#090B13',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  rulerRow: {
    height: 32,
    backgroundColor: '#0E111C',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2033',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rulerTracksHeader: {
    width: 130,
    paddingHorizontal: spacing.md,
  },
  tracksHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  rulerTicksContainer: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  rulerTickMark: {
    alignItems: 'center',
  },
  rulerTickLine: {
    width: 1,
    height: 4,
    backgroundColor: '#334155',
    marginBottom: 2,
  },
  rulerTickLabel: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
    fontWeight: '500',
  },

  /* Tracks Stack */
  tracksStack: {
    flex: 1,
    position: 'relative',
  },
  playheadNeedle: {
    position: 'absolute',
    top: -32,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
  playheadHead: {
    position: 'absolute',
    top: 0,
    left: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6C4CF0',
  },
  trackRow: {
    height: 48,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#131826',
    alignItems: 'center',
  },
  trackHeaderCol: {
    width: 130,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackCodeBadge: {
    width: 24,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCodeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  trackTitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
  },
  trackActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  trackLaneArea: {
    flex: 1,
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
  },

  /* Clip Blocks */
  videoClipBlock: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: '#272F4A',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#374266',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  captionClipBlock: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: '#1E2345',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#2D3466',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  zoomClipBlock: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: '#4A2E0C',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#784D16',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  sfxClipBlock: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: '#0B3B34',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#135C52',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clipBlockSelected: {
    backgroundColor: '#353D68',
    borderColor: '#818CF8',
    borderWidth: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px rgba(108, 76, 240, 0.5)',
      },
    }),
  },
  clipBlockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  clipBlockSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  captionClipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C7D2FE',
  },
  zoomClipTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FEF3C7',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveBar: {
    width: 2,
    backgroundColor: '#34D399',
    borderRadius: 1,
  },
  sfxClipTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A7F3D0',
  },

  /* Minimap */
  timelineMinimap: {
    height: 22,
    backgroundColor: '#07090F',
    borderTopWidth: 1,
    borderTopColor: '#171B2B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 10,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  minimapRail: {
    flex: 1,
    height: 8,
    borderRadius: 2,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  minimapChunk: {
    height: '100%',
  },
  minimapLens: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
    borderWidth: 1,
    borderColor: '#818CF8',
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  minimapDuration: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: Platform.select({ web: "'DM Mono', monospace", default: 'Courier' }),
  },

  /* 5. RENDER MODAL */
  renderModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  renderModalCard: {
    width: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  renderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  renderModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  renderModalStage: {
    fontSize: 13,
    color: '#4B5563',
    minHeight: 38,
  },
  renderProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  renderProgressFill: {
    height: '100%',
    backgroundColor: '#6C4CF0',
    borderRadius: 4,
  },
  renderProgressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C4CF0',
    alignSelf: 'flex-end',
  },
});
