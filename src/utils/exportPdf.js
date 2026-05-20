import { Alert } from 'react-native';
import Share from 'react-native-share';
import axiosInstance from '../api/axiosInstance';

const arrayBufferToBase64 = buffer => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const downloadAndSharePdf = async (path, filters = {}, filename) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );

  const response = await axiosInstance.get(path, {
    params: cleanFilters,
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  const base64 = arrayBufferToBase64(response.data);

  await Share.open({
    url: `data:application/pdf;base64,${base64}`,
    type: 'application/pdf',
    filename,
    saveToFiles: true,
    failOnCancel: false,
  });
};

export const exportDutyReportPDF = async (duties, filters = {}) => {
  if (!duties || duties.length === 0) {
    Alert.alert('No Data', 'Nothing to export. Load some duties first.');
    return;
  }
  try {
    const filename = `DutyReport_${new Date().toISOString().slice(0, 10)}.pdf`;
    await downloadAndSharePdf('/reports/duties/pdf', {
      status: filters.status,
      airportId: filters.airportId,
      officerId: filters.officerId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }, filename);
  } catch (e) {
    if (e?.error !== 'User did not share') {
      Alert.alert('Export Failed', e?.message || 'Could not download PDF. Please try again.');
    }
  }
};

export const exportSubordinateReportPDF = async (subordinates, filters = {}) => {
  if (!subordinates || subordinates.length === 0) {
    Alert.alert('No Data', 'Nothing to export.');
    return;
  }
  try {
    const filename = `SubordinateReport_${new Date().toISOString().slice(0, 10)}.pdf`;
    await downloadAndSharePdf('/reports/subordinates/pdf', {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }, filename);
  } catch (e) {
    if (e?.error !== 'User did not share') {
      Alert.alert('Export Failed', e?.message || 'Could not download PDF. Please try again.');
    }
  }
};
