

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  fetchReportStart,
  fetchDutyReportSuccess,
  fetchReportFailure,
} from "../../../store/slices/reportSlice";
import {
  fetchOfficersStart,
  fetchOfficersSuccess,
} from "../../../store/slices/officerSlice";
import { getDutyReport } from "../../../api/reportApi";
import { getOfficers } from "../../../api/officerApi";
import ReportFilterBar from "../../../components/admin/ReportFilterBar";
import StatusBadge from "../../../components/common/StatusBadge";
import EmptyState from "../../../components/common/EmptyState";
import { colors } from "../../../theme/colors";
import { formatDate, formatTime } from "../../../utils/dateUtils";
import { exportDutyReportPDF } from "../../../utils/exportPdf";
import { exportDutyReportExcel } from "../../../utils/exportExcel";

// ---------- Summary Card (stateless) ----------
const SummaryCard = ({ label, value, color }) => (
  <View style={[styles.summaryCard, { borderTopColor: color }]}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

// ---------- Column widths (all 24 columns) ----------
const COL_WIDTHS = {
  "#": 36,
  Subordinate: 120,
  "Traveller Name": 180,
  "Traveller Designation": 180,
  "Traveller Phone": 130,
  // "Airport Authority Phone": 150,
  Date: 90,
  "Reporting Time": 90,
  "Guest Arrival Time": 110,
  "Office Type": 110,
  "Arr/Dep": 90,
  Airline: 70,
  "Flight No": 90,
  "PNR No": 110,
  "Flight Time": 90,
  From: 80,
  To: 80,
  Airport: 180,
  Terminal: 100,
  Passengers: 90,
  "Officer Confirmed": 120,
  Status: 100,
  Incentive: 90,
  // PDF: 70,
};

// Helper to get style with fixed width
const colStyle = (key) => ({ width: COL_WIDTHS[key] || 80 });

// ---------- Main Component ----------
const DutyReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // Redux state – use optional chaining for safety
  const { dutyReport, dutyReportSummary, isLoading } = useSelector(
    (state) => state.reports ?? {},
  );
  const officers = useSelector((state) => state.officers?.list ?? []);

  // Local state
  const [filters, setFilters] = useState({
    status: null,
    officerId: route.params?.officerId ?? null,
    dateFrom: null,
    dateTo: null,
  });
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ----- Fetch officers on mount -----
  useEffect(() => {
    dispatch(fetchOfficersStart());
    getOfficers()
      .then((res) => dispatch(fetchOfficersSuccess(res.data)))
      .catch(() => {});
  }, [dispatch]);

  // Update officer filter when navigated from SubordinateReport
  useEffect(() => {
    if (route.params?.officerId !== undefined) {
      setFilters((prev) => ({
        ...prev,
        officerId: route.params.officerId ?? null,
      }));
    }
  }, [route.params?.officerId]);

  // ----- Load duty report when filters change -----
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
            duties: res.data?.duties ?? [],
            summary: res.data?.summary ?? null,
          }),
        );
      } catch (e) {
        dispatch(fetchReportFailure(e?.message));
      }
    };
    load();
  }, [filters, dispatch]);

  // ----- Memoized handlers (performance) -----
  const handleExportPDF = useCallback(() => {
    setShowExportMenu(false);
    if (!dutyReport || dutyReport.length === 0) {
      Alert.alert("No Data", "There is no data to export");
      return;
    }
    exportDutyReportPDF(dutyReport, filters);
  }, [dutyReport, filters]);

  const handleExportExcel = useCallback(() => {
    setShowExportMenu(false);
    if (!dutyReport || dutyReport.length === 0) {
      Alert.alert("No Data", "There is no data to export");
      return;
    }
    exportDutyReportExcel(dutyReport, filters);
  }, [dutyReport, filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleRefresh = useCallback(() => {
    setFilters((prev) => ({ ...prev }));
  }, []);

  const handleClearOfficer = useCallback(() => {
    setFilters((prev) => ({ ...prev, officerId: null }));
  }, []);

  // Look up officer for banner (memoized)
  const selectedOfficer = useMemo(() => {
    if (!filters.officerId) return null;
    return officers.find(
      (o) =>
        o.id?.toString() === filters.officerId?.toString() ||
        o._id?.toString() === filters.officerId?.toString(),
    );
  }, [officers, filters.officerId]);

  // ----- Render -----
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with tabs and export button */}
      <View style={styles.header}>
        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.activeTab]}>Duty Report</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("SubordinateReport")}
          >
            <Text style={styles.tab}>Subordinate Report</Text>
          </TouchableOpacity>
        </View>

        {/* Export Button with Dropdown */}
        <View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => setShowExportMenu(true)}
          >
            <Text style={styles.exportText}>⬇ Export</Text>
          </TouchableOpacity>

          <Modal
            transparent
            visible={showExportMenu}
            animationType="fade"
            onRequestClose={() => setShowExportMenu(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowExportMenu(false)}
            >
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleExportPDF}
                >
                  <Text style={styles.dropdownItemIcon}>📄</Text>
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemTitle}>Export as PDF</Text>
                    <Text style={styles.dropdownItemSub}>
                      Download as PDF document
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleExportExcel}
                >
                  <Text style={styles.dropdownItemIcon}>📊</Text>
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemTitle}>
                      Export as Excel
                    </Text>
                    <Text style={styles.dropdownItemSub}>
                      Download as Excel spreadsheet
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        </View>
      </View>

      {/* Higher Authority Data button */}
      <View style={styles.vipButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.vipBtn}
          onPress={() =>
            navigation.navigate("DailyReport", {
              duties: dutyReport,
            })
          }
        >
          <Text style={styles.vipBtnText}>Higher Authority Data</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards – use optional chaining */}
      {dutyReportSummary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryRow}
          contentContainerStyle={styles.summaryContent}
        >
          <SummaryCard
            label="Total"
            value={dutyReportSummary.total ?? 0}
            color={colors.primary}
          />
          <SummaryCard
            label="Completed"
            value={dutyReportSummary.completed ?? 0}
            color={colors.success}
          />
          <SummaryCard
            label="Upcoming"
            value={dutyReportSummary.upcoming ?? 0}
            color={colors.warning}
          />
          <SummaryCard
            label="Cancelled"
            value={dutyReportSummary.cancelled ?? 0}
            color={colors.error}
          />
        </ScrollView>
      )}

      {/* Officer banner when filtered */}
      {selectedOfficer && (
        <View style={styles.officerBanner}>
          <View style={styles.officerBannerAvatar}>
            <Text style={styles.officerBannerAvatarText}>
              {selectedOfficer.name?.charAt(0) ?? "?"}
            </Text>
          </View>
          <Text style={styles.officerBannerName} numberOfLines={1}>
            {selectedOfficer.name?.toUpperCase() ?? "Selected Officer"}
          </Text>
          <TouchableOpacity
            style={styles.showAllBtn}
            onPress={handleClearOfficer}
          >
            <Text style={styles.showAllBtnText}>✕ Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Bar */}
      <ReportFilterBar
        filters={filters}
        officers={officers}
        onChange={handleFilterChange}
      />

      {/* Scrollable Table */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.tableScroll}
      >
        <View>
          {/* Table Header – 24 columns */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {[
              "#",
              "Subordinate",
              "Traveller Name",
              "Traveller Designation",
              "Traveller Phone",
              // "Airport Authority Phone",
              "Date",
              "Reporting Time",
              "Guest Arrival Time",
              "Office Type",
              "Arr/Dep",
              "Airline",
              "Flight No",
              "PNR No",
              "Flight Time",
              "From",
              "To",
              "Airport",
              "Terminal",
              "Passengers",
              "Officer Confirmed",
              "Status",
              "Incentive",
              // "PDF",
            ].map((h) => (
              <Text key={h} style={[styles.headerCell, colStyle(h)]}>
                {h}
              </Text>
            ))}
          </View>

          {/* Table rows */}
          <FlatList
            data={dutyReport ?? []}
            keyExtractor={(item, index) =>
              item?.id?.toString() ?? index.toString()
            }
            scrollEnabled={false}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            renderItem={({ item, index }) => (
              <View
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
              >
                <Text style={[styles.cell, colStyle("#")]}>
                  {item?.srNo ?? index + 1}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    colStyle("Subordinate"),
                    { textTransform: "uppercase" },
                  ]}
                  numberOfLines={1}
                >
                  {item?.officerName ?? "—"}
                </Text>
                <Text
                  style={[styles.cell, colStyle("Traveller Name")]}
                  numberOfLines={1}
                >
                  {item?.travellerName ?? "—"}
                </Text>
                <Text
                  style={[styles.cell, colStyle("Traveller Designation")]}
                  numberOfLines={1}
                >
                  {item?.travellerDesignation ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Traveller Phone")]}>
                  {item?.travellerPhone ?? "—"}
                </Text>
                {/* <Text
                  style={[styles.cell, colStyle("Airport Authority Phone")]}
                >
                  {item?.airportAuthorityPhone ?? "—"}
                </Text> */}
                <Text style={[styles.cell, colStyle("Date")]}>
                  {formatDate(item?.date, "DD/MM/YY")}
                </Text>
                <Text style={[styles.cell, colStyle("Reporting Time")]}>
                  {formatTime(item?.reportingTime)}
                </Text>
                <Text style={[styles.cell, colStyle("Guest Arrival Time")]}>
                  {item?.guestArrivalTime
                    ? formatTime(item.guestArrivalTime)
                    : "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Office Type")]}>
                  {(item?.officeType ?? "").replace("_", " ")}
                </Text>
                <Text style={[styles.cell, colStyle("Arr/Dep")]}>
                  {item?.arrivalDeparture ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Airline")]}>
                  {item?.airline ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Flight No")]}>
                  {item?.flightNo ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("PNR No")]}>
                  {item?.pnrNo ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Flight Time")]}>
                  {formatTime(item?.flightTime)}
                </Text>
                <Text style={[styles.cell, colStyle("From")]}>
                  {item?.from ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("To")]}>
                  {item?.to ?? "—"}
                </Text>
                <Text
                  style={[styles.cell, colStyle("Airport")]}
                  numberOfLines={1}
                >
                  {item?.airportName ?? "—"}
                </Text>
                <Text
                  style={[styles.cell, colStyle("Terminal")]}
                  numberOfLines={1}
                >
                  {item?.terminalName ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Passengers")]}>
                  {item?.noOfPassengers ?? "—"}
                </Text>
                <Text style={[styles.cell, colStyle("Officer Confirmed")]}>
                  {item?.officerConfirmed ? "Yes" : "No"}
                </Text>
                <View style={colStyle("Status")}>
                  <StatusBadge status={item?.status} small />
                </View>
                <Text style={[styles.cell, colStyle("Incentive")]}>
                  {item?.incentive?.eligible
                    ? `₹${item.incentive.amount}`
                    : "No"}
                </Text>
                {/* <Text style={[styles.cell, colStyle("PDF")]}>
                  {item?.pdfAttachment?.hasFile ? "Yes" : "No"}
                </Text> */}
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
            onRefresh={handleRefresh}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------- Styles (unchanged) ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: { flexDirection: "row", gap: 20 },
  tab: { fontSize: 15, color: colors.textSecondary, paddingBottom: 4 },
  activeTab: {
    color: colors.primary,
    fontWeight: "700",
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exportText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
  },
  dropdownItemIcon: { fontSize: 24, marginRight: 14 },
  dropdownItemContent: { flex: 1 },
  dropdownItemTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  dropdownItemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
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
    alignItems: "center",
    borderTopWidth: 3,
  },
  summaryValue: { fontSize: 18, fontWeight: "700" },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  tableScroll: { flex: 1 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: { backgroundColor: colors.primary },
  tableRowAlt: { backgroundColor: "#F9FAFB" },
  headerCell: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    paddingHorizontal: 4,
  },
  cell: { fontSize: 11, color: colors.text, paddingHorizontal: 4 },
  emptyWrap: { width: 320, alignSelf: "center" },
  officerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "12",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + "30",
    gap: 10,
  },
  officerBannerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  officerBannerAvatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  officerBannerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  showAllBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  showAllBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  vipButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  vipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#F7FAFC",
    paddingVertical: 10,
    elevation: 2,
  },
  vipBtnText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#1E3A5F",
  },
});

export default DutyReportScreen;
