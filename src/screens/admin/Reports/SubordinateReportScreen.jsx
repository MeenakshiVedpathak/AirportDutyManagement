import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import {fetchReportStart, fetchSubordinateReportSuccess, fetchReportFailure} from '../../../store/slices/reportSlice';
import {getSubordinateReport} from '../../../api/reportApi';
import EmptyState from '../../../components/common/EmptyState';
import {colors} from '../../../theme/colors';
import {exportSubordinateReportPDF} from '../../../utils/exportPdf';

const StatBox = ({label, value, color}) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, {color}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SubordinateReportScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {subordinateReport, isLoading} = useSelector(state => state.reports);

  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    const load = async () => {
      dispatch(fetchReportStart());
      try {
        const params = {};
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const res = await getSubordinateReport(params);
        dispatch(fetchSubordinateReportSuccess(res.data));
      } catch (e) {
        dispatch(fetchReportFailure(e?.message));
      }
    };
    load();
  }, [dateFrom, dateTo]);

  const summaryLabel = (() => {
    if (dateFrom && dateTo) {
      const from = moment(dateFrom);
      const to = moment(dateTo);
      if (from.month() === to.month() && from.year() === to.year()) {
        return from.format('MMMM, YYYY');
      }
      return `${from.format('MMM')} – ${to.format('MMM, YYYY')}`;
    }
    if (dateFrom) return moment(dateFrom).format('MMMM, YYYY');
    if (dateTo) return moment(dateTo).format('MMMM, YYYY');
    return moment().format('MMMM, YYYY');
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => navigation.navigate('DutyReport')}>
            <Text style={styles.tab}>Duty Report</Text>
          </TouchableOpacity>
          <Text style={[styles.tab, styles.activeTab]}>Subordinate Report</Text>
        </View>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => exportSubordinateReportPDF(subordinateReport, {dateFrom, dateTo})}>
          <Text style={styles.exportText}>⬇ Export PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Date Range</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFrom(true)}>
            <Text style={styles.dateBtnText}>
              {dateFrom ? moment(dateFrom).format('DD MMM YYYY') : 'From Date'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateSep}>—</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTo(true)}>
            <Text style={styles.dateBtnText}>
              {dateTo ? moment(dateTo).format('DD MMM YYYY') : 'To Date'}
            </Text>
          </TouchableOpacity>
          {(dateFrom || dateTo) && (
            <TouchableOpacity
              style={styles.clearDate}
              onPress={() => { setDateFrom(null); setDateTo(null); }}>
              <Text style={styles.clearDateText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {showFrom && (
          <DateTimePicker
            value={dateFrom ? new Date(dateFrom) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowFrom(false); if (d) setDateFrom(moment(d).format('YYYY-MM-DD')); }}
          />
        )}
        {showTo && (
          <DateTimePicker
            value={dateTo ? new Date(dateTo) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowTo(false); if (d) setDateTo(moment(d).format('YYYY-MM-DD')); }}
          />
        )}
      </View>

      <FlatList
        data={subordinateReport}
        keyExtractor={item => item.officer?.id?.toString()}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.officer?.name?.charAt(0)}</Text>
              </View>
              <View style={styles.officerInfo}>
                <Text style={styles.name}>{item.officer?.name}</Text>
                <Text style={styles.empId}>{item.officer?.employeeId}</Text>
              </View>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeNum}>{item.totalDuties || 0}</Text>
                <Text style={styles.totalBadgeLabel}>Total</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatBox label="Upcoming" value={item.upcoming || 0} color={colors.warning} />
              <StatBox label="Completed" value={item.completed || 0} color={colors.success} />
              <StatBox label="Cancelled" value={item.cancelled || 0} color={colors.error} />
            </View>

            <View style={styles.summarySection}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Duty Summary</Text>
                <Text style={styles.summaryMonth}>{summaryLabel}</Text>
              </View>
              <View style={[styles.statsRow, {marginTop: 8}]}>
                <StatBox label="Duty Done" value={item.completed || 0} color={colors.success} />
                <StatBox label="Office Time" value={item.officeTimeDuty || 0} color={colors.primary} />
                <StatBox label="Holiday / Before / After" value={item.holidayBeforeAfterDuty || 0} color="#7C3AED" />
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={() => { setDateFrom(null); setDateTo(null); }}
        ListEmptyComponent={<EmptyState icon="👮" title="No subordinate data" subtitle="No officers found for selected period" />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  tabs: {flexDirection: 'row', gap: 20},
  tab: {fontSize: 15, color: colors.textSecondary, paddingBottom: 4},
  activeTab: {color: colors.primary, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: colors.primary},
  exportBtn: {backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8},
  exportText: {color: colors.white, fontWeight: '600', fontSize: 13},
  filterBar: {backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border},
  filterLabel: {fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  dateBtn: {flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.background},
  dateBtnText: {fontSize: 13, color: colors.text, textAlign: 'center'},
  dateSep: {fontSize: 14, color: colors.textSecondary},
  clearDate: {paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 8},
  clearDateText: {fontSize: 11, color: colors.error, fontWeight: '600'},
  list: {padding: 12},
  card: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1},
  avatarRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  avatar: {width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12},
  avatarText: {color: colors.white, fontSize: 17, fontWeight: '700'},
  officerInfo: {flex: 1},
  name: {fontSize: 15, fontWeight: '600', color: colors.text},
  empId: {fontSize: 12, color: colors.textSecondary},
  totalBadge: {alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6},
  totalBadgeNum: {fontSize: 18, fontWeight: '700', color: colors.primary},
  totalBadgeLabel: {fontSize: 9, color: colors.textSecondary},
  statsRow: {flexDirection: 'row', gap: 8},
  statBox: {flex: 1, backgroundColor: colors.background, borderRadius: 8, padding: 10, alignItems: 'center'},
  statValue: {fontSize: 16, fontWeight: '700'},
  statLabel: {fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center'},
  summarySection: {marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10},
  summaryHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2},
  summaryTitle: {fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4},
  summaryMonth: {fontSize: 12, color: colors.textSecondary, fontWeight: '500'},
});

export default SubordinateReportScreen;
