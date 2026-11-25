import React, { useState, useMemo } from 'react';
import { Pressable, StyleSheet, View, ScrollView, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Button, Card, EmptyState, SectionTitle, T } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { font, radius, spacing, useTheme } from '../../theme';
import { useToast } from '../../state/toast';

type TimeRange = 'today' | '7d' | 'month' | '30d' | 'all';

interface MetricSnapshot {
  views: number;
  viewsToday: number;
  reach: number;
  reachToday: number;
  engagementRate: number;
  avgWatchSeconds: number;
  avgCompletionPct: number;
  adSpend: number;
  adRoas: number;
  cpm: number;
  cpc: number;
  linkClicks: number;
}

const METRIC_DATA: Record<TimeRange, MetricSnapshot> = {
  today: {
    views: 14250,
    viewsToday: 14250,
    reach: 11840,
    reachToday: 11840,
    engagementRate: 9.8,
    avgWatchSeconds: 14.2,
    avgCompletionPct: 84.5,
    adSpend: 45,
    adRoas: 4.6,
    cpm: 1.85,
    cpc: 0.28,
    linkClicks: 162,
  },
  '7d': {
    views: 118400,
    viewsToday: 14250,
    reach: 89600,
    reachToday: 11840,
    engagementRate: 9.2,
    avgWatchSeconds: 13.9,
    avgCompletionPct: 81.2,
    adSpend: 380,
    adRoas: 4.3,
    cpm: 2.05,
    cpc: 0.31,
    linkClicks: 1240,
  },
  month: {
    views: 386420,
    viewsToday: 14250,
    reach: 248900,
    reachToday: 11840,
    engagementRate: 9.4,
    avgWatchSeconds: 14.1,
    avgCompletionPct: 82.4,
    adSpend: 1420,
    adRoas: 4.2,
    cpm: 2.10,
    cpc: 0.32,
    linkClicks: 4430,
  },
  '30d': {
    views: 412800,
    viewsToday: 14250,
    reach: 264200,
    reachToday: 11840,
    engagementRate: 9.1,
    avgWatchSeconds: 13.8,
    avgCompletionPct: 80.8,
    adSpend: 1580,
    adRoas: 4.1,
    cpm: 2.15,
    cpc: 0.34,
    linkClicks: 4890,
  },
  all: {
    views: 892400,
    viewsToday: 14250,
    reach: 580100,
    reachToday: 11840,
    engagementRate: 8.9,
    avgWatchSeconds: 13.6,
    avgCompletionPct: 79.5,
    adSpend: 3250,
    adRoas: 4.4,
    cpm: 2.02,
    cpc: 0.30,
    linkClicks: 11200,
  },
};

const DAILY_BARS = [
  { day: 'Mon', views: 24.2, height: 48, reach: '18K' },
  { day: 'Tue', views: 32.5, height: 64, reach: '24K' },
  { day: 'Wed', views: 48.1, height: 86, reach: '38K' },
  { day: 'Thu', views: 42.0, height: 78, reach: '33K' },
  { day: 'Fri', views: 58.6, height: 100, reach: '46K' },
  { day: 'Sat', views: 39.4, height: 72, reach: '31K' },
  { day: 'Sun', views: 52.8, height: 92, reach: '41K' },
];

const TOP_CLIENT_REELS = [
  {
    id: '1',
    title: 'Zero to One Engineer - System Architecture',
    platform: 'Instagram Reels',
    platformKey: 'instagram',
    type: 'Boosted Ad',
    views: '142.8K',
    reach: '118.2K',
    completion: '88.4%',
    shares: '4.8K',
    saves: '6.2K',
    spend: '$280',
    roas: '5.2x',
  },
  {
    id: '2',
    title: 'Claude Motion Reel - Launch Cut',
    platform: 'YouTube Shorts',
    platformKey: 'youtube',
    type: 'Organic Viral',
    views: '116.4K',
    reach: '94.6K',
    completion: '84.1%',
    shares: '3.9K',
    saves: '2.8K',
    spend: '$0',
    roas: '—',
  },
  {
    id: '3',
    title: 'AILO Motion Launch Cut - Product Demo',
    platform: 'Instagram Reels',
    platformKey: 'instagram',
    type: 'Boosted Ad',
    views: '84.2K',
    reach: '68.5K',
    completion: '81.9%',
    shares: '2.6K',
    saves: '4.1K',
    spend: '$190',
    roas: '4.1x',
  },
  {
    id: '4',
    title: 'Rockcastle Studio Motion Systems',
    platform: 'X / Twitter',
    platformKey: 'twitter',
    type: 'Organic',
    views: '42.9K',
    reach: '36.8K',
    completion: '76.2%',
    shares: '1.8K',
    saves: '940',
    spend: '$0',
    roas: '—',
  },
];

export default function Analytics() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const [range, setRange] = useState<TimeRange>('month');

  const cur = useMemo(() => METRIC_DATA[range], [range]);

  const rangeLabels: { key: TimeRange; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: 'month', label: 'This Month' },
    { key: '30d', label: 'Last 30 Days' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <Page
      title="Client & Audience Insights"
      subtitle="Comprehensive social reach, viewer retention, and ad campaign performance across client channels"
    >
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* =========================================================================
            HEADER FILTER BAR (TIME RANGE + EXPORT)
            ========================================================================= */}
        <View style={styles.topControlBar}>
          <View style={[styles.rangePillGroup, { backgroundColor: '#F1F5F9', borderColor: colors.border }]}>
            {rangeLabels.map((r) => {
              const active = range === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRange(r.key)}
                  style={[
                    styles.rangeTab,
                    active && [
                      styles.rangeTabActive,
                      Platform.OS === 'web' &&
                        ({
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
                        } as any),
                    ],
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: active ? font.bold : font.medium,
                      fontSize: 12,
                      color: active ? colors.primary : colors.textMuted,
                    }}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label="Export Client Report"
              variant="secondary"
              icon="download"
              onPress={() => toast('Exporting PDF Client Report...')}
            />
            <Button
              label="Schedule Post"
              variant="primary"
              icon="plus"
              onPress={() => router.push('/calendar' as any)}
            />
          </View>
        </View>

        {/* =========================================================================
            EXECUTIVE AUDIENCE REACH & VIEW METRICS (TODAY VS MONTH)
            ========================================================================= */}
        <View style={styles.statGrid}>
          {/* Total Views */}
          <Card style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <T variant="label" muted style={{ fontSize: 11, letterSpacing: 0.6 }}>TOTAL VIEWS / PLAYS</T>
              <View style={[styles.badgePill, { backgroundColor: '#ECFDF5' }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 10, color: '#10B981' }}>+24.8%</Text>
              </View>
            </View>
            <T variant="stat" style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 6 }}>
              {cur.views.toLocaleString()}
            </T>
            <View style={styles.cardFooter}>
              <Icon name="clock" size={13} color={colors.primary} />
              <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.textMuted }}>
                Today: <Text style={{ fontFamily: font.bold, color: colors.primary }}>{cur.viewsToday.toLocaleString()}</Text> views
              </Text>
            </View>
          </Card>

          {/* Total Unique Reach */}
          <Card style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <T variant="label" muted style={{ fontSize: 11, letterSpacing: 0.6 }}>ACCOUNTS REACHED</T>
              <View style={[styles.badgePill, { backgroundColor: '#ECFDF5' }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 10, color: '#10B981' }}>+18.2%</Text>
              </View>
            </View>
            <T variant="stat" style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 6 }}>
              {cur.reach.toLocaleString()}
            </T>
            <View style={styles.cardFooter}>
              <Icon name="users" size={13} color={colors.textMuted} />
              <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.textMuted }}>
                86% non-followers reached
              </Text>
            </View>
          </Card>

          {/* Engagement Rate */}
          <Card style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <T variant="label" muted style={{ fontSize: 11, letterSpacing: 0.6 }}>ENGAGEMENT RATE</T>
              <View style={[styles.badgePill, { backgroundColor: '#FFF5F0' }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 10, color: colors.primary }}>Top 5%</Text>
              </View>
            </View>
            <T variant="stat" style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 6 }}>
              {cur.engagementRate}%
            </T>
            <View style={styles.cardFooter}>
              <Icon name="share" size={13} color={colors.textMuted} />
              <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.textMuted }}>
                Likes, Shares & Saves
              </Text>
            </View>
          </Card>

          {/* Average Watch Time */}
          <Card style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <T variant="label" muted style={{ fontSize: 11, letterSpacing: 0.6 }}>AVG WATCH RETENTION</T>
              <View style={[styles.badgePill, { backgroundColor: '#ECFDF5' }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 10, color: '#10B981' }}>High</Text>
              </View>
            </View>
            <T variant="stat" style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 6 }}>
              {cur.avgCompletionPct}%
            </T>
            <View style={styles.cardFooter}>
              <Icon name="play" size={13} color={colors.textMuted} />
              <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.textMuted }}>
                {cur.avgWatchSeconds}s avg watch time
              </Text>
            </View>
          </Card>
        </View>

        {/* =========================================================================
            DAILY AUDIENCE REACH & VIEW GROWTH (VISUAL HEAT GRAPH)
            ========================================================================= */}
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <View style={{ gap: 2 }}>
              <T variant="h3">Audience View Velocity & Daily Reach</T>
              <T variant="small" muted>Daily views across Instagram, YouTube Shorts, and X campaigns</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.primary }} />
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.textMuted }}>Daily Views (K)</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.textMuted }}>Unique Reach</Text>
              </View>
            </View>
          </View>

          {/* Visual Bars Container */}
          <View style={styles.chartContainer}>
            {DAILY_BARS.map((bar, idx) => (
              <View key={bar.day} style={styles.barColumn}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: colors.text, marginBottom: 6 }}>
                  {bar.views}K
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${bar.height}%`,
                        backgroundColor: idx === 4 ? colors.primary : '#FF7845',
                      },
                    ]}
                  />
                </View>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.text, marginTop: 8 }}>
                  {bar.day}
                </Text>
                <Text style={{ fontFamily: font.mono, fontSize: 10, color: colors.textFaint }}>
                  {bar.reach}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* =========================================================================
            PAID AD & CAMPAIGN CONVERSION PERFORMANCE (CLIENT ADS)
            ========================================================================= */}
        <SectionTitle title="Client Ad Campaign & Conversion Insights" />
        <Card style={{ padding: spacing.lg }}>
          <View style={styles.adMetricsRow}>
            <View style={styles.adCell}>
              <T variant="label" muted>TOTAL AD SPEND</T>
              <T variant="h2" style={{ marginTop: 4, fontWeight: '700', color: colors.text }}>
                ${cur.adSpend.toLocaleString()}
              </T>
              <T variant="caption" muted style={{ marginTop: 2 }}>Meta & Google Ads</T>
            </View>

            <View style={[styles.adCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 16 }]}>
              <T variant="label" muted>CAMPAIGN ROAS</T>
              <T variant="h2" style={{ marginTop: 4, fontWeight: '700', color: colors.primary }}>
                {cur.adRoas}x
              </T>
              <T variant="caption" muted style={{ marginTop: 2 }}>Return on Ad Spend</T>
            </View>

            <View style={[styles.adCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 16 }]}>
              <T variant="label" muted>COST PER 1K VIEWS</T>
              <T variant="h2" style={{ marginTop: 4, fontWeight: '700', color: colors.text }}>
                ${cur.cpm}
              </T>
              <T variant="caption" muted style={{ marginTop: 2 }}>Industry avg: $5.20</T>
            </View>

            <View style={[styles.adCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 16 }]}>
              <T variant="label" muted>COST PER CLICK (CPC)</T>
              <T variant="h2" style={{ marginTop: 4, fontWeight: '700', color: colors.text }}>
                ${cur.cpc}
              </T>
              <T variant="caption" muted style={{ marginTop: 2 }}>To Client Landing Page</T>
            </View>

            <View style={[styles.adCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 16 }]}>
              <T variant="label" muted>TOTAL LINK CLICKS</T>
              <T variant="h2" style={{ marginTop: 4, fontWeight: '700', color: '#10B981' }}>
                {cur.linkClicks.toLocaleString()}
              </T>
              <T variant="caption" muted style={{ marginTop: 2 }}>Direct client traffic</T>
            </View>
          </View>
        </Card>

        {/* =========================================================================
            PLATFORM REACH BREAKDOWN (INSTAGRAM, YOUTUBE, X)
            ========================================================================= */}
        <SectionTitle title="Performance by Distribution Channel" />
        <Row style={{ alignItems: 'stretch' }}>
          {/* Instagram Reels Card */}
          <Card style={styles.channelCard}>
            <View style={styles.channelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.platformIconCircle, { backgroundColor: '#FDE8E8' }]}>
                  <Icon name="camera" size={16} color="#E1306C" />
                </View>
                <View>
                  <T variant="h3">Instagram Reels</T>
                  <T variant="caption" muted>Client Channel</T>
                </View>
              </View>
              <Badge label="Primary" tone="info" />
            </View>

            <View style={{ gap: 8, marginTop: spacing.md }}>
              <View style={styles.metricLine}>
                <T variant="small" muted>Total Views</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>214.5K</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Profile Visits</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>4,820</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Shares & Saves</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.primary }}>12.4K</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Avg Watch Time</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>14.8s (92%)</Text>
              </View>
            </View>
          </Card>

          {/* YouTube Shorts Card */}
          <Card style={styles.channelCard}>
            <View style={styles.channelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.platformIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="play" size={16} color="#FF0000" />
                </View>
                <View>
                  <T variant="h3">YouTube Shorts</T>
                  <T variant="caption" muted>Client Channel</T>
                </View>
              </View>
              <Badge label="High Growth" tone="success" />
            </View>

            <View style={{ gap: 8, marginTop: spacing.md }}>
              <View style={styles.metricLine}>
                <T variant="small" muted>Total Views</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>126.8K</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Subscribers Gained</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#10B981' }}>+840</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>CTR (Click-Through)</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>11.8%</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Avg Completion</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>82.1%</Text>
              </View>
            </View>
          </Card>

          {/* X / Twitter Card */}
          <Card style={styles.channelCard}>
            <View style={styles.channelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.platformIconCircle, { backgroundColor: '#E0E7FF' }]}>
                  <Icon name="send" size={16} color="#1D9BF0" />
                </View>
                <View>
                  <T variant="h3">X / Twitter</T>
                  <T variant="caption" muted>Client Handle</T>
                </View>
              </View>
              <Badge label="Traffic" tone="neutral" />
            </View>

            <View style={{ gap: 8, marginTop: spacing.md }}>
              <View style={styles.metricLine}>
                <T variant="small" muted>Video Plays</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>45.1K</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Reposts & Quotes</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>1,680</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Site Link Clicks</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#10B981' }}>2,940</Text>
              </View>
              <View style={styles.metricLine}>
                <T variant="small" muted>Total Impressions</T>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>92.4K</Text>
              </View>
            </View>
          </Card>
        </Row>

        {/* =========================================================================
            TOP PERFORMING CLIENT REELS LEADERBOARD
            ========================================================================= */}
        <SectionTitle title="Top Performing Client Videos" />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={[styles.tableHeader, { backgroundColor: '#F8FAFC', borderBottomColor: colors.border }]}>
            <Text style={[styles.colHeader, { flex: 2 }]}>REEL TITLE</Text>
            <Text style={[styles.colHeader, { flex: 1 }]}>CHANNEL</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>VIEWS</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>REACH</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>RETENTION</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>SHARES / SAVES</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>AD ROAS</Text>
          </View>

          {TOP_CLIENT_REELS.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                { borderBottomColor: colors.border },
                idx % 2 === 1 && { backgroundColor: '#FAFAFA' },
              ]}
            >
              <View style={{ flex: 2, gap: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>
                  {item.title}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Badge
                    label={item.type}
                    tone={item.type.includes('Ad') ? 'warning' : 'success'}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.textMuted }}>
                  {item.platform}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text }}>
                  {item.views}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.textMuted }}>
                  {item.reach}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: '#10B981' }}>
                  {item.completion}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.primary }}>
                  {item.shares} / {item.saves}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: font.bold, fontSize: 12, color: item.roas !== '—' ? '#10B981' : colors.textFaint }}>
                  {item.roas}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  rangePillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  rangeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 24,
    height: 120,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  adMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  adCell: {
    flex: 1,
    minWidth: 140,
  },
  channelCard: {
    flex: 1,
    minWidth: 240,
    padding: spacing.lg,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  colHeader: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
