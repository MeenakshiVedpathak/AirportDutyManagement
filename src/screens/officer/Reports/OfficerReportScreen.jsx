import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import {fetchReportStart, fetchDutyReportSuccess, fetchReportFailure} from '../../../store/slices/reportSlice';
import {getDutyReport} from '../../../api/reportApi';
import StatusBadge from '../../../components/common/StatusBadge';
import EmptyState from '../../../components/common/EmptyState';
import {colors} from '../../../theme/colors';
import {formatDate, formatTime} from '../../../utils/dateUtils';
import {exportDutyReportPDF} from '../../../utils/exportPdf';
import {DUTY_STATUS} from '../../../constants/dutyStatus';

const SummaryCard = ({label, value, color}) => (
  <View style={[styles.summaryCard, {borderTopColor: color}]}>
    <Text style={[styles.summaryValue, {color}]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const FilterChip = ({label, active, onPress}) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const OfficerReportScreen = () => {
  const dispatch = useDispatch();
  const {dutyReport, dutyReportSummary, isLoading} = useSelector(state => state.reports);
  const {user} = useSelector(state => state.auth);

  const officerId = user?._id || user?.id;

  const [filters, setFilters] = useState({status: null, dateFrom: null, dateTo: null});
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    const load = async () => {
      dispatch(fetchReportStart());
      try {
        const params = {officerId};
        if (filters.status) params.status = filters.status;
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

  const handleExport = () => exportDutyReportPDF(dutyReport, {...filters, officerId});

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Duty Report</Text>
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
        </ScrollView>
      )}

      {/* Filters */}
      <View style={styles.filterBar}>
        {/* Date Range */}
        <Text style={styles.filterLabel}>Date Range</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFrom(true)}>
            <Text style={styles.dateBtnText}>
              {filters.dateFrom ? moment(filters.dateFrom).format('DD MMM YYYY') : 'From Date'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateSep}>—</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTo(true)}>
            <Text style={styles.dateBtnText}>
              {filters.dateTo ? moment(filters.dateTo).format('DD MMM YYYY') : 'To Date'}
            </Text>
          </TouchableOpacity>
          {(filters.dateFrom || filters.dateTo) && (
            <TouchableOpacity
              style={styles.clearDate}
              onPress={() => setFilters(prev => ({...prev, dateFrom: null, dateTo: null}))}>
              <Text style={styles.clearDateText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {showFrom && (
          <DateTimePicker
            value={filters.dateFrom ? new Date(filters.dateFrom) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowFrom(false);
              if (d) setFilters(prev => ({...prev, dateFrom: moment(d).format('YYYY-MM-DD')}));
            }}
          />
        )}
        {showTo && (
          <DateTimePicker
            value={filters.dateTo ? new Date(filters.dateTo) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowTo(false);
              if (d) setFilters(prev => ({...prev, dateTo: moment(d).format('YYYY-MM-DD')}));
            }}
          />
        )}

        {/* Status */}
        <Text style={[styles.filterLabel, {marginTop: 10}]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="All" active={!filters.status} onPress={() => setFilters(prev => ({...prev, status: null}))} />
          {Object.values(DUTY_STATUS).map(s => (
            <FilterChip
              key={s}
              label={s}
              active={filters.status === s}
              onPress={() => setFilters(prev => ({...prev, status: s}))}
            />
          ))}
        </ScrollView>
      </View>

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
        <View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {['#', 'Date', 'Arr/Dep', 'Flight No', 'Flight Time', 'From', 'To', 'Airport', 'Terminal', 'Office Type', 'Status'].map(h => (
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
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState icon="📊" title="No duties found" subtitle="Adjust filters to see results" />
              </View>
            }
            refreshing={isLoading}
            onRefresh={() => setFilters({status: null, dateFrom: null, dateTo: null})}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const COL_WIDTHS = {
  '#': 36, 'Date': 72, 'Arr/Dep': 68,
  'Flight No': 72, 'Flight Time': 76, 'From': 70, 'To': 70,
  'Airport': 110, 'Terminal': 90, 'Office Type': 90, 'Status': 84,
};
const colStyle = h => ({width: COL_WIDTHS[h] || 80});

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  exportBtn: {backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8},
  exportText: {color: colors.white, fontWeight: '600', fontSize: 13},
  summaryRow: {flexGrow: 0, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  summaryContent: {paddingHorizontal: 12, paddingVertical: 10, gap: 8},
  summaryCard: {width: 90, backgroundColor: colors.background, borderRadius: 8, padding: 10, alignItems: 'center', borderTopWidth: 3},
  summaryValue: {fontSize: 18, fontWeight: '700'},
  summaryLabel: {fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center'},
  filterBar: {backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border},
  filterLabel: {fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  dateBtn: {flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.background},
  dateBtnText: {fontSize: 13, color: colors.text, textAlign: 'center'},
  dateSep: {fontSize: 14, color: colors.textSecondary},
  clearDate: {paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 8},
  clearDateText: {fontSize: 11, color: colors.error, fontWeight: '600'},
  chip: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.white},
  chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: 12, color: colors.textSecondary},
  chipTextActive: {color: colors.white, fontWeight: '600'},
  tableScroll: {flex: 1},
  tableRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border},
  tableHeader: {backgroundColor: colors.primary},
  tableRowAlt: {backgroundColor: '#F9FAFB'},
  headerCell: {fontSize: 10, fontWeight: '700', color: colors.white, paddingHorizontal: 4},
  cell: {fontSize: 11, color: colors.text, paddingHorizontal: 4},
  emptyWrap: {width: 320, alignSelf: 'center'},
});

export default OfficerReportScreen;
