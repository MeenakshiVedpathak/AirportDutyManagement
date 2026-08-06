import XLSX from 'xlsx';
import RNFetchBlob from 'react-native-blob-util';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import moment from 'moment';

// ---------- Helper: Build metadata rows ----------
const buildMetadata = (filters, title) => {
    const meta = [
        [title],
        [`Generated on: ${moment().format('DD MMM YYYY, h:mm:ss A')}`],
        [],
    ];
    if (filters) {
        if (filters.dateFrom && filters.dateTo) {
            meta.push([`Period: ${moment(filters.dateFrom).format('DD MMM YYYY')} – ${moment(filters.dateTo).format('DD MMM YYYY')}`]);
        } else if (filters.dateFrom) {
            meta.push([`From: ${moment(filters.dateFrom).format('DD MMM YYYY')}`]);
        } else if (filters.dateTo) {
            meta.push([`To: ${moment(filters.dateTo).format('DD MMM YYYY')}`]);
        }
        if (filters.officerId) meta.push([`Officer ID: ${filters.officerId}`]);
        if (filters.status) meta.push([`Status: ${filters.status}`]);
        meta.push([]);
    }
    return meta;
};

// ---------- Request storage permission (Android < 10 only) ----------
const requestStoragePermission = async () => {
    // Android 10+ uses scoped storage + MediaStore, no permission needed
    if (Platform.OS !== 'android' || Platform.Version >= 29) {
        return true;
    }
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
                title: 'Storage Permission Required',
                message: 'This app needs access to your storage to save the exported file.',
                buttonPositive: 'OK',
                buttonNegative: 'Cancel',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
        console.error('Permission request failed:', err);
        return false;
    }
};

// ---------- Save using MediaStore (Android 10+) ----------
const saveUsingMediaStore = async (fileData, fileName, mimeType) => {
    const dirs = RNFetchBlob.fs.dirs;
    const cachePath = `${dirs.CacheDir}/${fileName}`;

    // 1. Write the file to the app's cache directory
    await RNFetchBlob.fs.writeFile(cachePath, fileData, 'base64');

    // 2. Copy the file from cache to MediaStore (Downloads collection)
    //    This makes it appear in the public Downloads folder.
    //    No storage permission required on Android 10+.
    const result = await RNFetchBlob.MediaCollection.copyToMediaStore(
        {
            name: fileName,
            parentFolder: '', // saves directly in Downloads root
            mimeType: mimeType,
        },
        'Download', // Media Collection: "Download" | "Audio" | "Image" | "Video"
        cachePath   // Path to the source file in app's cache
    );

    // 3. Clean up the cache copy
    RNFetchBlob.fs.unlink(cachePath).catch(() => {
        // Non-fatal: cache cleanup failure shouldn't break the export flow
    });

    // result is the content URI (e.g., content://media/external/downloads/...)
    return result;
};

// ---------- Main Excel writer ----------
const writeExcelFile = async (allRows, colWidths, fileName, sheetName) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    let savedPath;

    if (Platform.OS === 'android') {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
            throw new Error('Storage permission denied');
        }
        // Use MediaStore (works on Android 10+ without storage permission)
        savedPath = await saveUsingMediaStore(wbout, fileName, mimeType);
    } else {
        // iOS – save to Documents (user can access via the Files app)
        const dirs = RNFetchBlob.fs.dirs;
        savedPath = `${dirs.DocumentDir}/${fileName}`;
        await RNFetchBlob.fs.writeFile(savedPath, wbout, 'base64');
    }

    return savedPath;
};

// ---------- Show platform-correct success alert ----------
const showSuccessAlert = (fileName) => {
    if (Platform.OS === 'android') {
        Alert.alert(
            '✅ Download Complete',
            `The file "${fileName}" has been saved to your Downloads folder.`
        );
    } else {
        Alert.alert(
            '✅ Export Complete',
            `The file "${fileName}" has been saved. You can find it in the Files app under "On My iPhone/iPad" → your app's folder.`
        );
    }
};

// ---------- Export Duty Report ----------
export const exportDutyReportExcel = async (data, filters) => {
    try {
        if (!data || data.length === 0) {
            Alert.alert('No Data', 'There is no data to export');
            return;
        }

        const header = ['#', 'Subordinate', 'Date', 'Arr/Dep', 'Flight No', 'Flight Time', 'From', 'To', 'Airport', 'Terminal', 'Office Type', 'Status'];
        const rows = data.map((item, index) => [
            item.srNo || index + 1,
            item.officerName || '—',
            item.date ? moment(item.date).format('DD/MM/YY') : '—',
            item.arrivalDeparture || '—',
            item.flightNo || '—',
            item.flightTime ? moment(item.flightTime, 'HH:mm').format('HH:mm') : '—',
            item.from || '—',
            item.to || '—',
            item.airportName || '—',
            item.terminalName || '—',
            (item.officeType || '').replace('_', ' '),
            item.status || '—',
        ]);

        const metadata = buildMetadata(filters, 'Duty Report');
        const allRows = [...metadata, header, ...rows];
        const colWidths = [
            { wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
            { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
            { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 14 },
        ];
        const fileName = `Duty_Report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;

        await writeExcelFile(allRows, colWidths, fileName, 'Duty Report');

        showSuccessAlert(fileName);
    } catch (error) {
        console.log("ERROR OBJECT:", error);
        console.log("ERROR CODE:", error?.code);
        console.log("ERROR KEYS:", Object.keys(error || {}));
        Alert.alert(
            "Export Failed",
            `Message: ${error?.message}\nCode: ${error?.code}\nRaw: ${JSON.stringify(error)}`
        );
    }
};

// ---------- Export Subordinate Report ----------
export const exportSubordinateReportExcel = async (data, filters) => {
    try {
        if (!data || data.length === 0) {
            Alert.alert('No Data', 'There is no data to export');
            return;
        }

        const header = ['Officer Name', 'Employee ID', 'Total Duties', 'Upcoming', 'Completed', 'Cancelled', 'Office Time Duty', 'Holiday/Before/After Duty'];
        const rows = data.map(item => [
            item.officer?.name || 'N/A',
            item.officer?.employeeId || 'N/A',
            item.totalDuties || 0,
            item.upcoming || 0,
            item.completed || 0,
            item.cancelled || 0,
            item.officeTimeDuty || 0,
            item.holidayBeforeAfterDuty || 0,
        ]);

        const summary = [
            'TOTAL',
            '',
            data.reduce((s, i) => s + (i.totalDuties || 0), 0),
            data.reduce((s, i) => s + (i.upcoming || 0), 0),
            data.reduce((s, i) => s + (i.completed || 0), 0),
            data.reduce((s, i) => s + (i.cancelled || 0), 0),
            data.reduce((s, i) => s + (i.officeTimeDuty || 0), 0),
            data.reduce((s, i) => s + (i.holidayBeforeAfterDuty || 0), 0),
        ];

        const metadata = buildMetadata(filters, 'Subordinate Report');
        const allRows = [...metadata, header, ...rows, [], summary];
        const colWidths = [
            { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 25 },
        ];
        const fileName = `Subordinate_Report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;

        await writeExcelFile(allRows, colWidths, fileName, 'Subordinate Report');

        showSuccessAlert(fileName);
    } catch (error) {
        console.error('Error exporting Excel:', error);
        if (error?.message === 'Storage permission denied') {
            Alert.alert('Permission Required', 'Storage permission is needed to save the file.');
        } else {
            Alert.alert('Export Failed', 'Failed to save Excel file. Please try again.');
        }
    }
};