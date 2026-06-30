import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import moment from 'moment';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useDuties} from '../../../hooks/useDuties';
import {useNotifications} from '../../../hooks/useNotifications';
import {checkAndNotifyNewDuties} from '../../../utils/notificationHandler';
import DutyCard from '../../../components/common/DutyCard';
import EmptyState from '../../../components/common/EmptyState';
import WhatsAppMessageModal from '../../../components/common/WhatsAppMessageModal';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import {DUTY_STATUS} from '../../../constants/dutyStatus';

const getInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const OfficerDashboardScreen = () => {
  const navigation = useNavigation();
  const {user} = useSelector(state => state.auth);
  const {list: duties, fetchDuties, isLoading} = useDuties();
  useNotifications();

  const [statusFilter, setStatusFilter] = useState(null);
  const [msgDuty, setMsgDuty] = useState(null);

  const today = moment().format('YYYY-MM-DD');
  const upcoming = duties.filter(d => d.status === DUTY_STATUS.UPCOMING).length;
  const completed = duties.filter(d => d.status === DUTY_STATUS.COMPLETED).length;
  const cancelled = duties.filter(d => d.status === DUTY_STATUS.CANCELLED).length;

  const handleStatPress = status => {
    setStatusFilter(prev => prev === status ? null : status);
  };

  const sortedDuties = [...duties].sort((a, b) => {
    const aDate = a.date || '';
    const bDate = b.date || '';
    const aFuture = aDate >= today;
    const bFuture = bDate >= today;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    if (aDate !== bDate) return aFuture ? (aDate < bDate ? -1 : 1) : (aDate > bDate ? -1 : 1);
    const aTime = a.flightTime || '';
    const bTime = b.flightTime || '';
    return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
  });

  const filteredDuties = statusFilter
    ? sortedDuties.filter(d => d.status === statusFilter)
    : sortedDuties;

  useEffect(() => {
    fetchDuties({mine: 'true'});
  }, []);

  useEffect(() => {
    if (duties.length > 0) {
      checkAndNotifyNewDuties(duties);
    }
  }, [duties]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'Subordinate'} ✈️</Text>
          <View style={styles.metaRow}>
            {user?.employeeId && (
              <Text style={styles.empId}>ID: {user.employeeId}</Text>
            )}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Subordinate</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.avatarBox}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          <View style={styles.avatarHint}>
            <Text style={styles.avatarHintText}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Upcoming" value={upcoming} color={colors.warning} icon="⏳"
          onPress={() => handleStatPress(DUTY_STATUS.UPCOMING)} active={statusFilter === DUTY_STATUS.UPCOMING} />
        <StatCard label="Completed" value={completed} color={colors.success} icon="✅"
          onPress={() => handleStatPress(DUTY_STATUS.COMPLETED)} active={statusFilter === DUTY_STATUS.COMPLETED} />
        <StatCard label="Cancelled" value={cancelled} color={colors.error} icon="❌"
          onPress={() => handleStatPress(DUTY_STATUS.CANCELLED)} active={statusFilter === DUTY_STATUS.CANCELLED} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {statusFilter ? `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Duties` : 'My Duties'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyDuties')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {statusFilter && (
          <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setStatusFilter(null)}>
            <Text style={styles.clearFilterText}>✕ Clear Filter</Text>
          </TouchableOpacity>
        )}
        {filteredDuties.length === 0
          ? <EmptyState icon="✈️" title="No duties assigned" subtitle="Available duties are in the Duties tab" />
          : filteredDuties.map(d => (
              <DutyCard key={d.id} duty={d}
                onPress={() => navigation.navigate('MyDuties', {screen: 'DutyDetail', params: {dutyId: d.id}}, {initial: false})}
                onMessage={setMsgDuty} />
            ))
        }
      </ScrollView>

      <WhatsAppMessageModal
        visible={!!msgDuty}
        duty={msgDuty}
        senderName={user?.name}
        senderPhone={user?.phone}
        onClose={() => setMsgDuty(null)}
      />
    </SafeAreaView>
  );
};

const StatCard = ({label, value, color, icon, onPress, active}) => (
  <TouchableOpacity style={[styles.statCard, {borderTopColor: color}, active && {borderWidth: 2, borderColor: color}]} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, {color}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  topBar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 16, backgroundColor: colors.primary},
  greetingBlock: {flex: 1, marginRight: 12},
  greeting: {fontSize: 13, color: 'rgba(255,255,255,0.7)'},
  name: {fontSize: 18, fontWeight: '700', color: colors.white, marginTop: 2},
  metaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8},
  empId: {fontSize: 11, color: 'rgba(255,255,255,0.65)'},
  roleBadge: {backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10},
  roleText: {fontSize: 11, color: colors.white, fontWeight: '600'},
  avatarBox: {width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)'},
  avatarText: {color: colors.white, fontSize: 17, fontWeight: '700', letterSpacing: 0.5},
  avatarHint: {position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.white, borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center'},
  avatarHintText: {fontSize: 9},
  statsRow: {flexDirection: 'row', padding: 12, gap: 8, backgroundColor: colors.primary, paddingBottom: 20},
  statCard: {flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 10, alignItems: 'center', borderTopWidth: 3, ...shadows.sm},
  statIcon: {fontSize: 16, marginBottom: 2},
  statValue: {fontSize: 20, fontWeight: '700'},
  statLabel: {fontSize: 10, color: colors.textSecondary, marginTop: 2},
  scroll: {padding: 16},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  sectionTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  seeAll: {fontSize: 13, color: colors.primary, fontWeight: '500'},
  clearFilterBtn: {alignSelf: 'flex-start', marginBottom: 8, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '40'},
  clearFilterText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
});

export default OfficerDashboardScreen;
