import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, ErrorState, Field, Input, LinkText, SectionTitle, Sheet, Skeleton, T } from '../../components/ui';
import { errorText } from '../../api/client';
import { editor, when } from '../../api/editor';
import { usePoll } from '../../state/usePoll';
import { useToast } from '../../state/toast';
import { Tone, spacing, useTheme } from '../../theme';

const TONE: Record<string, Tone> = { SCHEDULED: 'info', PUBLISHING: 'warning', PUBLISHED: 'success', FAILED: 'danger', CANCELED: 'neutral' };
const DEMO_PLATFORMS = [
  { platform: 'instagram', label: 'Instagram Reels', account: '@rockcastle.experiences', connected: true, detail: '' },
  { platform: 'whatsapp', label: 'WhatsApp', account: '+91 9876543210', connected: true, detail: '' },
  { platform: 'youtube', label: 'YouTube Shorts', account: 'Rockcastle Events', connected: true, detail: '' },
];
const DEMO_QUEUE = [
  { id: '1', title: 'Event Highlights', status: 'PUBLISHED', caption: 'Amazing event coverage with incredible moments', platforms: ['instagram'], published_at: Date.now() - 86400000, results: { instagram: { url: 'https://instagram.com/p/example' } }, metrics: { views: 1240, likes: 89, comments: 12, sends: 34, saves: 23, avg_watch_seconds: 8.5, completion_pct: 92 }, error: null },
  { id: '2', title: 'Behind The Scenes', status: 'PUBLISHED', caption: 'BTS of our latest production', platforms: ['instagram', 'whatsapp'], published_at: Date.now() - 172800000, results: { instagram: { url: 'https://instagram.com/p/example2' } }, metrics: { views: 856, likes: 67, comments: 8, sends: 21, saves: 15, avg_watch_seconds: 6.2, completion_pct: 88 }, error: null },
  { id: '3', title: 'Client Testimonial', status: 'SCHEDULED', caption: 'Happy client sharing their experience', platforms: ['youtube'], scheduled_at: new Date(Date.now() + 3600000).toISOString(), results: null, metrics: null, error: null },
];

type Slot = 'now' | '1h' | 'tomorrow9' | 'tomorrow18' | 'custom';

function slotToIso(slot: Slot, custom: string): string | null | 'invalid' {
  const d = new Date();
  if (slot === 'now') return null;
  if (slot === '1h') d.setHours(d.getHours() + 1);
  else if (slot === 'tomorrow9' || slot === 'tomorrow18') { d.setDate(d.getDate() + 1); d.setHours(slot === 'tomorrow9' ? 9 : 18, 0, 0, 0); }
  else {
    const t = new Date(custom.trim().replace(' ', 'T'));
    if (isNaN(t.getTime()) || t.getTime() < Date.now() - 60000) return 'invalid';
    return t.toISOString();
  }
  return d.toISOString();
}

export default function Publishing() {
  const toast = useToast();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ sb?: string }>();
  const [queue, setQueue] = useState<any[]>(DEMO_QUEUE);
  const [accounts, setAccounts] = useState<any[]>(DEMO_PLATFORMS);
  const [title, setTitle] = useState('New Campaign');
  const [caption, setCaption] = useState('Check out this amazing content! 🎬');
  const [slot, setSlot] = useState<Slot>('now');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [metricsFor, setMetricsFor] = useState<any | null>(null);

  const submit = () => {
    const when_ = slotToIso(slot, custom);
    if (when_ === 'invalid') return setErr('Enter a future date and time like 2026-11-12 18:30');
    setErr(null);
    toast(`Publishing to ${slot === 'now' ? 'all platforms' : 'schedule'}...`);
  };

  return (
    <Page title="Publishing" subtitle="Schedule finished reels and watch them go out">
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        <Row style={{ alignItems: 'stretch' }}>
          {accounts.map((a) => (
            <Card key={a.platform} style={{ flexGrow: 1, flexBasis: 220, minWidth: 220 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <T variant="h3">{a.label}</T>
                <Badge label="✅ Connected" tone="success" dot />
              </Row>
              <T variant="small" muted>Account: {a.account}</T>
            </Card>
          ))}
        </Row>

        <Card style={{ gap: spacing.md }}>
          <SectionTitle title="📤 Schedule a reel" />
          <Field label="Title"><Input value={title} onChangeText={setTitle} placeholder="Give it a name" /></Field>
          <Field label="Caption"><Input value={caption} onChangeText={setCaption} multiline placeholder="Write your caption" /></Field>
          <Field label="When">
            <Chips options={[
              { value: 'now', label: 'Publish now' },
              { value: '1h', label: 'In 1 hour' },
              { value: 'tomorrow9', label: 'Tomorrow 09:00' },
              { value: 'tomorrow18', label: 'Tomorrow 18:00' },
              { value: 'custom', label: 'Pick a time' }
            ]} value={slot} onChange={(v: any) => v && setSlot(v)} />
          </Field>
          {slot === 'custom' ? <Field label="Date & time" hint="Format: 2026-11-12 18:30"><Input value={custom} onChangeText={setCustom} placeholder="2026-11-12 18:30" /></Field> : null}
          {err ? <Banner tone="danger">{err}</Banner> : null}
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={slot === 'now' ? '🚀 Publish Now' : '📅 Schedule'} variant="primary" onPress={submit} loading={busy === 'schedule'} />
            </View>
          </Row>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <SectionTitle title={`📊 Queue (${queue.length})`} />
          {queue.map((p) => (
            <Card key={p.id} style={{ backgroundColor: colors.surfaceAlt, padding: spacing.md }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Row gap={spacing.sm} style={{ marginBottom: spacing.xs }}>
                    <T variant="h3">{p.title}</T>
                    <Badge label={p.status} tone={TONE[p.status]} />
                  </Row>
                  <T variant="small" muted>{p.status === 'PUBLISHED' ? `Published ${when(p.published_at)}` : `Scheduled for ${when(p.scheduled_at)}`} • {p.platforms.join(', ')}</T>
                </View>
              </Row>
              <T muted numberOfLines={2}>{p.caption}</T>
              {p.metrics ? (
                <Row style={{ marginTop: spacing.sm, gap: spacing.md }}>
                  <T variant="small">👁️ {p.metrics.views} views</T>
                  <T variant="small">❤️ {p.metrics.likes} likes</T>
                  <T variant="small">💬 {p.metrics.comments} comments</T>
                  <T variant="small">📤 {p.metrics.sends} sends</T>
                </Row>
              ) : null}
            </Card>
          ))}
        </Card>
      </ScrollView>
    </Page>
  );
}
