import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useDuties} from '../../../hooks/useDuties';
import {fetchOfficersStart, fetchOfficersSuccess, fetchOfficersFailure} from '../../../store/slices/officerSlice';
import {getOfficers} from '../../../api/officerApi';
import DutyCard from '../../../components/common/DutyCard';
import EmptyState from '../../../components/common/EmptyState';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import {DUTY_STATUS} from '../../../constants/dutyStatus';

const getInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const StatCard = ({label, value, color, icon, onPress, active}) => (
  <TouchableOpacity style={[styles.statCard, {borderTopColor: color}, active && {borderWidth: 2, borderColor: color}]} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, {color}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {user} = useSelector(state => state.auth);
  const officers = useSelector(state => state.officers.list);
  const {list: duties, fetchDuties, isLoading} = useDuties();

  const [statusFilter, setStatusFilter] = useState(null);

  const upcoming = duties.filter(d => d.status === DUTY_STATUS.UPCOMING).length;
  const completed = duties.filter(d => d.status === DUTY_STATUS.COMPLETED).length;
  const cancelled = duties.filter(d => d.status === DUTY_STATUS.CANCELLED).length;

  const handleStatPress = status => {
    setStatusFilter(prev => prev === status ? null : status);
  };

  const sortedDuties = [...duties].sort((a, b) => {
    if (b.date !== a.date) return b.date > a.date ? 1 : -1;
    return (b.flightTime || '') > (a.flightTime || '') ? 1 : -1;
  });

  const filteredDuties = statusFilter
    ? sortedDuties.filter(d => d.status === statusFilter)
    : sortedDuties;

  useEffect(() => {
    fetchDuties();
    dispatch(fetchOfficersStart());
    getOfficers()
      .then(res => dispatch(fetchOfficersSuccess(res.data)))
      .catch(e => dispatch(fetchOfficersFailure(e?.message)));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{user?.name || 'Admin'} 👋</Text>
            <View style={styles.metaRow}>
              {user?.employeeId && (
                <Text style={styles.empId}>ID: {user.employeeId}</Text>
              )}
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Administrator</Text>
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Upcoming" value={upcoming} color={colors.warning} icon="⏳"
            onPress={() => handleStatPress(DUTY_STATUS.UPCOMING)} active={statusFilter === DUTY_STATUS.UPCOMING} />
          <StatCard label="Completed" value={completed} color={colors.success} icon="✅"
            onPress={() => handleStatPress(DUTY_STATUS.COMPLETED)} active={statusFilter === DUTY_STATUS.COMPLETED} />
          <StatCard label="Cancelled" value={cancelled} color={colors.error} icon="❌"
            onPress={() => handleStatPress(DUTY_STATUS.CANCELLED)} active={statusFilter === DUTY_STATUS.CANCELLED} />
          <StatCard label="Subordinates" value={officers.length} color={colors.primary} icon="👮" />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Duties', {screen: 'CreateDuty'})}>
            <Text style={styles.quickIcon}>➕</Text>
            <Text style={styles.quickLabel}>Create Duty</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Officers')}>
            <Text style={styles.quickIcon}>👮</Text>
            <Text style={styles.quickLabel}>Subordinates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Airports')}>
            <Text style={styles.quickIcon}>🛫</Text>
            <Text style={styles.quickLabel}>Airports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.quickIcon}>📊</Text>
            <Text style={styles.quickLabel}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* All Duties */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {statusFilter ? `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Duties` : 'All Duties'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Duties', {screen: 'AllDuties'})}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {statusFilter && (
          <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setStatusFilter(null)}>
            <Text style={styles.clearFilterText}>✕ Clear Filter</Text>
          </TouchableOpacity>
        )}

        {filteredDuties.length === 0
          ? <EmptyState icon="📋" title="No duties yet" subtitle="Create the first duty to get started" />
          : filteredDuties.map(d => (
              <DutyCard key={d.id} duty={d}
                onPress={() => navigation.navigate('Duties', {screen: 'DutyDetail', params: {dutyId: d.id}})} />
            ))
        }

        <View style={{height: 20}} />
      </ScrollView>
    </SafeAreaView>
  );
};

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
  statsRow: {flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 20, paddingTop: 8, gap: 8, backgroundColor: colors.primary},
  statCard: {flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 10, alignItems: 'center', borderTopWidth: 3, ...shadows.sm},
  statIcon: {fontSize: 16, marginBottom: 2},
  statValue: {fontSize: 20, fontWeight: '700'},
  statLabel: {fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center'},
  quickRow: {flexDirection: 'row', padding: 16, gap: 10},
  quickBtn: {flex: 1, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 14, alignItems: 'center', ...shadows.sm},
  quickIcon: {fontSize: 22, marginBottom: 4},
  quickLabel: {fontSize: 10, fontWeight: '600', color: colors.textSecondary, textAlign: 'center'},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12},
  sectionTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  seeAll: {fontSize: 13, color: colors.primary, fontWeight: '500'},
  clearFilterBtn: {alignSelf: 'flex-start', marginLeft: 16, marginBottom: 8, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '40'},
  clearFilterText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
});

export default AdminDashboardScreen;
