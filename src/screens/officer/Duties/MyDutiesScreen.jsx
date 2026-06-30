import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useDuties} from '../../../hooks/useDuties';
import DutyCard from '../../../components/common/DutyCard';
import EmptyState from '../../../components/common/EmptyState';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import {formatDate, formatTime} from '../../../utils/dateUtils';

const TABS = ['AVAILABLE', 'MINE', 'ALL'];

const OfficerDutiesScreen = () => {
  const navigation = useNavigation();
  const {user} = useSelector(state => state.auth);
  const {list: duties, fetchDuties, loadMore, claimDuty, releaseDuty, isLoading, pagination} = useDuties();
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  const [actionId, setActionId] = useState(null);

  const load = useCallback(() => {
    fetchDuties({});
  }, []);

  useFocusEffect(load);

  const myId = user?.id || user?._id;

  const filtered = duties.filter(d => {
    if (activeTab === 'MINE') return d.officerId === myId || d.officerId?.toString() === myId;
    if (activeTab === 'AVAILABLE') return !d.officerId;
    return true;
  });

  const handleClaim = async (duty) => {
    Alert.alert(
      'Claim Duty',
      `Take this duty?\nFlight ${duty.flightNo} on ${formatDate(duty.date)} at ${formatTime(duty.flightTime)}`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Claim It',
          onPress: async () => {
            setActionId(duty.id);
            await claimDuty(duty.id);
            fetchDuties({});
            setActionId(null);
          },
        },
      ],
    );
  };

  const handleRelease = async (duty) => {
    Alert.alert(
      'Release Duty',
      'Are you sure you want to release this duty? It will become available for others.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setActionId(duty.id);
            await releaseDuty(duty.id);
            fetchDuties({});
            setActionId(null);
          },
        },
      ],
    );
  };

  const isMine = (d) => d.officerId && (d.officerId === myId || d.officerId?.toString() === myId);

  const renderItem = ({item}) => {
    const mine = isMine(item);
    const claimed = !!item.officerId && !mine;
    const loading = actionId === item.id;

    return (
      <View style={styles.cardWrap}>
        <TouchableOpacity
          style={[styles.card, claimed && styles.cardClaimed]}
          onPress={() => navigation.navigate('DutyDetail', {dutyId: item.id})}
          activeOpacity={0.8}>

          {/* Header row */}
          <View style={styles.cardTopRow}>
            <View style={styles.flex}>
              <Text style={styles.srno}>SR #{item.srNo || item.id}</Text>
              <Text style={styles.flightNo}>{item.flightNo || '—'}</Text>
              <Text style={styles.route}>{item.from || '?'}  →  {item.to || '?'}</Text>
            </View>
            <View style={styles.rightCol}>
              <View style={[styles.adBadge, item.arrivalDeparture === 'ARRIVAL' ? styles.arrBadge : styles.depBadge]}>
                <Text style={styles.adText}>{item.arrivalDeparture === 'ARRIVAL' ? '✈ ARR' : '✈ DEP'}</Text>
              </View>
              {mine && (
                <View style={styles.mineBadge}>
                  <Text style={styles.mineText}>Mine</Text>
                </View>
              )}
              {claimed && (
                <View style={styles.takenBadge}>
                  <Text style={styles.takenText}>Taken</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <MetaItem label="Date" value={formatDate(item.date)} />
            <MetaItem label="Flight Time" value={formatTime(item.flightTime)} />
            <MetaItem label="Reporting" value={formatTime(item.reportingTime)} />
          </View>
          <View style={styles.metaRow}>
            <MetaItem label="Airport" value={item.airportName} />
            <MetaItem label="Terminal" value={item.terminalName} />
            <MetaItem label="Holiday/Office" value={item.officeType?.replace(/_/g, ' ')} />
          </View>

          {claimed && item.officerName ? (
            <View style={styles.claimedBy}>
              <Text style={styles.claimedByText}>👮 Taken by {item.officerName}</Text>
            </View>
          ) : null}

          {mine && item.officerConfirmed && (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedBadgeText}>✓ You confirmed this duty</Text>
            </View>
          )}

        </TouchableOpacity>

        {/* Action buttons below the card */}
        {!claimed && (
          <View style={styles.actionRow}>
            {mine ? (
              <TouchableOpacity
                style={[styles.releaseBtn, loading && styles.btnDisabled]}
                onPress={() => handleRelease(item)}
                disabled={loading}>
                {loading
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.releaseBtnText}>✕  Release Duty</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.claimBtn, loading && styles.btnDisabled]}
                onPress={() => handleClaim(item)}
                disabled={loading}>
                {loading
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.claimBtnText}>＋  Claim This Duty</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const tabLabel = t => t === 'MINE' ? 'Mine' : t === 'AVAILABLE' ? 'Available' : 'All Duties';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Duties</Text>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tabLabel(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={isLoading && pagination.page === 1}
        onRefresh={() => fetchDuties({})}
        onEndReached={() => activeTab === 'ALL' && loadMore({})}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading && pagination.page > 1
          ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title={activeTab === 'MINE' ? 'You have no duties' : activeTab === 'AVAILABLE' ? 'No available duties' : 'No duties found'}
          />
        }
      />
    </SafeAreaView>
  );
};

const MetaItem = ({label, value}) => (
  <View style={styles.metaItem}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 20, fontWeight: '700', color: colors.text},
  tabBar: {backgroundColor: colors.white, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border},
  tab: {paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginRight: 8, marginTop: 8, borderWidth: 1, borderColor: colors.border},
  tabActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  tabText: {fontSize: 13, color: colors.textSecondary},
  tabTextActive: {color: colors.white, fontWeight: '600'},
  list: {padding: 12, paddingBottom: 24},
  footer: {paddingVertical: 16},

  cardWrap: {marginBottom: 14},
  card: {backgroundColor: colors.white, borderRadius: 12, padding: 14, ...shadows.sm},
  cardClaimed: {opacity: 0.75},
  cardTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4},
  flex: {flex: 1, marginRight: 8},
  srno: {fontSize: 11, color: colors.textSecondary, marginBottom: 2},
  flightNo: {fontSize: 18, fontWeight: '800', color: colors.text},
  route: {fontSize: 13, color: colors.text, marginTop: 2},
  rightCol: {alignItems: 'flex-end', gap: 4},
  adBadge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4},
  arrBadge: {backgroundColor: '#FEF3C7'},
  depBadge: {backgroundColor: '#DBEAFE'},
  adText: {fontSize: 11, fontWeight: '800', color: colors.text},
  mineBadge: {backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  mineText: {fontSize: 11, fontWeight: '700', color: '#16A34A'},
  takenBadge: {backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  takenText: {fontSize: 11, fontWeight: '700', color: '#DC2626'},
  divider: {height: 1, backgroundColor: colors.border, marginVertical: 10},
  metaRow: {flexDirection: 'row', marginBottom: 6},
  metaItem: {flex: 1},
  metaLabel: {fontSize: 11, color: colors.textSecondary},
  metaValue: {fontSize: 13, fontWeight: '500', color: colors.text, marginTop: 1},
  claimedBy: {marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 6, padding: 6},
  claimedByText: {fontSize: 12, color: '#DC2626', fontWeight: '500'},
  confirmedBadge: {marginTop: 8, backgroundColor: '#F0FDF4', borderRadius: 6, padding: 6},
  confirmedBadgeText: {fontSize: 12, color: '#16A34A', fontWeight: '600'},
  actionRow: {marginTop: 4},
  claimBtn: {backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center', ...shadows.sm},
  claimBtnText: {color: colors.white, fontSize: 14, fontWeight: '700'},
  releaseBtn: {backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 11, alignItems: 'center'},
  releaseBtnText: {color: colors.white, fontSize: 14, fontWeight: '700'},
  btnDisabled: {opacity: 0.6},
});

export default OfficerDutiesScreen;
