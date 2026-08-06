import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import moment from 'moment';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import EmptyState from '../../../components/common/EmptyState';

// VIP detection keywords
const VIP_KEYWORDS = [
  'Chairman', 'Member', 'Secretary', 'Minister', 'CBDT',
  'Board', 'Commissioner', 'Director', 'Joint', 'Additional',
  'Principal', "Hon'ble", 'ADG', 'PCCIT', 'CCIT', 'CAT',
  'Chief', 'President', 'Vice', 'Executive', 'Manager',
];

const DailyReportScreen = () => {
  const route = useRoute();
  const { duties = [], loading = false } = route.params || {};

  const [showVIPOnly, setShowVIPOnly] = useState(true);

  // Sort by reportingTime
  const sortedDuties = [...duties].sort((a, b) =>
    a.reportingTime.localeCompare(b.reportingTime)
  );

  // VIP check
  const isVIP = (item) => {
    const designation = (item.travellerDesignation || '').toUpperCase();
    const name = (item.travellerName || '').toUpperCase();
    return VIP_KEYWORDS.some(k =>
      designation.includes(k.toUpperCase()) ||
      name.includes(k.toUpperCase())
    );
  };

  const displayDuties = showVIPOnly
    ? sortedDuties.filter(isVIP)
    : sortedDuties;

  const vipCount = sortedDuties.filter(isVIP).length;
  const totalCount = sortedDuties.length;

  const formatTime = time => {
    if (!time) return '';
    const parts = time.split(':');
    return `${parts[0]}.${parts[1]}`;
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.dutyItem}>
      {index === 0 && (
        <Text style={styles.dateHeader}>
          {moment().format('DD.MM.YYYY')}
        </Text>
      )}
      <View style={styles.dutyRow}>
        <Text style={styles.time}>{formatTime(item.reportingTime)}</Text>
        <Text style={styles.arrivalDep}>
          {item.arrivalDeparture || ''}
          {item.terminalName ? ` ${item.terminalName.replace('TERMINAL‐', 'T-')}` : ''}
        </Text>
      </View>
      <Text style={styles.travellerName}>
        {item.travellerName?.trim() || '—'}
        {item.travellerDesignation ? `\n${item.travellerDesignation}` : ''}
      </Text>
      <View style={styles.flightRow}>
        <Text style={styles.flightText}>
          {item.airline ? `${item.airline}-${item.flightNo}` : item.flightNo || '—'}
        </Text>
        {item.travellerPhone && (
          <Text style={styles.contact}>Mob-{item.travellerPhone}</Text>
        )}
      </View>
      <Text style={styles.onDuty}>
        On duty - {item.officerName || 'Not assigned'}
      </Text>
      <View style={styles.divider} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Intimation Report</Text>
        <View style={styles.headerRight}>
          <Text style={styles.dateLabel}>{moment().format('DD MMM YYYY')}</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, showVIPOnly && styles.toggleActive]}
            onPress={() => setShowVIPOnly(!showVIPOnly)}
          >
            <Text style={[styles.toggleText, showVIPOnly && styles.toggleTextActive]}>
              {showVIPOnly ? `VIP (${vipCount})` : `All (${totalCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayDuties}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={showVIPOnly ? '👑' : '📅'}
            title={showVIPOnly ? 'No VIP duties today' : 'No duties for today'}
            subtitle={showVIPOnly ? 'VIP persons will appear here' : 'All duties will appear here'}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.white },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  toggleActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  toggleText: { color: colors.white, fontWeight: '600', fontSize: 12 },
  toggleTextActive: { color: '#333' },

  list: { padding: 16, paddingBottom: 40 },
  dutyItem: { backgroundColor: colors.white, borderRadius: 10, padding: 14, ...shadows.sm },
  dateHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 10,
  },
  arrivalDep: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  travellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginVertical: 2,
  },
  flightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 12,
  },
  flightText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  contact: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  onDuty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 10,
  },
});

export default DailyReportScreen;