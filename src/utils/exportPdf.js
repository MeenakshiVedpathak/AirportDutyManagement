import { Alert, Linking } from "react-native";
import Share from "react-native-share";
import axiosInstance from "../api/axiosInstance";
import { store } from "../store";
import { API_BASE_URL as BASE_URL } from "../config";

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decodeArrayBufferError = (raw) => {
  try {
    if (raw instanceof ArrayBuffer) {
      const text = String.fromCharCode(...new Uint8Array(raw));
      const json = JSON.parse(text);
      return json.message || "Server error";
    }
  } catch {}
  return null;
};

const buildFallbackUrl = (path, filters = {}) => {
  const token = store.getState().auth.token;
  const params = new URLSearchParams({ token });
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return `${BASE_URL}${path}?${params.toString()}`;
};

const downloadAndSharePdf = async (path, filters = {}, filename) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    ),
  );

  let base64;
  try {
    const response = await axiosInstance.get(path, {
      params: cleanFilters,
      responseType: "arraybuffer",
      timeout: 60000,
    });
    base64 = arrayBufferToBase64(response.data);
  } catch (e) {
    const decoded = decodeArrayBufferError(e);
    throw new Error(decoded || e?.message || "Download failed");
  }

  // Try react-native-share first (shows native share sheet)
  try {
    await Share.open({
      url: `data:application/pdf;base64,${base64}`,
      type: "application/pdf",
      filename,
      failOnCancel: false,
    });
    return;
  } catch (shareErr) {
    // If share sheet cancelled, don't fallback
    if (shareErr?.error === "User did not share" || shareErr?.dismissedAction)
      return;
  }

  // Fallback: open in browser (Chrome can render PDFs)
  const fallbackUrl = buildFallbackUrl(path, cleanFilters);
  try {
    await Linking.openURL(fallbackUrl);
  } catch {
    throw new Error("Could not open PDF. No PDF viewer found on device.");
  }
};

export const exportDutyReportPDF = async (duties, filters = {}) => {
  if (!duties || duties.length === 0) {
    Alert.alert("No Data", "Nothing to export. Load some duties first.");
    return;
  }
  try {
    await downloadAndSharePdf(
      "/reports/duties/pdf",
      {
        status: filters.status,
        airportId: filters.airportId,
        officerId: filters.officerId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      },
      `DutyReport_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  } catch (e) {
    Alert.alert(
      "Export Failed",
      e?.message || "Could not download PDF. Please try again.",
    );
  }
};

export const exportSubordinateReportPDF = async (
  subordinates,
  filters = {},
) => {
  if (!subordinates || subordinates.length === 0) {
    Alert.alert("No Data", "Nothing to export.");
    return;
  }
  try {
    await downloadAndSharePdf(
      "/reports/subordinates/pdf",
      {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      },
      `SubordinateReport_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  } catch (e) {
    Alert.alert(
      "Export Failed",
      e?.message || "Could not download PDF. Please try again.",
    );
  }
};
