import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { get } from '../../api/client';
import { spacing, radius, useTheme, MAX_CONTENT_WIDTH } from '../../theme';

export default function EditingMemoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [memoryData, setMemoryData] = useState<any>(null);

  useEffect(() => {
    async function loadMemory() {
      try {
        const res = await get('/api/editor/editing-memory');
        if (res?.ok) {
          setMemoryData(res);
        }
      } catch (err) {
        console.warn('Editing memory fallback:', err);
      }
    }
    loadMemory();
  }, []);

  const records = memoryData?.records ?? [];
  const recommendations = memoryData?.recommendations ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 4, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}>
        <T variant="h1" style={{ fontSize: 22, fontWeight: '700' }}>Editing Memory & Learning</T>
        <T variant="small" muted>Evidence-Grounded Editorial Recommendations from Real Historical Publishing Metrics</T>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Memory Intelligence Recommendations */}
        <SectionTitle title="Account-Specific Editorial Recommendations" />
        <View style={{ gap: spacing.md }}>
          {recommendations.map((rec: any, idx: number) => (
            <Card key={idx} style={[styles.recCard, { borderColor: colors.primary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name="sparkles" size={18} color={colors.primary} />
                  <T variant="h3">{rec.title}</T>
                </View>
                <Badge label={`CONFIDENCE ${Math.round(rec.confidence * 100)}%`} tone="success" />
              </View>

              <T variant="body" style={{ marginTop: spacing.sm, lineHeight: 22 }}>
                {rec.evidence}
              </T>

              <View style={styles.actionBox}>
                <T variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>DIRECTOR ACTION</T>
                <T variant="body" style={{ marginTop: 2 }}>{rec.action}</T>
              </View>

              <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  label="Apply Rule to New Edit"
                  variant="primary"
                  icon="sparkles"
                  small
                  onPress={() => router.push(`/new?prompt=${encodeURIComponent(rec.action)}`)}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Historical Catalog Table */}
        <View style={styles.section}>
          <SectionTitle title={`Published Content Memory (${records.length} Catalog Records)`} />
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={[styles.tableHeader, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <T variant="caption" style={{ flex: 2, fontWeight: '700' }}>TITLE / MEDIA</T>
              <T variant="caption" style={{ flex: 1, fontWeight: '700' }}>HOOK TYPE</T>
              <T variant="caption" style={{ flex: 1, fontWeight: '700' }}>COMPLETION</T>
              <T variant="caption" style={{ flex: 1, fontWeight: '700' }}>DM SENDS / 1K</T>
              <T variant="caption" style={{ width: 90, fontWeight: '700' }}>REACH</T>
              <T variant="caption" style={{ width: 170, fontWeight: '700', textAlign: 'right' }}>ACTION</T>
            </View>

            {records.map((r: any) => (
              <View key={r.record_id} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 2 }}>
                  <T variant="body" style={{ fontWeight: '600' }}>{r.title}</T>
                  <T variant="mono" muted style={{ fontSize: 11 }}>{r.duration_seconds}s · {r.style_id}</T>
                </View>
                <View style={{ flex: 1 }}>
                  <Pill label={r.hook_type} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="body" style={{ fontWeight: '700' }}>{Math.round(r.completion_rate * 100)}%</T>
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="body" color={colors.success} style={{ fontWeight: '700' }}>{r.sends_per_1k_reach}</T>
                </View>
                <View style={{ width: 90 }}>
                  <T variant="mono">{r.reach.toLocaleString()}</T>
                </View>
                <View style={{ width: 170, alignItems: 'flex-end' }}>
                  <Button
                    label="Remix with this Style"
                    variant="secondary"
                    icon="sparkles"
                    small
                    onPress={() => router.push(`/new?style=${encodeURIComponent(r.style_id)}`)}
                  />
                </View>
              </View>
            ))}
          </Card>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.xl,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  recCard: {
    padding: spacing.lg,
    borderWidth: 1,
  },
  actionBox: {
    backgroundColor: '#090A0C',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#252930',
  },
  section: {
    gap: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
});
