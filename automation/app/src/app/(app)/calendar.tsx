import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Page } from '../../components/Page';
import { Card, T, Badge, Button, Skeleton } from '../../components/ui';
import { font, radius, spacing, useTheme } from '../../theme';
import { editor, PublishItem } from '../../api/editor';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { errorText } from '../../api/client';

const PLATFORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  instagram: { bg: '#FDE8E8', text: '#E1306C', label: 'IG Reels' },
  youtube: { bg: '#FEE2E2', text: '#FF0000', label: 'YT Shorts' },
  twitter: { bg: '#E0E7FF', text: '#1D9BF0', label: 'X / Twitter' },
  x: { bg: '#E0E7FF', text: '#0F1419', label: 'X / Twitter' },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SAMPLE_POSTS: Partial<PublishItem>[] = [
  {
    id: 'sample-1',
    title: 'Zero to One Engineer - Hook Beat',
    caption: 'How 10x engineers actually approach system architecture before writing a line of code. #coding #tech',
    platforms: ['instagram'],
    scheduled_at: new Date(2026, 10, 24, 18, 0).getTime(),
    status: 'SCHEDULED',
  },
  {
    id: 'sample-2',
    title: 'AILO Motion Launch Cut',
    caption: 'Smooth keyframed motion without leaving your browser. Watch the breakdown.',
    platforms: ['youtube', 'instagram'],
    scheduled_at: new Date(2026, 10, 26, 9, 30).getTime(),
    status: 'SCHEDULED',
  },
  {
    id: 'sample-3',
    title: 'Claude Motion Reel Highlights',
    caption: 'AI-assisted video editing is here. Here is what we built this week.',
    platforms: ['twitter'],
    scheduled_at: new Date(2026, 10, 28, 15, 0).getTime(),
    status: 'SCHEDULED',
  },
  {
    id: 'sample-4',
    title: 'Rockcastle Studio Motion Systems',
    caption: 'Full-bleed typography and audio reactive cuts.',
    platforms: ['instagram'],
    scheduled_at: new Date(2026, 10, 20, 11, 0).getTime(),
    status: 'PUBLISHED',
  },
];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { list: storyboards } = useStoryboards();

  // Navigation date state (Default to Nov 2026, current context year)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 23));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 10, 24));
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Backend queue state
  const [queue, setQueue] = useState<PublishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<PublishItem | null>(null);

  // Modal schedule state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSbId, setSelectedSbId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCaption, setCustomCaption] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('18:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const q = await editor.queue();
      setQueue(q || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Combine real queue items with sample placeholders if queue is empty
  const allEvents = useMemo(() => {
    if (queue.length > 0) return queue;
    return SAMPLE_POSTS as PublishItem[];
  }, [queue]);

  // Filter events by platform
  const filteredEvents = useMemo(() => {
    if (platformFilter === 'all') return allEvents;
    return allEvents.filter((item) =>
      item.platforms?.some((p) => p.toLowerCase().includes(platformFilter))
    );
  }, [allEvents, platformFilter]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToday = () => {
    const today = new Date(2026, 10, 23);
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Helper: map date to events
  const getEventsForDay = (d: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return filteredEvents.filter((ev) => {
      const ts = ev.scheduled_at || ev.created_at;
      if (!ts) return false;
      const evDate = new Date(ts);
      const evDateStr = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}-${String(evDate.getDate()).padStart(2, '0')}`;
      return evDateStr === targetDateStr;
    });
  };

  // Grid cells (total 35 or 42)
  const calendarCells = useMemo(() => {
    const cells: { day: number; currentMonth: boolean; dateObj: Date }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      cells.push({ day: d, currentMonth: false, dateObj: new Date(year, month - 1, d) });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, currentMonth: true, dateObj: new Date(year, month, i) });
    }

    // Trailing days from next month to fill complete grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, currentMonth: false, dateObj: new Date(year, month + 1, i) });
    }

    return cells;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

  const handleOpenSchedule = (date?: Date) => {
    if (date) setSelectedDate(date);
    if (storyboards && storyboards.length > 0) {
      const first = storyboards[0];
      setSelectedSbId(first.id);
      setCustomTitle(first.storyboard?.title || first.prompt?.slice(0, 50) || 'Reel Release');
      setCustomCaption(first.posts?.instagram?.caption || 'New reel created with AILO Editor! #ai #growth');
    }
    setScheduleModalOpen(true);
  };

  const handleConfirmSchedule = async () => {
    if (!customTitle.trim()) {
      toast('Please enter a title for the reel');
      return;
    }
    setIsSubmitting(true);
    try {
      const scheduleDay = selectedDate || new Date(2026, 10, 24);
      const [hours, mins] = selectedTimeSlot.split(':').map(Number);
      const scheduleTime = new Date(scheduleDay.getFullYear(), scheduleDay.getMonth(), scheduleDay.getDate(), hours, mins);

      await editor.schedule({
        title: customTitle.trim(),
        caption: customCaption.trim() || customTitle.trim(),
        slot: 'custom',
        platforms: selectedPlatforms,
        target_platforms: selectedPlatforms,
        scheduled_at: scheduleTime.toISOString(),
        storyboard_id: selectedSbId || undefined,
      });

      toast(`Scheduled for ${scheduleDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedTimeSlot}!`);
      setScheduleModalOpen(false);
      await loadQueue();
    } catch (e) {
      toast(`Failed to schedule: ${errorText(e)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page
      title="Content Calendar"
      subtitle="Organize, schedule, and automate your short-form distribution pipeline"
      contentGap={0}
      actions={
        <Button
          label="Schedule Reel"
          variant="primary"
          icon="plus"
          onPress={() => handleOpenSchedule(selectedDate || new Date(2026, 10, 24))}
        />
      }
    >
      <View style={{ gap: spacing.md }}>
        {/* =========================================================================
            CALENDAR CONTROLS & PLATFORM FILTERS
            ========================================================================= */}
        <Card style={calStyles.controlCard}>
          <View style={calStyles.controlRow}>
            {/* Month & Jump Controls */}
            <View style={calStyles.monthNavGroup}>
              <Pressable
                onPress={prevMonth}
                style={({ pressed, hovered }: any) => [
                  calStyles.arrowBtn,
                  hovered && { backgroundColor: colors.surfaceAlt },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Icon name="chevron-left" size={18} color={colors.text} />
              </Pressable>

              <Text style={[calStyles.monthHeading, { color: colors.text, fontFamily: font.bold }]}>
                {monthLabel}
              </Text>

              <Pressable
                onPress={nextMonth}
                style={({ pressed, hovered }: any) => [
                  calStyles.arrowBtn,
                  hovered && { backgroundColor: colors.surfaceAlt },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Icon name="chevron-right" size={18} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={jumpToday}
                style={({ pressed, hovered }: any) => [
                  calStyles.todayBtn,
                  hovered && { backgroundColor: colors.surfaceAlt },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.textMuted }}>
                  Today
                </Text>
              </Pressable>
            </View>

            {/* Platform Filter Chips */}
            <View style={calStyles.filterGroup}>
              {[
                { id: 'all', label: 'All Channels' },
                { id: 'instagram', label: 'Instagram' },
                { id: 'youtube', label: 'YouTube' },
                { id: 'twitter', label: 'X / Twitter' },
              ].map((f) => {
                const active = platformFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setPlatformFilter(f.id)}
                    style={[
                      calStyles.filterChip,
                      active
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: active ? font.semibold : font.regular,
                        fontSize: 12,
                        color: active ? '#FFFFFF' : colors.textMuted,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}

              {/* View Mode Toggle */}
              <View style={[calStyles.viewModeToggle, { borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setViewMode('month')}
                  style={[
                    calStyles.viewModeBtn,
                    viewMode === 'month' && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <Icon name="grid" size={14} color={viewMode === 'month' ? colors.primary : colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('list')}
                  style={[
                    calStyles.viewModeBtn,
                    viewMode === 'list' && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <Icon name="sliders" size={14} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        </Card>

        {/* =========================================================================
            CALENDAR MONTH GRID VIEW
            ========================================================================= */}
        {viewMode === 'month' ? (
          <Card style={[calStyles.calendarGridCard, { borderColor: colors.border }]}>
            {/* Days of Week Header */}
            <View style={calStyles.dayNamesRow}>
              {DAYS_OF_WEEK.map((day, idx) => (
                <View key={day} style={calStyles.dayNameCell}>
                  <Text
                    style={{
                      fontFamily: font.semibold,
                      fontSize: 11,
                      color: idx === 0 || idx === 6 ? colors.textFaint : colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Cells */}
            <View style={calStyles.cellsGrid}>
              {calendarCells.map((cell, idx) => {
                const dayEvents = getEventsForDay(cell.day, cell.currentMonth);
                const isToday =
                  cell.currentMonth &&
                  cell.day === 23 &&
                  month === 10 &&
                  year === 2026;
                const isSelected =
                  selectedDate &&
                  cell.currentMonth &&
                  selectedDate.getDate() === cell.day &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getFullYear() === year;

                return (
                  <Pressable
                    key={`${cell.day}-${idx}`}
                    onPress={() => {
                      if (cell.currentMonth) {
                        setSelectedDate(new Date(year, month, cell.day));
                      }
                    }}
                    style={({ hovered }: any) => [
                      calStyles.cell,
                      { borderColor: colors.border },
                      !cell.currentMonth && { backgroundColor: '#F8FAFC' },
                      cell.currentMonth && hovered && { backgroundColor: 'rgba(255, 90, 31, 0.04)' },
                      isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                    ]}
                  >
                    {/* Date Number Header */}
                    <View style={calStyles.cellTop}>
                      <View
                        style={[
                          calStyles.dateBadge,
                          isToday && { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text
                          style={{
                            fontFamily: isToday ? font.bold : font.medium,
                            fontSize: 12,
                            color: isToday
                              ? '#FFFFFF'
                              : cell.currentMonth
                              ? colors.text
                              : colors.textFaint,
                          }}
                        >
                          {cell.day}
                        </Text>
                      </View>

                      {cell.currentMonth && (
                        <Pressable
                          onPress={() => handleOpenSchedule(cell.dateObj)}
                          style={({ hovered }: any) => [
                            calStyles.addEventHoverBtn,
                            hovered && { opacity: 1 },
                          ]}
                        >
                          <Icon name="plus" size={12} color={colors.textFaint} />
                        </Pressable>
                      )}
                    </View>

                    {/* Events List for Day */}
                    <View style={calStyles.eventsList}>
                      {dayEvents.map((ev, evIdx) => {
                        const plat = ev.platforms?.[0] || 'instagram';
                        const platMeta = PLATFORM_COLORS[plat] || PLATFORM_COLORS.instagram;
                        const isPub = ev.status === 'PUBLISHED';

                        return (
                          <Pressable
                            key={ev.id || evIdx}
                            onPress={() => setActiveItem(ev as PublishItem)}
                            style={({ pressed, hovered }: any) => [
                              calStyles.eventCard,
                              {
                                backgroundColor: isPub ? '#F0FDF4' : platMeta.bg,
                                borderLeftColor: isPub ? colors.success : platMeta.text,
                              },
                              hovered && { transform: [{ scale: 1.02 }] },
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <View style={calStyles.eventRow}>
                              <Text
                                style={{
                                  fontFamily: font.bold,
                                  fontSize: 10,
                                  color: isPub ? colors.success : platMeta.text,
                                }}
                              >
                                {isPub ? 'PUBLISHED' : platMeta.label}
                              </Text>
                              {ev.scheduled_at ? (
                                <Text
                                  style={{
                                    fontFamily: font.mono,
                                    fontSize: 9,
                                    color: colors.textMuted,
                                  }}
                                >
                                  {new Date(ev.scheduled_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })}
                                </Text>
                              ) : null}
                            </View>
                            <Text
                              numberOfLines={1}
                              style={{
                                fontFamily: font.medium,
                                fontSize: 11,
                                color: colors.text,
                                marginTop: 1,
                              }}
                            >
                              {ev.title || 'Untitled Reel'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : (
          /* =========================================================================
              CHRONOLOGICAL LIST VIEW OF UPCOMING REELS
              ========================================================================= */
          <Card style={{ padding: spacing.lg, gap: spacing.md }}>
            <T variant="h3">Scheduled & Published Reels Timeline</T>
            {filteredEvents.map((ev) => {
              const plat = ev.platforms?.[0] || 'instagram';
              const platMeta = PLATFORM_COLORS[plat] || PLATFORM_COLORS.instagram;
              const dateStr = ev.scheduled_at
                ? new Date(ev.scheduled_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Date not set';

              return (
                <View
                  key={ev.id}
                  style={[
                    calStyles.listRow,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                >
                  <View style={{ gap: 4, flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Badge
                        label={ev.status || 'SCHEDULED'}
                        tone={ev.status === 'PUBLISHED' ? 'success' : 'neutral'}
                      />
                      <Text style={{ fontFamily: font.semibold, fontSize: 11, color: platMeta.text }}>
                        {platMeta.label}
                      </Text>
                      <Text style={{ fontFamily: font.mono, fontSize: 11, color: colors.textMuted }}>
                        {dateStr}
                      </Text>
                    </View>
                    <T variant="body" style={{ fontWeight: '600', color: colors.text }}>
                      {ev.title}
                    </T>
                    {ev.caption ? (
                      <T variant="small" muted numberOfLines={2}>
                        {ev.caption}
                      </T>
                    ) : null}
                  </View>

                  <Button
                    label="View Details"
                    small
                    variant="secondary"
                    onPress={() => setActiveItem(ev as PublishItem)}
                  />
                </View>
              );
            })}
          </Card>
        )}
      </View>

      {/* =========================================================================
          SCHEDULE REEL MODAL / DIALOG
          ========================================================================= */}
      <Modal
        visible={scheduleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleModalOpen(false)}
      >
        <View style={calStyles.modalBackdrop}>
          <Card style={calStyles.modalCard}>
            <View style={calStyles.modalHeader}>
              <View style={{ gap: 2 }}>
                <T variant="h3">Schedule Reel Release</T>
                <T variant="small" muted>
                  {selectedDate
                    ? `Scheduling for ${selectedDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : 'Select date and time'}
                </T>
              </View>
              <Pressable
                onPress={() => setScheduleModalOpen(false)}
                style={calStyles.closeBtn}
              >
                <Icon name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {/* Storyboard Selector */}
              {storyboards && storyboards.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <T variant="label">Select Generated Storyboard</T>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {storyboards.slice(0, 5).map((sb: any) => {
                      const active = selectedSbId === sb.id;
                      return (
                        <Pressable
                          key={sb.id}
                          onPress={() => {
                            setSelectedSbId(sb.id);
                            setCustomTitle(sb.storyboard?.title || sb.prompt?.slice(0, 50) || 'Reel');
                            setCustomCaption(sb.posts?.instagram?.caption || sb.storyboard?.title || '');
                          }}
                          style={[
                            calStyles.sbChip,
                            active
                              ? { borderColor: colors.primary, backgroundColor: 'rgba(255, 90, 31, 0.08)' }
                              : { borderColor: colors.border },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: active ? font.semibold : font.regular,
                              fontSize: 12,
                              color: active ? colors.primary : colors.text,
                            }}
                          >
                            {sb.storyboard?.title || sb.prompt?.slice(0, 30) || 'Storyboard'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {/* Title Input */}
              <View style={{ gap: 6 }}>
                <T variant="label">Reel Title</T>
                <TextInput
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="e.g. 3 Coding Mistakes You're Still Making"
                  placeholderTextColor={colors.textFaint}
                  style={[
                    calStyles.inputField,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
                  ]}
                />
              </View>

              {/* Caption Input */}
              <View style={{ gap: 6 }}>
                <T variant="label">Caption & Hashtags</T>
                <TextInput
                  value={customCaption}
                  onChangeText={setCustomCaption}
                  multiline
                  numberOfLines={3}
                  placeholder="Add your hook caption, description, and hashtags..."
                  placeholderTextColor={colors.textFaint}
                  style={[
                    calStyles.inputField,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.surface,
                      height: 70,
                      textAlignVertical: 'top',
                    },
                  ]}
                />
              </View>

              {/* Time Slots */}
              <View style={{ gap: 6 }}>
                <T variant="label">Optimal Posting Time</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['09:00', '12:30', '15:00', '18:00', '20:30'].map((slot) => {
                    const sel = selectedTimeSlot === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setSelectedTimeSlot(slot)}
                        style={[
                          calStyles.timeSlotPill,
                          sel
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { borderColor: colors.border, backgroundColor: colors.surface },
                        ]}
                      >
                        <Text
                          style={{
                            fontFamily: sel ? font.bold : font.medium,
                            fontSize: 12,
                            color: sel ? '#FFFFFF' : colors.text,
                          }}
                        >
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Platform Targets */}
              <View style={{ gap: 6 }}>
                <T variant="label">Target Distribution Channels</T>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { id: 'instagram', label: 'Instagram Reels' },
                    { id: 'youtube', label: 'YouTube Shorts' },
                    { id: 'twitter', label: 'X / Twitter' },
                  ].map((p) => {
                    const checked = selectedPlatforms.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          if (checked) {
                            if (selectedPlatforms.length > 1) {
                              setSelectedPlatforms(selectedPlatforms.filter((x) => x !== p.id));
                            }
                          } else {
                            setSelectedPlatforms([...selectedPlatforms, p.id]);
                          }
                        }}
                        style={[
                          calStyles.channelSelectPill,
                          checked
                            ? { borderColor: colors.primary, backgroundColor: 'rgba(255, 90, 31, 0.08)' }
                            : { borderColor: colors.border },
                        ]}
                      >
                        <Icon
                          name={checked ? 'check' : 'plus'}
                          size={14}
                          color={checked ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={{
                            fontFamily: checked ? font.semibold : font.regular,
                            fontSize: 12,
                            color: checked ? colors.primary : colors.text,
                          }}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setScheduleModalOpen(false)}
                />
                <Button
                  label={isSubmitting ? 'Scheduling...' : 'Add to Calendar'}
                  variant="primary"
                  icon="calendar"
                  loading={isSubmitting}
                  onPress={handleConfirmSchedule}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      {/* =========================================================================
          VIEW EVENT DETAIL MODAL
          ========================================================================= */}
      <Modal
        visible={!!activeItem}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveItem(null)}
      >
        <View style={calStyles.modalBackdrop}>
          <Card style={calStyles.modalCard}>
            {activeItem && (
              <View style={{ gap: spacing.md }}>
                <View style={calStyles.modalHeader}>
                  <View style={{ gap: 4 }}>
                    <Badge
                      label={activeItem.status || 'SCHEDULED'}
                      tone={activeItem.status === 'PUBLISHED' ? 'success' : 'neutral'}
                    />
                    <T variant="h3">{activeItem.title}</T>
                  </View>
                  <Pressable onPress={() => setActiveItem(null)} style={calStyles.closeBtn}>
                    <Icon name="x" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>

                {activeItem.scheduled_at ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="clock" size={15} color={colors.textMuted} />
                    <T variant="small" muted>
                      {new Date(activeItem.scheduled_at).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </T>
                  </View>
                ) : null}

                {activeItem.caption ? (
                  <View style={{ backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: radius.md }}>
                    <T variant="small" style={{ lineHeight: 20 }}>
                      {activeItem.caption}
                    </T>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(activeItem.platforms || ['instagram']).map((plat) => {
                    const m = PLATFORM_COLORS[plat] || PLATFORM_COLORS.instagram;
                    return (
                      <View
                        key={plat}
                        style={{
                          backgroundColor: m.bg,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: radius.pill,
                        }}
                      >
                        <Text style={{ fontFamily: font.bold, fontSize: 11, color: m.text }}>
                          {m.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.sm }}>
                  <Button
                    label="Close"
                    variant="secondary"
                    onPress={() => setActiveItem(null)}
                  />
                  <Button
                    label="Go to Publishing Queue"
                    variant="primary"
                    icon="send"
                    onPress={() => {
                      setActiveItem(null);
                      router.navigate('/publishing');
                    }}
                  />
                </View>
              </View>
            )}
          </Card>
        </View>
      </Modal>
    </Page>
  );
}

const calStyles = StyleSheet.create({
  controlCard: {
    padding: 12,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthHeading: {
    fontSize: 16,
    minWidth: 150,
    textAlign: 'center',
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#F1F5F9',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginLeft: 4,
  },
  viewModeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarGridCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dayNamesRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayNameCell: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285%',
    minHeight: 86,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  cellTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEventHoverBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  eventsList: {
    marginTop: 4,
    gap: 4,
  },
  eventCard: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    borderLeftWidth: 3,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sbChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  timeSlotPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  channelSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
