import XLSX from "xlsx";
import RNFetchBlob from "react-native-blob-util";
import { Platform, Alert, PermissionsAndroid } from "react-native";
import moment from "moment";

// ---------- Helper: Build metadata rows ----------
const buildMetadata = (filters, title) => {
  const meta = [
    [title],
    [`Generated on: ${moment().format("DD MMM YYYY, h:mm:ss A")}`],
    [],
  ];
  if (filters) {
    if (filters.dateFrom && filters.dateTo) {
      meta.push([
        `Period: ${moment(filters.dateFrom).format("DD MMM YYYY")} – ${moment(filters.dateTo).format("DD MMM YYYY")}`,
      ]);
    } else if (filters.dateFrom) {
      meta.push([`From: ${moment(filters.dateFrom).format("DD MMM YYYY")}`]);
    } else if (filters.dateTo) {
      meta.push([`To: ${moment(filters.dateTo).format("DD MMM YYYY")}`]);
    }
    if (filters.officerId) meta.push([`Officer ID: ${filters.officerId}`]);
    if (filters.status) meta.push([`Status: ${filters.status}`]);
    meta.push([]);
  }
  return meta;
};

// ---------- Request storage permission (Android < 10 only) ----------
const requestStoragePermission = async () => {
  if (Platform.OS !== "android" || Platform.Version >= 29) {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "Storage Permission Required",
        message:
          "This app needs access to your storage to save the exported file.",
        buttonPositive: "OK",
        buttonNegative: "Cancel",
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error("Permission request failed:", err);
    return false;
  }
};

// ---------- Save using MediaStore (Android 10+) ----------
const saveUsingMediaStore = async (fileData, fileName, mimeType) => {
  const dirs = RNFetchBlob.fs.dirs;
  const cachePath = `${dirs.CacheDir}/${fileName}`;

  await RNFetchBlob.fs.writeFile(cachePath, fileData, "base64");

  const result = await RNFetchBlob.MediaCollection.copyToMediaStore(
    {
      name: fileName,
      parentFolder: "",
      mimeType: mimeType,
    },
    "Download",
    cachePath,
  );

  RNFetchBlob.fs.unlink(cachePath).catch(() => {});
  return result;
};

// ---------- Main Excel writer ----------
const writeExcelFile = async (allRows, colWidths, fileName, sheetName) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const mimeType =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  let savedPath;

  if (Platform.OS === "android") {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      throw new Error("Storage permission denied");
    }
    savedPath = await saveUsingMediaStore(wbout, fileName, mimeType);
  } else {
    const dirs = RNFetchBlob.fs.dirs;
    savedPath = `${dirs.DocumentDir}/${fileName}`;
    await RNFetchBlob.fs.writeFile(savedPath, wbout, "base64");
  }

  return savedPath;
};

// ---------- Show platform-correct success alert ----------
const showSuccessAlert = (fileName) => {
  if (Platform.OS === "android") {
    Alert.alert(
      "✅ Download Complete",
      `The file "${fileName}" has been saved to your Downloads folder.`,
    );
  } else {
    Alert.alert(
      "✅ Export Complete",
      `The file "${fileName}" has been saved. You can find it in the Files app under "On My iPhone/iPad" → your app's folder.`,
    );
  }
};

// ---------- Export Duty Report (22 columns) ----------
export const exportDutyReportExcel = async (data, filters) => {
  try {
    if (!data || data.length === 0) {
      Alert.alert("No Data", "There is no data to export");
      return;
    }

    // Header – exactly as in the table (no renaming)
    const header = [
      "#",
      "Subordinate",
      "Traveller Name",
      "Traveller Designation",
      "Traveller Phone",
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
    ];

    // Map each duty item to a row
    const rows = data.map((item, index) => {
      const incentiveText = item?.incentive?.eligible
        ? `₹${item.incentive.amount}`
        : "No";

      return [
        item.srNo || index + 1,
        item.officerName || "—",
        item.travellerName || "—",
        item.travellerDesignation || "—",
        item.travellerPhone || "—",
        item.date ? moment(item.date).format("DD/MM/YY") : "—",
        item.reportingTime
          ? moment(item.reportingTime, "HH:mm").format("HH:mm")
          : "—",
        item.guestArrivalTime
          ? moment(item.guestArrivalTime, "HH:mm").format("HH:mm")
          : "—",
        (item.officeType || "").replace("_", " "),
        item.arrivalDeparture || "—",
        item.airline || "—",
        item.flightNo || "—",
        item.pnrNo || "—",
        item.flightTime
          ? moment(item.flightTime, "HH:mm").format("HH:mm")
          : "—",
        item.from || "—",
        item.to || "—",
        item.airportName || "—",
        item.terminalName || "—",
        item.noOfPassengers ?? "—",
        item.officerConfirmed ? "Yes" : "No",
        item.status || "—",
        incentiveText,
      ];
    });

    const metadata = buildMetadata(filters, "Duty Report");
    const allRows = [...metadata, header, ...rows];

    // Column widths – only adjusted to fit new content, names unchanged
    const colWidths = [
      { wch: 6 }, // #
      { wch: 20 }, // Subordinate
      { wch: 25 }, // Traveller Name
      { wch: 25 }, // Traveller Designation
      { wch: 18 }, // Traveller Phone
      { wch: 12 }, // Date
      { wch: 14 }, // Reporting Time
      { wch: 16 }, // Guest Arrival Time
      { wch: 18 }, // Office Type
      { wch: 12 }, // Arr/Dep
      { wch: 14 }, // Airline
      { wch: 14 }, // Flight No
      { wch: 14 }, // PNR No
      { wch: 14 }, // Flight Time
      { wch: 12 }, // From
      { wch: 12 }, // To
      { wch: 20 }, // Airport
      { wch: 16 }, // Terminal
      { wch: 12 }, // Passengers
      { wch: 16 }, // Officer Confirmed
      { wch: 14 }, // Status
      { wch: 14 }, // Incentive
    ];

    const fileName = `Duty_Report_${moment().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;

    await writeExcelFile(allRows, colWidths, fileName, "Duty Report");

    showSuccessAlert(fileName);
  } catch (error) {
    console.log("ERROR OBJECT:", error);
    Alert.alert(
      "Export Failed",
      `Message: ${error?.message || "Unknown error"}`,
    );
  }
};

// ---------- Export Subordinate Report (unchanged) ----------
export const exportSubordinateReportExcel = async (data, filters) => {
  try {
    if (!data || data.length === 0) {
      Alert.alert("No Data", "There is no data to export");
      return;
    }

    const header = [
      "Officer Name",
      "Employee ID",
      "Total Duties",
      "Upcoming",
      "Completed",
      "Cancelled",
      "Office Time Duty",
      "Holiday/Before/After Duty",
    ];
    const rows = data.map((item) => [
      item.officer?.name || "N/A",
      item.officer?.employeeId || "N/A",
      item.totalDuties || 0,
      item.upcoming || 0,
      item.completed || 0,
      item.cancelled || 0,
      item.officeTimeDuty || 0,
      item.holidayBeforeAfterDuty || 0,
    ]);

    const summary = [
      "TOTAL",
      "",
      data.reduce((s, i) => s + (i.totalDuties || 0), 0),
      data.reduce((s, i) => s + (i.upcoming || 0), 0),
      data.reduce((s, i) => s + (i.completed || 0), 0),
      data.reduce((s, i) => s + (i.cancelled || 0), 0),
      data.reduce((s, i) => s + (i.officeTimeDuty || 0), 0),
      data.reduce((s, i) => s + (i.holidayBeforeAfterDuty || 0), 0),
    ];

    const metadata = buildMetadata(filters, "Subordinate Report");
    const allRows = [...metadata, header, ...rows, [], summary];
    const colWidths = [
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 25 },
    ];
    const fileName = `Subordinate_Report_${moment().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;

    await writeExcelFile(allRows, colWidths, fileName, "Subordinate Report");

    showSuccessAlert(fileName);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    if (error?.message === "Storage permission denied") {
      Alert.alert(
        "Permission Required",
        "Storage permission is needed to save the file.",
      );
    } else {
      Alert.alert(
        "Export Failed",
        "Failed to save Excel file. Please try again.",
      );
    }
  }
};
