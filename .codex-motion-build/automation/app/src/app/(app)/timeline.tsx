import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../../components/Icon';
import { VideoPlayer } from '../../components/VideoPlayer';
import { Button, EmptyState, ErrorState, Input, Skeleton, T } from '../../components/ui';
import { absoluteUrl, errorText, post } from '../../api/client';
import { editor, Scene } from '../../api/editor';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';

type TimedScene = { scene: Scene; index: number; start: number; end: number };

function seconds(value: string): number {
  const parts = value.trim().replace(/s$/i, '').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  return parts.reduce((sum, part) => sum * 60 + part, 0);
}

function timedScenes(scenes: Scene[]): TimedScene[] {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const match = (scene.timestamp_output || '').match(/(\d+(?::\d+)?(?:\.\d+)?)s?\s*-\s*(\d+(?::\d+)?(?:\.\d+)?)s?/i);
    const parsedStart = match ? seconds(match[1]) : NaN;
    const parsedEnd = match ? seconds(match[2]) : NaN;
    const start = Number.isFinite(parsedStart) ? parsedStart : cursor;
    const end = Number.isFinite(parsedEnd) && parsedEnd > start ? parsedEnd : start + Math.max(0.1, Number(scene.duration) || 1);
    cursor = end;
    return { scene, index, start, end };
  });
}

function timeLabel(value: number): string {
  const safe = Math.max(0, value);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${Math.floor(safe % 60).toString().padStart(2, '0')}`;
}

export default function TimelineEditor() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { current, list, error, loading, reload } = useStoryboards();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rendering, setRendering] = useState(false);
  const scenes = useMemo(() => timedScenes(current?.storyboard?.scenes ?? []), [current?.storyboard?.scenes]);
  const duration = Math.max(
    1,
    Number(current?.storyboard?.duration?.output_seconds) || 0,
    scenes.length ? scenes[scenes.length - 1].end : 0,
  );
  const selected = scenes[Math.min(selectedIndex, scenes.length - 1)] ?? null;
  const stacked = width < 1050;
  const renderBusy = rendering || current?.render_job?.status === 'queued' || current?.render_job?.status === 'running';
  const renderUrl = current?.latest_render?.video_url || current?.latest_preview?.video_url;

  useEffect(() => { setSelectedIndex(0); }, [current?.id]);

  // A change request for the selected clip: films from the creative director come back as a new version,
  // engine cuts go to the revision agent. Both are scoped to the scene the user picked on the timeline.
  const agent = (current as any)?.agent as { root: string; pending: string | null } | undefined;
  const [change, setChange] = useState('');
  const [sending, setSending] = useState(false);
  async function requestChange() {
    if (!current || !selected || !change.trim()) return;
    setSending(true);
    try {
      if (agent?.root) await post(`/api/editor/agent/jobs/${agent.root}/revise`, { message: change.trim(), scene: selected.index + 1 });
      else await editor.chat(current.id, `Scene ${selected.index + 1} (${timeLabel(selected.start)}-${timeLabel(selected.end)}): ${change.trim()}`);
      setChange('');
      await reload();
      toast(agent?.root ? 'Change request sent. A new version is in production.' : 'Revision started');
    } catch (cause) {
      toast(errorText(cause));
    } finally {
      setSending(false);
    }
  }

  async function startRender() {
    if (!current) return;
    if (!current.approved) {
      router.push({ pathname: '/storyboard', params: { sb: current.id } });
      return;
    }
    setRendering(true);
    try {
      await editor.render(current.id, 'preview');
      await reload();
      toast('Preview render started');
    } catch (cause) {
      toast(errorText(cause));
    } finally {
      setRendering(false);
    }
  }

  function selectScene(index: number) {
    setSelectedIndex(Math.max(0, Math.min(index, scenes.length - 1)));
  }

  if (error && !list) return <View style={styles.page}><ErrorState message={error} onRetry={reload} /></View>;
  if (loading) return <View style={styles.page}><Skeleton /></View>;
  if (!current) return (
    <View style={styles.page}>
      <EmptyState icon="film" title="No timeline yet" message="Create a reel to build its scene plan." action={<Button label="Create a reel" onPress={() => router.push('/new')} />} />
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.brand}><Icon name="sparkles" size={14} color="#fff" /><T style={styles.brandText}>GROWTHOS</T></View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <T style={styles.title} numberOfLines={1}>{current.storyboard?.title || current.prompt || 'Untitled reel'}</T>
            <T style={styles.subtle}>Scene timeline · {scenes.length} scenes · {timeLabel(duration)}</T>
          </View>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.status}><View style={[styles.statusDot, { backgroundColor: current.approved ? '#10B981' : '#F59E0B' }]} /><T style={styles.statusText}>{current.approved ? 'Approved' : 'Needs approval'}</T></View>
          <Button label={renderBusy ? 'Rendering…' : current.approved ? 'Render preview' : 'Review & render'} icon="film" loading={renderBusy} onPress={startRender} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.workspace, stacked && styles.workspaceStacked]}>
          <View style={[styles.panel, styles.mediaPanel, stacked && styles.stackedPanel]}>
            <T style={styles.panelTitle}>MEDIA & EFFECTS</T>
            <View style={styles.panelBody}>
              <T style={styles.groupLabel}>SOURCE</T>
              {current.lane === 'motion' ? (
                <View style={styles.asset}><Icon name="sparkles" size={19} color="#6C4CF0" /><View style={{ flex: 1 }}><T style={styles.assetName}>Motion graphics</T><T style={styles.subtle}>Generated scene plan</T></View></View>
              ) : current.video_path ? (
                <View style={styles.asset}><Icon name="video" size={19} color="#6C4CF0" /><View style={{ flex: 1 }}><T style={styles.assetName} numberOfLines={2}>{current.video_path.split(/[\\/]/).pop()}</T><T style={styles.subtle}>Storyboard source</T></View></View>
              ) : <T style={styles.subtle}>No source footage</T>}
              <T style={[styles.groupLabel, { marginTop: 22 }]}>AVAILABLE TRACKS</T>
              <View style={styles.asset}><Icon name="video" size={18} color="#6C4CF0" /><T style={styles.assetName}>Scenes ({scenes.length})</T></View>
              <View style={styles.asset}><Icon name="type" size={18} color="#9B6CF0" /><T style={styles.assetName}>Captions ({scenes.filter((item) => item.scene.caption).length})</T></View>
              <View style={styles.asset}><Icon name="volume" size={18} color="#10B981" /><T style={styles.assetName}>Sound cues ({scenes.reduce((sum, item) => sum + (item.scene.sfx?.length || 0), 0)})</T></View>
              <T style={[styles.subtle, { marginTop: 18 }]}>Pick a clip on the timeline, then describe the change in the inspector. It comes back as a new version to review.</T>
            </View>
          </View>

          <View style={[styles.panel, styles.previewPanel, stacked && styles.stackedPanel]}>
            <View style={styles.panelHeading}><T style={styles.panelTitle}>PREVIEW MONITOR</T><T style={styles.subtle}>{renderUrl ? 'Rendered video' : 'Storyboard preview'}</T></View>
            <View style={styles.previewArea}>
              {renderUrl ? <VideoPlayer uri={absoluteUrl(renderUrl) as string} /> : (
                <View style={styles.phone}>
                  <View style={styles.phoneTop} />
                  <View style={styles.phoneContent}>
                    <View style={styles.scenePill}><T style={styles.scenePillText}>SCENE {selected ? selected.index + 1 : '—'}</T></View>
                    <Icon name={current.lane === 'motion' ? 'sparkles' : 'video'} size={33} color="#9C89FF" />
                    <T style={styles.previewScene} numberOfLines={3}>{selected?.scene.type || 'No scene selected'}</T>
                    <T style={styles.previewAction} numberOfLines={5}>{selected?.scene.action || 'Scene details will appear here.'}</T>
                    {selected?.scene.caption ? <View style={styles.caption}><T style={styles.captionText} numberOfLines={4}>{selected.scene.caption}</T></View> : null}
                  </View>
                </View>
              )}
            </View>
            <View style={styles.transport}>
              <Pressable onPress={() => selectScene(selectedIndex - 1)} disabled={selectedIndex <= 0} style={styles.transportButton}><Icon name="skip-back" size={16} color={selectedIndex <= 0 ? '#B8BECA' : '#374151'} /></Pressable>
              <T style={styles.timecode}>{selected ? timeLabel(selected.start) : '00:00'} / {timeLabel(duration)}</T>
              <Pressable onPress={() => selectScene(selectedIndex + 1)} disabled={selectedIndex >= scenes.length - 1} style={styles.transportButton}><Icon name="skip-forward" size={16} color={selectedIndex >= scenes.length - 1 ? '#B8BECA' : '#374151'} /></Pressable>
            </View>
          </View>

          <View style={[styles.panel, styles.inspectorPanel, stacked && styles.stackedPanel]}>
            <View style={styles.panelHeading}><T style={styles.panelTitle}>CLIP INSPECTOR</T><T style={styles.subtle}>{selected ? `Scene ${selected.index + 1}` : 'No selection'}</T></View>
            <View style={styles.panelBody}>
              {selected ? (
                <>
                  <T style={styles.fieldLabel}>SCENE</T><T style={styles.fieldValue}>{selected.scene.type || 'Untitled scene'}</T>
                  <T style={styles.fieldLabel}>OUTPUT RANGE</T><T style={styles.fieldValue}>{selected.scene.timestamp_output || `${timeLabel(selected.start)} – ${timeLabel(selected.end)}`}</T>
                  <T style={styles.fieldLabel}>SOURCE RANGE</T><T style={styles.fieldValue}>{selected.scene.source_range || 'No source range'}</T>
                  <T style={styles.fieldLabel}>ACTION</T><T style={styles.fieldValue}>{selected.scene.action || 'No action specified'}</T>
                  <T style={styles.fieldLabel}>CAPTION</T><T style={styles.fieldValue}>{selected.scene.caption || 'No caption'}</T>
                  <T style={styles.fieldLabel}>SOUND CUES</T><T style={styles.fieldValue}>{selected.scene.sfx?.map((cue) => cue.name).join(', ') || 'None'}</T>
                </>
              ) : <T style={styles.subtle}>Select a scene on the timeline to inspect it.</T>}
              {selected ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  <T style={styles.fieldLabel}>CHANGE THIS CLIP</T>
                  {agent?.pending ? (
                    <T style={styles.subtle}>A new version is in production. You can ask for more changes once it lands.</T>
                  ) : (
                    <>
                      <Input value={change} onChangeText={setChange} multiline placeholder={`e.g. Make scene ${selected.index + 1} faster, change the text to…`} />
                      <Button label={sending ? 'Sending…' : 'Request change'} variant="primary" icon="send" loading={sending} disabled={!change.trim() || sending} onPress={requestChange} />
                    </>
                  )}
                </View>
              ) : null}
              <View style={{ marginTop: 12 }}><Button label="Open in Storyboard" variant="secondary" onPress={() => router.push({ pathname: '/storyboard', params: { sb: current.id } })} /></View>
            </View>
          </View>
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelineToolbar}><View><T style={styles.panelTitle}>TIMELINE</T><T style={styles.subtle}>Select a clip to inspect its saved storyboard data</T></View><T style={styles.timecode}>{timeLabel(duration)} total</T></View>
          <ScrollView horizontal contentContainerStyle={{ minWidth: 760, flexGrow: 1 }}>
            <View style={{ width: '100%' }}>
              <View style={styles.ruler}><T style={styles.trackName}>TRACKS</T><View style={styles.rulerLane}>{Array.from({ length: 6 }, (_, index) => <T key={index} style={styles.tick}>{timeLabel(duration * index / 5)}</T>)}</View></View>
              <TrackRow label={current.lane === 'motion' ? 'M1  Motion' : 'V1  Video'} color="#6C4CF0" scenes={scenes} duration={duration} selectedIndex={selectedIndex} selectScene={selectScene} text={(item) => item.scene.type || `Scene ${item.index + 1}`} />
              <TrackRow label="T1  Captions" color="#9B6CF0" scenes={scenes.filter((item) => !!item.scene.caption)} duration={duration} selectedIndex={selectedIndex} selectScene={selectScene} text={(item) => item.scene.caption} />
              <TrackRow label="A1  Sound" color="#10B981" scenes={scenes.filter((item) => !!item.scene.sfx?.length)} duration={duration} selectedIndex={selectedIndex} selectScene={selectScene} text={(item) => item.scene.sfx.map((cue) => cue.name).join(', ')} />
            </View>
          </ScrollView>
          {scenes.length === 0 ? <T style={[styles.subtle, { padding: 18 }]}>This storyboard has no scene plan yet.</T> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function TrackRow({ label, color, scenes, duration, selectedIndex, selectScene, text }: {
  label: string; color: string; scenes: TimedScene[]; duration: number; selectedIndex: number;
  selectScene: (index: number) => void; text: (item: TimedScene) => string;
}) {
  return <View style={styles.trackRow}><T style={styles.trackName}>{label}</T><View style={styles.trackLane}>
    {scenes.map((item) => {
      const left = Math.max(0, item.start / duration * 100);
      const right = Math.min(100, item.end / duration * 100);
      return <Pressable key={item.index} onPress={() => selectScene(item.index)} style={[styles.clip, { left: `${left}%` as any, width: `${Math.max(1, right - left)}%` as any, backgroundColor: color, borderColor: item.index === selectedIndex ? '#111827' : color }]}>
        <T style={styles.clipText} numberOfLines={1}>{text(item)}</T>
      </Pressable>;
    })}
  </View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { minHeight: 70, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E9F0', paddingHorizontal: 22, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  brand: { backgroundColor: '#6C4CF0', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: '700', color: '#171B2A' },
  subtle: { fontSize: 12, color: '#727D91', lineHeight: 18 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F7F8FB', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: '#5D6779', fontSize: 11 },
  content: { padding: 18, gap: 16, paddingBottom: 28 },
  workspace: { flexDirection: 'row', gap: 14, minHeight: 470 },
  workspaceStacked: { flexWrap: 'wrap' },
  panel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DFE4ED', borderRadius: 14, overflow: 'hidden' },
  mediaPanel: { width: 246 },
  previewPanel: { flex: 1, minWidth: 300 },
  inspectorPanel: { width: 270 },
  stackedPanel: { flexGrow: 1, minHeight: 330 },
  panelTitle: { fontSize: 11, fontWeight: '800', color: '#495367', letterSpacing: 0.8 },
  panelHeading: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECEDF2', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelBody: { padding: 16, gap: 11 },
  groupLabel: { color: '#8B95A7', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  asset: { borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 9, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  assetName: { color: '#293144', fontSize: 12, fontWeight: '600' },
  previewArea: { flex: 1, backgroundColor: '#F8F9FC', padding: 14, alignItems: 'center', justifyContent: 'center', minHeight: 370 },
  phone: { width: 200, height: 355, borderRadius: 22, backgroundColor: '#111426', borderWidth: 5, borderColor: '#292D3D', padding: 9 },
  phoneTop: { alignSelf: 'center', width: 48, height: 5, borderRadius: 5, backgroundColor: '#3E4354', marginBottom: 16 },
  phoneContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10 },
  scenePill: { borderRadius: 20, backgroundColor: '#2D2853', paddingHorizontal: 10, paddingVertical: 5 },
  scenePillText: { fontSize: 9, fontWeight: '800', color: '#B8A8FF', letterSpacing: 0.8 },
  previewScene: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  previewAction: { fontSize: 11, color: '#C8C9D6', textAlign: 'center', lineHeight: 16 },
  caption: { backgroundColor: '#262947', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  captionText: { fontSize: 10, color: '#fff', textAlign: 'center', fontWeight: '600' },
  transport: { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: '#ECEEF3' },
  transportButton: { padding: 7 },
  timecode: { color: '#536075', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  fieldLabel: { color: '#8993A4', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginTop: 5 },
  fieldValue: { color: '#2A3448', fontSize: 12, lineHeight: 17 },
  timeline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DFE4ED', borderRadius: 14, overflow: 'hidden' },
  timelineToolbar: { paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECEEF3' },
  ruler: { flexDirection: 'row', height: 34, borderBottomWidth: 1, borderBottomColor: '#E8EBF0' },
  trackName: { width: 125, paddingHorizontal: 12, alignSelf: 'center', color: '#657085', fontSize: 11, fontWeight: '700' },
  rulerLane: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  tick: { fontSize: 10, color: '#929BAB', fontVariant: ['tabular-nums'] },
  trackRow: { flexDirection: 'row', minHeight: 55, borderBottomWidth: 1, borderBottomColor: '#EBEDF2' },
  trackLane: { flex: 1, position: 'relative', backgroundColor: '#FAFBFD', marginVertical: 7, marginRight: 10, borderRadius: 5 },
  clip: { position: 'absolute', top: 3, bottom: 3, borderRadius: 5, borderWidth: 2, justifyContent: 'center', paddingHorizontal: 6, overflow: 'hidden' },
  clipText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
