import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Platform,   // <-- added this import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchReportStart, fetchDutyReportSuccess, fetchReportFailure } from '../../../store/slices/reportSlice';
import { fetchOfficersStart, fetchOfficersSuccess } from '../../../store/slices/officerSlice';
import { getDutyReport } from '../../../api/reportApi';
import { getOfficers } from '../../../api/officerApi';
import ReportFilterBar from '../../../components/admin/ReportFilterBar';
import StatusBadge from '../../../components/common/StatusBadge';
import EmptyState from '../../../components/common/EmptyState';
import { colors } from '../../../theme/colors';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import { exportDutyReportPDF } from '../../../utils/exportPdf';
import { exportDutyReportExcel } from '../../../utils/exportExcel';

const SummaryCard = ({ label, value, color }) => (
  <View style={[styles.summaryCard, { borderTopColor: color }]}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const DutyReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { dutyReport, dutyReportSummary, isLoading } = useSelector(state => state.reports);
  const officers = useSelector(state => state.officers.list);

  // console.log('Duty Report', JSON.stringify(dutyReport, null, 2));
  // console.log('Duty Report Summary', JSON.stringify(dutyReportSummary, null, 2));

  const [filters, setFilters] = useState({
    status: null,
    officerId: route.params?.officerId || null,
    dateFrom: null,
    dateTo: null,
  });
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    dispatch(fetchOfficersStart());
    getOfficers()
      .then(res => dispatch(fetchOfficersSuccess(res.data)))
      .catch(() => { });
  }, []);

  // Update officer filter when navigated from SubordinateReport
  useEffect(() => {
    if (route.params?.officerId !== undefined) {
      setFilters(prev => ({ ...prev, officerId: route.params.officerId ?? null }));
    }
  }, [route.params?.officerId]);

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
        dispatch(
          fetchDutyReportSuccess({
            duties: res.data.duties || [],
            summary: res.data.summary || null,
          })
        );
      } catch (e) {
        dispatch(fetchReportFailure(e?.message));
      }
    };
    load();
  }, [filters]);

  const handleExportPDF = () => {
    setShowExportMenu(false);
    if (!dutyReport || dutyReport.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }
    exportDutyReportPDF(dutyReport, filters);
  };

  const handleExportExcel = () => {
    setShowExportMenu(false);
    if (!dutyReport || dutyReport.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }
    exportDutyReportExcel(dutyReport, filters);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.activeTab]}>Duty Report</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SubordinateReport')}>
            <Text style={styles.tab}>Subordinate Report</Text>
          </TouchableOpacity>
        </View>



        {/* Export Button with Dropdown */}
        <View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => setShowExportMenu(true)}>
            <Text style={styles.exportText}>⬇ Export</Text>
          </TouchableOpacity>

          <Modal
            transparent={true}
            visible={showExportMenu}
            animationType="fade"
            onRequestClose={() => setShowExportMenu(false)}>
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowExportMenu(false)}>
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleExportPDF}>
                  <Text style={styles.dropdownItemIcon}>📄</Text>
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemTitle}>Export as PDF</Text>
                    <Text style={styles.dropdownItemSub}>Download as PDF document</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleExportExcel}>
                  <Text style={styles.dropdownItemIcon}>📊</Text>
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemTitle}>Export as Excel</Text>
                    <Text style={styles.dropdownItemSub}>Download as Excel spreadsheet</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        </View>
      </View>

      <View style={styles.vipButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.vipBtn}
          onPress={() =>
            navigation.navigate('DailyReport', {
              duties: dutyReport,
            })
          }>
          <Text style={styles.vipBtnText}>Higher Authority Data</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {dutyReportSummary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryRow}
          contentContainerStyle={styles.summaryContent}>
          <SummaryCard label="Total" value={dutyReportSummary.total} color={colors.primary} />
          <SummaryCard label="Completed" value={dutyReportSummary.completed} color={colors.success} />
          <SummaryCard label="Upcoming" value={dutyReportSummary.upcoming} color={colors.warning} />
          <SummaryCard label="Cancelled" value={dutyReportSummary.cancelled} color={colors.error} />
        </ScrollView>
      )}

      {filters.officerId &&
        (() => {
          const officer = officers.find(
            o =>
              o.id?.toString() === filters.officerId?.toString() ||
              o._id?.toString() === filters.officerId?.toString()
          );
          return (
            <View style={styles.officerBanner}>
              <View style={styles.officerBannerAvatar}>
                <Text style={styles.officerBannerAvatarText}>
                  {officer?.name?.charAt(0) || '?'}
                </Text>
              </View>
              <Text style={styles.officerBannerName} numberOfLines={1}>
                {officer?.name ? officer.name.toUpperCase() : 'Selected Officer'}
              </Text>
              <TouchableOpacity
                style={styles.showAllBtn}
                onPress={() => setFilters(prev => ({ ...prev, officerId: null }))}>
                <Text style={styles.showAllBtnText}>✕ Show All</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

      <ReportFilterBar
        filters={filters}
        officers={officers}
        onChange={f => setFilters(prev => ({ ...prev, ...f }))}
      />

      {/* Scrollable Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
        <View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {[
              '#',
              'Subordinate',
              'Date',
              'Arr/Dep',
              'Flight No',
              'Flight Time',
              'From',
              'To',
              'Airport',
              'Terminal',
              'Office Type',
              'Status',
            ].map(h => (
              <Text key={h} style={[styles.headerCell, colStyle(h)]}>
                {h}
              </Text>
            ))}
          </View>


          <FlatList
            data={dutyReport}
            keyExtractor={(_, i) => i.toString()}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.cell, colStyle('#')]}>{item.srNo || index + 1}</Text>
                <Text
                  style={[styles.cell, colStyle('Subordinate'), { textTransform: 'uppercase' }]}
                  numberOfLines={1}>
                  {item.officerName || '—'}
                </Text>
                <Text style={[styles.cell, colStyle('Date')]}>
                  {formatDate(item.date, 'DD/MM/YY')}
                </Text>
                <Text style={[styles.cell, colStyle('Arr/Dep')]}>
                  {item.arrivalDeparture || '—'}
                </Text>
                <Text style={[styles.cell, colStyle('Flight No')]}>
                  {item.flightNo || '—'}
                </Text>
                <Text style={[styles.cell, colStyle('Flight Time')]}>
                  {formatTime(item.flightTime)}
                </Text>
                <Text style={[styles.cell, colStyle('From')]}>{item.from || '—'}</Text>
                <Text style={[styles.cell, colStyle('To')]}>{item.to || '—'}</Text>
                <Text style={[styles.cell, colStyle('Airport')]} numberOfLines={1}>
                  {item.airportName || '—'}
                </Text>
                <Text style={[styles.cell, colStyle('Terminal')]} numberOfLines={1}>
                  {item.terminalName || '—'}
                </Text>
                <Text style={[styles.cell, colStyle('Office Type')]}>
                  {(item.officeType || '').replace('_', ' ')}
                </Text>
                <View style={colStyle('Status')}>
                  <StatusBadge status={item.status} small />
                </View>
              </View>
            )}

            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="📊"
                  title="No duties found"
                  subtitle="Adjust filters to see results"
                />
              </View>
            }

            refreshing={isLoading}
            onRefresh={() => setFilters({ ...filters })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const COL_WIDTHS = {
  '#': 36,
  'Subordinate': 110,
  'Date': 72,
  'Arr/Dep': 68,
  'Flight No': 72,
  'Flight Time': 76,
  'From': 70,
  'To': 70,
  'Airport': 110,
  'Terminal': 90,
  'Office Type': 90,
  'Status': 84,
};
const colStyle = h => ({ width: COL_WIDTHS[h] || 80 });

const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tabs: { flexDirection: 'row', gap: 20 },

  tab: { fontSize: 15, color: colors.textSecondary, paddingBottom: 4 },

  activeTab: {
    color: colors.primary,
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  title: { fontSize: 20, fontWeight: '700', color: colors.text },

  exportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },

  exportText: { color: colors.white, fontWeight: '600', fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownMenu: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
  },
  dropdownItemIcon: { fontSize: 24, marginRight: 14 },

  dropdownItemContent: { flex: 1 },

  dropdownItemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },

  dropdownItemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  dropdownDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 8 },

  summaryRow: {
    flexGrow: 0,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  summaryContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },

  summaryCard: {
    width: 90,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
  },

  summaryValue: { fontSize: 18, fontWeight: '700' },

  summaryLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  tableScroll: { flex: 1 },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableHeader: { backgroundColor: colors.primary },

  tableRowAlt: { backgroundColor: '#F9FAFB' },

  headerCell: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 4,
  },

  cell: { fontSize: 11, color: colors.text, paddingHorizontal: 4 },

  emptyWrap: { width: 320, alignSelf: 'center' },

  officerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
    gap: 10,
  },

  officerBannerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  officerBannerAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  officerBannerName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.primary },

  showAllBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  showAllBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  vipButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  vipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',      // Whitish background
    borderWidth: 1,
    borderColor: "#F7FAFC", // Transparent border 
    // borderLeftWidth: 5,
    // borderLeftColor: '#1E3A5F',      // Navy Blue
    // borderRadius: 14,
    paddingVertical: 10,
    // paddingHorizontal: 16,
    elevation: 2,

  },

  vipIcon: {
    fontSize: 22,
  },

  vipBtnText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A5F',
  },

  vipArrow: {
    fontSize: 24,
    color: '#8A99A8',
    fontWeight: '600',
  },

});

export default DutyReportScreen;


