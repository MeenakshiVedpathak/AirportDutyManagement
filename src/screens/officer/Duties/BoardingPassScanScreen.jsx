import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, Alert, Platform, PermissionsAndroid,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {NativeModules} from 'react-native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {parseAllFlights} from '../../../utils/parseBoardingPass';
import {consumeCreatedScanIndex} from '../../../utils/pendingDutyStore';
import {extractPdfText} from '../../../api/boardingPassApi';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import AppButton from '../../../components/common/AppButton';

const BoardingPassScanScreen = () => {
  const navigation = useNavigation();
  const {user} = useSelector(state => state.auth);
  const isOfficer = user?.role === 'OFFICER';

  const [imageUri, setImageUri] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [segments, setSegments] = useState([]);
  const [rawText, setRawText] = useState('');
  const [doneIndices, setDoneIndices] = useState(new Set());

  // Each time this screen regains focus, check if CreateDutyScreen signalled a completed card.
  useFocusEffect(
    useCallback(() => {
      const idx = consumeCreatedScanIndex();
      if (idx !== null && idx !== undefined) {
        setDoneIndices(prev => new Set([...prev, idx]));
      }
    }, []),
  );

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'This app needs camera access to scan boarding passes.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        'Camera Permission Denied',
        'Please enable camera permission in Settings → Apps → AirportDutyManagement → Permissions.',
      );
      return false;
    }
    return true;
  };

  const pickImage = async (fromCamera) => {
    if (fromCamera) {
      const ok = await requestCameraPermission();
      if (!ok) return;
    }
    const options = {mediaType: 'photo', quality: 1.0, includeBase64: false};
    const picker = fromCamera ? launchCamera : launchImageLibrary;
    picker(options, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setImageUri(uri);
        setSegments([]);
        setRawText('');
        setDoneIndices(new Set());
        runOCR(uri);
      }
    });
  };

  const pickPdf = async () => {
    const {FilePicker} = NativeModules;
    if (!FilePicker) {
      Alert.alert('Not Available', 'File picker not found. Please reinstall the app.');
      return;
    }
    try {
      const file = await FilePicker.pickPdf();
      setImageUri(null);
      setSegments([]);
      setRawText('');
      setDoneIndices(new Set());
      // base64 length * 0.75 ≈ decoded bytes; reject anything over ~10 MB decoded
      const approxBytes = (file.base64?.length || 0) * 0.75;
      if (approxBytes > 10 * 1024 * 1024) {
        Alert.alert(
          'PDF Too Large',
          'This PDF is too large to process. Boarding pass PDFs are usually under 2 MB — please try a smaller file, or scan the boarding pass as a photo instead.',
        );
        return;
      }
      setScanning(true);
      try {
        const text = await extractPdfText(file.base64, file.fileName);
        setRawText(text);
        const found = parseAllFlights(text);
        setSegments(found);
        if (found.length === 0) {
          Alert.alert('No Flights Found', 'Could not detect flight details in this PDF. Try a clearer boarding pass image instead.');
        }
      } catch (e) {
        Alert.alert('PDF Read Failed', e?.message || 'Could not extract text from this PDF.');
      } finally {
        setScanning(false);
      }
    } catch (e) {
      if (e?.code !== 'CANCELLED') {
        Alert.alert('Error', e?.message || 'Could not open file picker.');
      }
    }
  };

  const runOCR = async (uri) => {
    setScanning(true);
    try {
      const result = await TextRecognition.recognize(uri);
      const allText = result.blocks.map(b => b.text).join('\n');
      console.log('[OCR_RAW]', allText);
      setRawText(allText);
      const found = parseAllFlights(allText);
      console.log('[OCR_PARSED]', JSON.stringify(found));
      setSegments(found);
    } catch (e) {
      Alert.alert('Scan Failed', 'Could not read text from the image. Try a clearer photo.');
    } finally {
      setScanning(false);
    }
  };

  const showSourcePicker = () => {
    Alert.alert(
      'Select Source',
      'Choose how to add the boarding pass',
      [
        {text: 'Camera', onPress: () => pickImage(true)},
        {text: 'Photo Gallery', onPress: () => pickImage(false)},
        {text: 'Files / PDF', onPress: pickPdf},
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const handleCreateDuty = (seg, index) => {
    navigation.push('CreateDuty', {
      prefill: seg,
      returnToScan: true,
      scanIndex: index,
    });
  };

  const handleGoToDuties = () => {
    navigation.navigate('MyDuties');
  };

  const allDone = segments.length > 0 && segments.every((_, i) => doneIndices.has(i));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Boarding Pass</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Works with all Indian airlines</Text>
          <Text style={styles.infoText}>
            IndiGo · Air India · Vistara · SpiceJet · Akasa · GoFirst{'\n'}
            Take a photo, pick from gallery, or select a PDF boarding pass from Files.
          </Text>
        </View>

        <TouchableOpacity style={styles.scanBtn} onPress={showSourcePicker}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanBtnText}>
            {imageUri || rawText ? 'Rescan / Change' : 'Scan Boarding Pass / Pick PDF'}
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

        {/* Flight cards — one per detected flight */}
        {segments.length > 0 && !scanning && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                {segments.length === 1 ? '1 Flight Found' : `${segments.length} Flights Found`}
              </Text>
              <View style={[styles.countBadge, segments.length > 1 ? styles.countBadgeMulti : styles.countBadgeSingle]}>
                <Text style={styles.countBadgeText}>
                  {doneIndices.size}/{segments.length} done
                </Text>
              </View>
            </View>
            <Text style={styles.resultSub}>Tap a flight card to create its duty</Text>

            {segments.map((seg, i) => {
              const isDone = doneIndices.has(i);
              const isArrival = (seg.arrivalDeparture || '').toUpperCase() === 'ARRIVAL';
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.flightCard, isDone && styles.flightCardDone]}
                  onPress={() => {
                    if (isOfficer) { handleGoToDuties(); }
                    else if (!isDone) { handleCreateDuty(seg, i); }
                  }}
                  activeOpacity={isDone && !isOfficer ? 1 : 0.72}>

                  <View style={styles.flightCardTop}>
                    <View style={[styles.typeBadge, isArrival ? styles.typeBadgeArr : styles.typeBadgeDep]}>
                      <Text style={styles.typeBadgeText}>{isArrival ? '✈ ARRIVAL' : '✈ DEPARTURE'}</Text>
                    </View>
                    {isDone && !isOfficer && (
                      <View style={styles.doneBadge}>
                        <Text style={styles.doneBadgeText}>✓ Duty Created</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.flightNo}>{seg.flightNo || '(flight no. not detected)'}</Text>
                  <Text style={styles.flightRoute}>
                    {seg.from || '?'}  →  {seg.to || '?'}
                  </Text>
                  <Text style={styles.flightMeta}>
                    {seg.date || 'Date not detected'}  ·  {seg.flightTime || 'Time not detected'}
                  </Text>
                  <Text style={styles.flightMeta}>
                    {seg.noOfPassengers > 1 ? `👥 ${seg.noOfPassengers} Passengers` : '👤 1 Passenger'}
                  </Text>

                  <View style={styles.tapRow}>
                    <Text style={styles.tapText}>
                      {isOfficer ? 'Tap to find & claim this duty →' : isDone ? null : 'Tap to fill duty form →'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {isOfficer && segments.length > 0 && (
              <AppButton
                title="Go to Duties — Find & Claim"
                onPress={handleGoToDuties}
                style={styles.doneAllBtn}
              />
            )}

            {!isOfficer && allDone && (
              <AppButton
                title="All Duties Created — Go to Dashboard"
                onPress={() => navigation.navigate('Dashboard')}
                style={styles.doneAllBtn}
              />
            )}
          </View>
        )}

        {rawText.length > 0 && !scanning && (
          <TouchableOpacity
            style={styles.rawToggle}
            onPress={() => {
              const flightSummary = segments.map((s, i) =>
                `[${i + 1}] ${s.flightNo || '?'} | ${s.from || '?'} → ${s.to || '?'} | ${s.date || '?'} ${s.flightTime || '?'} | ${s.noOfPassengers || 1} pax`
              ).join('\n');
              Alert.alert(
                `OCR Debug (${segments.length} flight${segments.length !== 1 ? 's' : ''} found)`,
                `--- Parsed ---\n${flightSummary}\n\n--- Raw OCR ---\n${rawText}`,
              );
            }}>
            <Text style={styles.rawToggleText}>View raw OCR text</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: {color: colors.primary, fontSize: 15},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  content: {padding: 16, paddingBottom: 40},

  infoBox: {
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  infoTitle: {fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 4},
  infoText: {fontSize: 12, color: colors.textSecondary, lineHeight: 18},

  scanBtn: {
    backgroundColor: colors.primary, borderRadius: 10, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, gap: 10, ...shadows.sm,
  },
  scanIcon: {fontSize: 22},
  scanBtnText: {color: colors.white, fontSize: 16, fontWeight: '600'},

  previewBox: {
    backgroundColor: colors.white, borderRadius: 10, padding: 8,
    marginBottom: 16, ...shadows.sm, alignItems: 'center',
  },
  preview: {width: '100%', height: 200, borderRadius: 8},

  scanningBox: {
    alignItems: 'center', padding: 24, backgroundColor: colors.white,
    borderRadius: 10, marginBottom: 16, ...shadows.sm,
  },
  scanningText: {marginTop: 12, fontSize: 14, color: colors.textSecondary},

  resultCard: {
    backgroundColor: colors.white, borderRadius: 10, padding: 16,
    marginBottom: 16, ...shadows.sm,
  },
  resultHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  resultTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  countBadge: {borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3},
  countBadgeSingle: {backgroundColor: '#DBEAFE'},
  countBadgeMulti: {backgroundColor: '#DCFCE7'},
  countBadgeText: {fontSize: 12, fontWeight: '700', color: colors.text},
  resultSub: {fontSize: 12, color: colors.textSecondary, marginBottom: 14},

  flightCard: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    padding: 14, marginBottom: 12, backgroundColor: colors.surface,
  },
  flightCardDone: {
    borderColor: '#16A34A', backgroundColor: '#F0FDF4',
  },
  flightCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  typeBadge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4},
  typeBadgeDep: {backgroundColor: '#DBEAFE'},
  typeBadgeArr: {backgroundColor: '#FEF3C7'},
  typeBadgeText: {fontSize: 11, fontWeight: '800', color: colors.text, letterSpacing: 0.3},
  doneBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  doneBadgeText: {fontSize: 11, fontWeight: '700', color: '#16A34A'},
  flightNo: {fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4},
  flightRoute: {fontSize: 14, color: colors.text, fontWeight: '500', marginBottom: 4},
  flightMeta: {fontSize: 12, color: colors.textSecondary, marginBottom: 8},
  tapRow: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 10, marginTop: 2, alignItems: 'flex-end',
  },
  tapText: {fontSize: 13, color: colors.primary, fontWeight: '700'},

  doneAllBtn: {marginTop: 8},

  rawToggle: {alignItems: 'center', paddingVertical: 8},
  rawToggleText: {fontSize: 12, color: colors.primary, textDecorationLine: 'underline'},
});

export default BoardingPassScanScreen;
