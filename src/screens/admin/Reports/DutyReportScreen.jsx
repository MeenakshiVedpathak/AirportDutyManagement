import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {fetchReportStart, fetchDutyReportSuccess, fetchReportFailure} from '../../../store/slices/reportSlice';
import {fetchOfficersStart, fetchOfficersSuccess} from '../../../store/slices/officerSlice';
import {getDutyReport} from '../../../api/reportApi';
import {getOfficers} from '../../../api/officerApi';
import {fetchAirportsStart, fetchAirportsSuccess} from '../../../store/slices/airportSlice';
import {getAirports} from '../../../api/airportApi';
import ReportFilterBar from '../../../components/admin/ReportFilterBar';
import StatusBadge from '../../../components/common/StatusBadge';
import EmptyState from '../../../components/common/EmptyState';
import {colors} from '../../../theme/colors';
import {formatDate, formatTime} from '../../../utils/dateUtils';
import {isIncentiveEligible} from '../../../utils/incentiveUtils';
import {exportDutyReportPDF} from '../../../utils/exportPdf';

const SummaryCard = ({label, value, color}) => (
  <View style={[styles.summaryCard, {borderTopColor: color}]}>
    <Text style={[styles.summaryValue, {color}]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const DutyReportScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {dutyReport, dutyReportSummary, isLoading} = useSelector(state => state.reports);
  const airports = useSelector(state => state.airports.list);
  const officers = useSelector(state => state.officers.list);

  const [filters, setFilters] = useState({
    status: null, airportId: null, officerId: null, dateFrom: null, dateTo: null,
  });

  useEffect(() => {
    dispatch(fetchAirportsStart());
    getAirports().then(res => dispatch(fetchAirportsSuccess(res.data))).catch(() => {});
    dispatch(fetchOfficersStart());
    getOfficers().then(res => dispatch(fetchOfficersSuccess(res.data))).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      dispatch(fetchReportStart());
      try {
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.airportId) params.airportId = filters.airportId;
        if (filters.officerId) params.officerId = filters.officerId;
        if (filters.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters.dateTo) params.dateTo = filters.dateTo;
        const res = await getDutyReport(params);
        dispatch(fetchDutyReportSuccess({
          duties: res.data.duties || [],
          summary: res.data.summary || null,
        }));
      } catch (e) {
        dispatch(fetchReportFailure(e?.message));
      }
    };
    load();
  }, [filters]);

  const handleExport = () => exportDutyReportPDF(dutyReport, filters);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.activeTab]}>Duty Report</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SubordinateReport')}>
            <Text style={styles.tab}>Subordinate Report</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportText}>⬇ Export PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {dutyReportSummary && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryRow} contentContainerStyle={styles.summaryContent}>
          <SummaryCard label="Total" value={dutyReportSummary.total} color={colors.primary} />
          <SummaryCard label="Completed" value={dutyReportSummary.completed} color={colors.success} />
          <SummaryCard label="Upcoming" value={dutyReportSummary.upcoming} color={colors.warning} />
          <SummaryCard label="Cancelled" value={dutyReportSummary.cancelled} color={colors.error} />
          <SummaryCard label="Incentive" value={`₹${dutyReportSummary.totalIncentive}`} color="#7C3AED" />
        </ScrollView>
      )}

      <ReportFilterBar
        filters={filters}
        airports={airports}
        officers={officers}
        onChange={f => setFilters(prev => ({...prev, ...f}))}
      />

      {/* Scrollable Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
        <View>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {['#', 'Subordinate', 'Date', 'Arr/Dep', 'Flight No', 'Flight Time', 'From', 'To', 'Airport', 'Terminal', 'Office Type', 'Status', 'Incentive'].map(h => (
              <Text key={h} style={[styles.headerCell, colStyle(h)]}>{h}</Text>
            ))}
          </View>

          <FlatList
            data={dutyReport}
            keyExtractor={(_, i) => i.toString()}
            scrollEnabled={false}
            renderItem={({item, index}) => (
              <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.cell, colStyle('#')]}>{item.srNo || index + 1}</Text>
                <Text style={[styles.cell, colStyle('Subordinate')]} numberOfLines={1}>{item.officerName || '—'}</Text>
                <Text style={[styles.cell, colStyle('Date')]}>{formatDate(item.date, 'DD/MM/YY')}</Text>
                <Text style={[styles.cell, colStyle('Arr/Dep')]}>{item.arrivalDeparture || '—'}</Text>
                <Text style={[styles.cell, colStyle('Flight No')]}>{item.flightNo || '—'}</Text>
                <Text style={[styles.cell, colStyle('Flight Time')]}>{formatTime(item.flightTime)}</Text>
                <Text style={[styles.cell, colStyle('From')]}>{item.from || '—'}</Text>
                <Text style={[styles.cell, colStyle('To')]}>{item.to || '—'}</Text>
                <Text style={[styles.cell, colStyle('Airport')]} numberOfLines={1}>{item.airportName || '—'}</Text>
                <Text style={[styles.cell, colStyle('Terminal')]} numberOfLines={1}>{item.terminalName || '—'}</Text>
                <Text style={[styles.cell, colStyle('Office Type')]}>{(item.officeType || '').replace('_', ' ')}</Text>
                <View style={colStyle('Status')}><StatusBadge status={item.status} small /></View>
                <Text style={[styles.cell, colStyle('Incentive'), isIncentiveEligible(item.officeType) && styles.incentiveText]}>
                  {isIncentiveEligible(item.officeType) ? '₹500' : '—'}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState icon="📊" title="No duties found" subtitle="Adjust filters to see results" />
              </View>
            }
            refreshing={isLoading}
            onRefresh={() => setFilters({...filters})}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const COL_WIDTHS = {
  '#': 36, 'Subordinate': 110, 'Date': 72, 'Arr/Dep': 68,
  'Flight No': 72, 'Flight Time': 76, 'From': 70, 'To': 70,
  'Airport': 110, 'Terminal': 90, 'Office Type': 90, 'Status': 84, 'Incentive': 68,
};
const colStyle = h => ({width: COL_WIDTHS[h] || 80});

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  tabs: {flexDirection: 'row', gap: 20},
  tab: {fontSize: 15, color: colors.textSecondary, paddingBottom: 4},
  activeTab: {color: colors.primary, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: colors.primary},
  title: {fontSize: 20, fontWeight: '700', color: colors.text},
  exportBtn: {backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8},
  exportText: {color: colors.white, fontWeight: '600', fontSize: 13},
  summaryRow: {flexGrow: 0, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  summaryContent: {paddingHorizontal: 12, paddingVertical: 10, gap: 8},
  summaryCard: {width: 90, backgroundColor: colors.background, borderRadius: 8, padding: 10, alignItems: 'center', borderTopWidth: 3},
  summaryValue: {fontSize: 18, fontWeight: '700'},
  summaryLabel: {fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center'},
  tableScroll: {flex: 1},
  tableRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border},
  tableHeader: {backgroundColor: colors.primary},
  tableRowAlt: {backgroundColor: '#F9FAFB'},
  headerCell: {fontSize: 10, fontWeight: '700', color: colors.white, paddingHorizontal: 4},
  cell: {fontSize: 11, color: colors.text, paddingHorizontal: 4},
  incentiveText: {color: '#7C3AED', fontWeight: '700'},
  emptyWrap: {width: 320, alignSelf: 'center'},
});

export default DutyReportScreen;
