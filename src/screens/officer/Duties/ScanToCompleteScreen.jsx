import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, PermissionsAndroid, Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {NativeModules} from 'react-native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {parseAllFlights} from '../../../utils/parseBoardingPass';
import {extractPdfText} from '../../../api/boardingPassApi';
import {useDuties} from '../../../hooks/useDuties';
import {DUTY_STATUS} from '../../../constants/dutyStatus';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';

const normalizeFlight = s =>
  (s || '').toUpperCase().replace(/[\s\-]/g, '');

const ScanToCompleteScreen = () => {
  const navigation = useNavigation();
  const {params: {dutyId, flightNo: expectedFlightNo, travellerName: dutyTravellerName}} = useRoute();
  const {changeStatus, fetchDuty} = useDuties();

  const [imageUri, setImageUri] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(null); // { flightNo, travellerName, from, to }
  const [completing, setCompleting] = useState(false);

  const matched =
    detected?.flightNo &&
    normalizeFlight(detected.flightNo) === normalizeFlight(expectedFlightNo);

  const requestCamera = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {title: 'Camera Permission', message: 'Needed to scan the boarding pass.', buttonPositive: 'Allow', buttonNegative: 'Deny'},
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Camera Permission Denied', 'Enable camera permission in Settings.');
      return false;
    }
    return true;
  };

  const runOCR = async uri => {
    setScanning(true);
    setDetected(null);
    try {
      const result = await TextRecognition.recognize(uri);
      const allText = result.blocks.map(b => b.text).join('\n');
      const segments = parseAllFlights(allText);
      if (segments.length === 0 || !segments[0].flightNo) {
        Alert.alert('No Flight Found', 'Could not detect a flight number. Try a clearer photo.');
        return;
      }
      // Pick the segment whose flight number best matches the expected one
      const best = segments.find(
        s => normalizeFlight(s.flightNo) === normalizeFlight(expectedFlightNo),
      ) || segments[0];
      setDetected(best);
    } catch {
      Alert.alert('Scan Failed', 'Could not read text from the image. Try a clearer photo.');
    } finally {
      setScanning(false);
    }
  };

  const runPdfOCR = async () => {
    const {FilePicker} = NativeModules;
    if (!FilePicker) {
      Alert.alert('Not Available', 'File picker not found.');
      return;
    }
    try {
      const file = await FilePicker.pickPdf();
      setImageUri(null);
      const approxBytes = (file.base64?.length || 0) * 0.75;
      if (approxBytes > 10 * 1024 * 1024) {
        Alert.alert('PDF Too Large', 'Please use a photo or a smaller PDF.');
        return;
      }
      setScanning(true);
      setDetected(null);
      try {
        const text = await extractPdfText(file.base64, file.fileName);
        const segments = parseAllFlights(text);
        if (segments.length === 0 || !segments[0].flightNo) {
          Alert.alert('No Flight Found', 'Could not detect a flight number in this PDF.');
          return;
        }
        const best = segments.find(
          s => normalizeFlight(s.flightNo) === normalizeFlight(expectedFlightNo),
        ) || segments[0];
        setDetected(best);
      } catch (e) {
        Alert.alert('PDF Read Failed', e?.message || 'Could not extract text from this PDF.');
      } finally {
        setScanning(false);
      }
    } catch (e) {
      if (e?.code !== 'CANCELLED') Alert.alert('Error', e?.message || 'Could not open file picker.');
    }
  };

  const showPicker = () => {
    Alert.alert('Scan Boarding Pass', 'Choose source', [
      {text: 'Camera', onPress: async () => {
        const ok = await requestCamera();
        if (!ok) return;
        launchCamera({mediaType: 'photo', quality: 1.0}, res => {
          if (res.didCancel || res.errorCode) return;
          const uri = res.assets?.[0]?.uri;
          if (uri) { setImageUri(uri); runOCR(uri); }
        });
      }},
      {text: 'Photo Gallery', onPress: () => {
        launchImageLibrary({mediaType: 'photo', quality: 1.0}, res => {
          if (res.didCancel || res.errorCode) return;
          const uri = res.assets?.[0]?.uri;
          if (uri) { setImageUri(uri); runOCR(uri); }
        });
      }},
      {text: 'PDF File', onPress: runPdfOCR},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleComplete = async () => {
    const confirmMsg = matched
      ? `Flight ${detected.flightNo} matches. Mark this duty as completed?`
      : `The scanned flight (${detected?.flightNo || 'unknown'}) does not match the duty (${expectedFlightNo}). Complete anyway?`;
    Alert.alert('Complete Duty', confirmMsg, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Mark Completed', onPress: async () => {
        setCompleting(true);
        await changeStatus(dutyId, DUTY_STATUS.COMPLETED);
        await fetchDuty(dutyId);
        setCompleting(false);
        navigation.goBack();
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan to Complete</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Expected flight */}
        <View style={styles.dutyBox}>
          <Text style={styles.dutyBoxLabel}>Expected flight on this duty</Text>
          <Text style={styles.dutyBoxFlight}>{expectedFlightNo || '—'}</Text>
          {dutyTravellerName ? (
            <View style={styles.dutyBoxTraveller}>
              <Text style={styles.dutyBoxTravellerLabel}>Traveller  </Text>
              <Text style={styles.dutyBoxTravellerName}>{dutyTravellerName}</Text>
            </View>
          ) : null}
          <Text style={styles.dutyBoxHint}>
            Scan the traveller's boarding pass below to verify and complete the duty.
          </Text>
        </View>

        {/* Scan button */}
        <TouchableOpacity style={styles.scanBtn} onPress={showPicker} disabled={scanning}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanBtnText}>
            {detected ? 'Rescan Boarding Pass' : 'Scan Boarding Pass'}
          </Text>
        </TouchableOpacity>

        {imageUri && (
          <View style={styles.previewBox}>
            <Image source={{uri: imageUri}} style={styles.preview} resizeMode="contain" />
          </View>
        )}

        {scanning && (
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.scanningText}>Reading boarding pass...</Text>
          </View>
        )}

        {/* Result */}
        {detected && !scanning && (
          <View style={[styles.resultBox, matched ? styles.resultMatch : styles.resultMismatch]}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Detected Flight</Text>
              <Text style={[styles.resultFlight, {color: matched ? '#16A34A' : '#DC2626'}]}>
                {detected.flightNo}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Expected Flight</Text>
              <Text style={styles.resultFlight}>{expectedFlightNo}</Text>
            </View>
            {(detected.travellerName || dutyTravellerName) ? (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Traveller</Text>
                <View style={styles.travellerCol}>
                  {detected.travellerName ? (
                    <Text style={styles.resultValue}>{detected.travellerName}
                      <Text style={styles.scannedTag}> (scanned)</Text>
                    </Text>
                  ) : null}
                  {dutyTravellerName && dutyTravellerName !== detected.travellerName ? (
                    <Text style={styles.resultValueSub}>{dutyTravellerName}
                      <Text style={styles.dutyTag}> (on duty)</Text>
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {detected.from && detected.to ? (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Route</Text>
                <Text style={styles.resultValue}>{detected.from} → {detected.to}</Text>
              </View>
            ) : null}

            <View style={[styles.matchBadge, matched ? styles.matchBadgeYes : styles.matchBadgeNo]}>
              <Text style={[styles.matchBadgeText, {color: matched ? '#16A34A' : '#DC2626'}]}>
                {matched ? '✓ Flight number matches' : '⚠ Flight number mismatch'}
              </Text>
            </View>
          </View>
        )}

        {/* Complete button — only shown after scan */}
        {detected && !scanning && (
          <TouchableOpacity
            style={[styles.completeBtn, completing && styles.btnDisabled]}
            onPress={handleComplete}
            disabled={completing}
            activeOpacity={0.8}>
            {completing
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.completeBtnText}>✅  Mark Duty as Completed</Text>}
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  back: {color: colors.primary, fontSize: 15},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  content: {padding: 16, paddingBottom: 40},

  dutyBox: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadows.sm},
  dutyBoxLabel: {fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4},
  dutyBoxFlight: {fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6},
  dutyBoxTraveller: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  dutyBoxTravellerLabel: {fontSize: 12, color: colors.textSecondary},
  dutyBoxTravellerName: {fontSize: 13, fontWeight: '700', color: colors.text},
  dutyBoxHint: {fontSize: 12, color: colors.textSecondary, lineHeight: 17},

  scanBtn: {backgroundColor: colors.primary, borderRadius: 10, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 10, ...shadows.sm},
  scanIcon: {fontSize: 22},
  scanBtnText: {color: colors.white, fontSize: 16, fontWeight: '600'},

  previewBox: {backgroundColor: colors.white, borderRadius: 10, padding: 8, marginBottom: 16, ...shadows.sm, alignItems: 'center'},
  preview: {width: '100%', height: 180, borderRadius: 8},

  scanningBox: {alignItems: 'center', padding: 24, backgroundColor: colors.white, borderRadius: 10, marginBottom: 16, ...shadows.sm},
  scanningText: {marginTop: 12, fontSize: 14, color: colors.textSecondary},

  resultBox: {borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1.5, ...shadows.sm},
  resultMatch: {backgroundColor: '#F0FDF4', borderColor: '#86EFAC'},
  resultMismatch: {backgroundColor: '#FFF7ED', borderColor: '#FED7AA'},
  resultRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.divider},
  resultLabel: {fontSize: 13, color: colors.textSecondary},
  resultFlight: {fontSize: 15, fontWeight: '800', color: colors.text},
  resultValue: {fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right'},
  resultValueSub: {fontSize: 12, fontWeight: '400', color: colors.textSecondary, textAlign: 'right', marginTop: 2},
  travellerCol: {flex: 1, alignItems: 'flex-end'},
  scannedTag: {fontSize: 10, fontWeight: '400', color: colors.primary},
  dutyTag: {fontSize: 10, fontWeight: '400', color: colors.textSecondary},
  matchBadge: {borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 12},
  matchBadgeYes: {backgroundColor: '#DCFCE7'},
  matchBadgeNo: {backgroundColor: '#FEF3C7'},
  matchBadgeText: {fontSize: 13, fontWeight: '700'},

  completeBtn: {backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.sm},
  completeBtnText: {color: colors.white, fontSize: 16, fontWeight: '700'},
  btnDisabled: {opacity: 0.6},
});

export default ScanToCompleteScreen;
