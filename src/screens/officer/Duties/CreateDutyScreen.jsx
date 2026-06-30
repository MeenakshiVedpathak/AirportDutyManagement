import React, {useState, useEffect, useLayoutEffect, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import {dutySchema} from '../../../utils/validationSchemas';
import {useDuties} from '../../../hooks/useDuties';
import {fetchAirportsStart, fetchAirportsSuccess, setTerminals} from '../../../store/slices/airportSlice';
import {getAirports, getTerminals} from '../../../api/airportApi';
import {NativeModules} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
const {FilePicker} = NativeModules;
import AppInput from '../../../components/common/AppInput';
import AppButton from '../../../components/common/AppButton';
import AutocompleteInput from '../../../components/common/AutocompleteInput';
import WhatsAppMessageModal from '../../../components/common/WhatsAppMessageModal';
import CityDropdown from '../../../components/common/CityDropdown';
import PdfViewerModal from '../../../components/common/PdfViewerModal';
import {colors} from '../../../theme/colors';
import {OFFICE_TYPES, ARRIVAL_DEPARTURE} from '../../../constants/dutyFormFields';
import {getDayFromDate, toAPIDate, toAPITime} from '../../../utils/dateUtils';
import {useCities} from '../../../hooks/useCities';
import {setCreatedScanIndex} from '../../../utils/pendingDutyStore';
import moment from 'moment';

const OfficerCreateDutyScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const {addDuty, uploadPdf} = useDuties();
  const {user} = useSelector(state => state.auth);
  const {list: airports, terminals} = useSelector(state => state.airports);
  const duties = useSelector(state => state.duties.list);
  const {cities, addCity} = useCities();

  const pastNames = [...new Set(duties.map(d => d.travellerName).filter(Boolean))];
  const pastDesignations = [...new Set(duties.map(d => d.travellerDesignation).filter(Boolean))];
  const nameToDesignation = duties.reduce((acc, d) => {
    if (d.travellerName && d.travellerDesignation && !acc[d.travellerName]) {
      acc[d.travellerName] = d.travellerDesignation;
    }
    return acc;
  }, {});
  const scrollRef = useRef(null);

  const [activePrefill, setActivePrefill] = useState(route.params?.prefill || null);

  const [createdDuty, setCreatedDuty] = useState(null);
  const [msgVisible, setMsgVisible] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReportingTimePicker, setShowReportingTimePicker] = useState(false);
  const [showFlightTimePicker, setShowFlightTimePicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
    activePrefill?.date ? new Date(activePrefill.date) : new Date(),
  );
  const [reportingTime, setReportingTime] = useState(new Date());
  const [flightTime, setFlightTime] = useState(
    activePrefill?.flightTime ? moment(activePrefill.flightTime, 'HH:mm').toDate() : new Date(),
  );

  const [pdfData, setPdfData] = useState(null);
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);

  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  const handlePickPdf = async () => {
    try {
      const file = await FilePicker.pickPdf();
      if (!file.fileName?.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Invalid Format', 'Only PDF files are allowed.');
        return;
      }
      const sizeBytes = Math.round(file.base64.length * 0.75);
      if (sizeBytes > MAX_FILE_BYTES) {
        Alert.alert('File Too Large', 'Please select a PDF under 5 MB.');
        return;
      }
      setPdfData({filename: file.fileName, data: file.base64, mimeType: 'application/pdf', size: sizeBytes});
    } catch (e) {
      if (e?.code !== 'CANCELLED') Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleCapturePhoto = () => {
    launchCamera({mediaType: 'photo', includeBase64: true, quality: 0.85}, response => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset?.base64) return;
      const sizeBytes = asset.fileSize || Math.round(asset.base64.length * 0.75);
      if (sizeBytes > MAX_FILE_BYTES) {
        Alert.alert('File Too Large', 'Please capture a photo under 5 MB.');
        return;
      }
      setPdfData({
        filename: asset.fileName || `photo_${Date.now()}.jpg`,
        data: asset.base64,
        mimeType: asset.type || 'image/jpeg',
        size: sizeBytes,
      });
    });
  };

  const handleAttachOptions = () => {
    Alert.alert('Attach File', 'Choose an option', [
      {text: 'Pick PDF', onPress: handlePickPdf},
      {text: 'Capture Photo', onPress: handleCapturePhoto},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const [officeTypeOpen, setOfficeTypeOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [arrDepOpen, setArrDepOpen] = useState(false);
  const [airportOpen, setAirportOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const dutyResolver = async values => {
    try {
      const valid = await dutySchema.validate(values, {abortEarly: false});
      return {values: valid, errors: {}};
    } catch (e) {
      if (e.name === 'ValidationError' && e.inner?.length) {
        const errs = {};
        for (const err of e.inner) {
          if (err.path && !errs[err.path]) {
            errs[err.path] = {message: err.message, type: 'validation'};
          }
        }
        return {values: {}, errors: errs};
      }
      Alert.alert('Validation Error', e?.message || 'Unknown error — check the form');
      return {values: {}, errors: {}};
    }
  };

  const {control, handleSubmit, setValue, reset, getValues, watch, formState: {errors, isSubmitting}} = useForm({
    resolver: dutyResolver,
    defaultValues: {
      officerId: user?.id?.toString() || '',
      officerName: user?.name || '',
      date: activePrefill?.date || toAPIDate(new Date()),
      reportingTime: toAPITime(new Date()),
      officeType: '',
      from: activePrefill?.from || '',
      to: activePrefill?.to || '',
      airline: '',
      flightNo: activePrefill?.flightNo || '',
      pnrNo: '',
      flightTime: activePrefill?.flightTime || toAPITime(new Date()),
      arrivalDeparture: activePrefill?.arrivalDeparture || 'DEPARTURE',
      airportId: '', airportName: '', terminalId: '', terminalName: '',
      noOfPassengers: activePrefill?.noOfPassengers ? String(activePrefill.noOfPassengers) : '1',
      travellerName: activePrefill?.travellerName || '',
      travellerDesignation: '',
      remark: '',
    },
  });

  const dateValue = watch('date');
  const dayValue = dateValue ? getDayFromDate(dateValue) : '';

  // Sync activePrefill when route.params.prefill changes.
  // useState only initialises once at mount; this effect picks up subsequent navigate() calls.
  useEffect(() => {
    if (route.params?.prefill) {
      setActivePrefill(route.params.prefill);
    }
  }, [route.params?.prefill]);

  // Apply scan-extracted fields to the form whenever activePrefill changes.
  // Runs on initial load AND when transitioning to step 2.
  useEffect(() => {
    if (!activePrefill) return;
    if (activePrefill.date) {
      const d = new Date(activePrefill.date);
      setSelectedDate(d);
      setValue('date', activePrefill.date);
    }
    if (activePrefill.flightTime) {
      setFlightTime(moment(activePrefill.flightTime, 'HH:mm').toDate());
      setValue('flightTime', activePrefill.flightTime);
    }
    if (activePrefill.from) setValue('from', activePrefill.from);
    if (activePrefill.to) setValue('to', activePrefill.to);
    if (activePrefill.flightNo) setValue('flightNo', activePrefill.flightNo);
    if (activePrefill.arrivalDeparture) setValue('arrivalDeparture', activePrefill.arrivalDeparture);
    if (activePrefill.noOfPassengers) setValue('noOfPassengers', String(activePrefill.noOfPassengers));
    if (activePrefill.travellerName) setValue('travellerName', activePrefill.travellerName);
  }, [activePrefill]);

  // Force-set noOfPassengers before first paint using reset() — more reliable than
  // setValue() because reset() flushes the entire form state atomically.
  useLayoutEffect(() => {
    if (activePrefill?.noOfPassengers && activePrefill.noOfPassengers > 1) {
      reset({...getValues(), noOfPassengers: String(activePrefill.noOfPassengers)});
    }
  }, []);

  // Show a one-time popup when the boarding pass scan detected multiple passengers.
  const paxAlertShown = useRef(false);
  useEffect(() => {
    if (!paxAlertShown.current && (activePrefill?.noOfPassengers ?? 1) > 1) {
      paxAlertShown.current = true;
      Alert.alert(
        '✈ Passengers Detected',
        `${activePrefill.noOfPassengers} passengers were found in the boarding pass scan.\n\nThe count has been auto-filled. You can edit it if needed.`,
        [{text: 'Got it'}],
      );
    }
  }, [activePrefill]);

  // Auto-select airport from activePrefill.from city.
  useEffect(() => {
    if (!activePrefill?.from || airports.length === 0) return;
    const fromCity = activePrefill.from.toLowerCase();
    const matched = airports.find(a => {
      if (!a.isActive) return false;
      const name = (a.name || '').toLowerCase();
      const city = (a.city || '').toLowerCase();
      const code = (a.code || '').toLowerCase();
      return name.includes(fromCity) || city.includes(fromCity) ||
             fromCity.includes(name)  || fromCity.includes(city) ||
             fromCity.includes(code);
    });
    if (matched) handleAirportChange(matched.id);
  }, [activePrefill?.from, airports]);

  // Auto-select terminal from activePrefill.terminal number.
  useEffect(() => {
    if (!activePrefill?.terminal || terminals.length === 0) return;
    const tNum = String(activePrefill.terminal);
    const tRe = new RegExp(`\\b${tNum}\\b`);
    const matched = terminals.find(t => {
      if (!t.isActive) return false;
      return tRe.test(t.name || '') || tRe.test(t.code || '');
    });
    if (!matched) return;
    setValue('terminalId', matched.id);
    setValue('terminalName', matched.name || '');
  }, [activePrefill?.terminal, terminals]);

  useEffect(() => {
    dispatch(fetchAirportsStart());
    getAirports()
      .then(res => dispatch(fetchAirportsSuccess(res.data)))
      .catch(() => {});
    dispatch(setTerminals([]));
  }, []);

  const handleAirportChange = async airportId => {
    const airport = airports.find(a => a.id === airportId);
    setValue('airportId', airportId);
    setValue('airportName', airport?.name || '');
    setValue('terminalId', '');
    setValue('terminalName', '');
    dispatch(setTerminals([]));
    if (airportId) {
      try {
        const res = await getTerminals(airportId);
        dispatch(setTerminals(res.data));
      } catch {}
    }
  };

  const onFormError = errs => {
    const msgs = Object.entries(errs).map(([k, v]) => `${k}: ${v.message}`).join('\n');
    Alert.alert('Please fix these fields', msgs);
  };

  const onSubmit = async data => {
    try {
      const payload = {...data};
      const result = await addDuty(payload);
      if (!result) {
        Alert.alert('Save Failed', 'Could not save the duty. Check your connection and try again.');
        return;
      }
      if (pdfData) {
        await uploadPdf(result.id, pdfData.filename, pdfData.data, pdfData.mimeType);
      }
      setCreatedDuty(result);
      setMsgVisible(true);
    } catch (e) {
      Alert.alert('Unexpected Error', e?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleModalClose = () => {
    setMsgVisible(false);
    if (route.params?.returnToScan) {
      // Signal BoardingPassScan (via module-level store) which card is done,
      // then go back — more reliable than passing params through navigation.
      setCreatedScanIndex(route.params?.scanIndex);
      navigation.goBack();
    } else {
      navigation.navigate('Dashboard');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Duty</Text>
        {!route.params?.returnToScan && (
          <TouchableOpacity style={styles.scanHeaderBtn} onPress={() => navigation.navigate('BoardingPassScan')}>
            <Text style={styles.scanHeaderText}>📷 Scan Pass</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>

        <AppInput label="Subordinate Name" value={user?.name || ''} editable={false} style={styles.readOnly} />

        <Controller control={control} name="travellerName" render={({field: {onChange, value}}) => (
          <AutocompleteInput
            label="Traveller Name"
            value={value}
            onChangeText={v => onChange(v.toUpperCase())}
            onSelect={name => {
              const upper = name.toUpperCase();
              onChange(upper);
              if (nameToDesignation[name]) setValue('travellerDesignation', nameToDesignation[name]);
            }}
            suggestions={pastNames}
            placeholder="e.g. Rahul Sharma"
            error={errors.travellerName?.message}
          />
        )} />

        <Controller control={control} name="travellerDesignation" render={({field: {onChange, value}}) => (
          <AutocompleteInput
            label="Designation"
            value={value}
            onChangeText={onChange}
            onSelect={onChange}
            suggestions={pastDesignations}
            placeholder="e.g. Director, Manager"
            error={errors.travellerDesignation?.message}
          />
        )} />

        {/* ── Date, Day & Office Type ── */}
        <View style={styles.triRow}>
          <View style={styles.triColDate}>
            <Text style={styles.lbl}>Date</Text>
            <TouchableOpacity style={styles.dateBtnCompact} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateBtnCompactText}>{moment(selectedDate).format('DD MMM YYYY')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.triColDay}>
            <Text style={styles.lbl}>Day</Text>
            <View style={styles.dayBox}><Text style={styles.dayText}>{dayValue}</Text></View>
          </View>
          <View style={[styles.triColType, {zIndex: 5000}]}>
            <Text style={styles.lbl}>Type <Text style={{color: colors.error}}>*</Text></Text>
            <Controller control={control} name="officeType" render={({field: {onChange, value}}) => (
              <DropDownPicker open={officeTypeOpen} setOpen={setOfficeTypeOpen} value={value} setValue={cb => onChange(cb(value))}
                items={OFFICE_TYPES} placeholder="Select" style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList} zIndex={5000} listMode="SCROLLVIEW" />
            )} />
            {errors.officeType && <Text style={styles.err}>{errors.officeType.message}</Text>}
          </View>
        </View>
        {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => {setShowDatePicker(false); if (d) {setSelectedDate(d); setValue('date', toAPIDate(d));}}} />}

        <Text style={styles.lbl}>Reporting Time</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowReportingTimePicker(true)}>
          <Text style={styles.dateBtnText}>{moment(reportingTime).format('HH:mm')}</Text>
        </TouchableOpacity>
        {showReportingTimePicker && <DateTimePicker value={reportingTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, t) => {setShowReportingTimePicker(false); if (t) {setReportingTime(t); setValue('reportingTime', toAPITime(t));}}} />}

        <Controller control={control} name="from" render={({field: {onChange, value}}) => (
          <CityDropdown label="From" required open={fromOpen} setOpen={setFromOpen} value={value}
            onChange={onChange} cities={cities} onCityAdded={addCity}
            zIndex={4000} error={errors.from?.message} />
        )} />

        <Controller control={control} name="to" render={({field: {onChange, value}}) => (
          <CityDropdown label="To" required open={toOpen} setOpen={setToOpen} value={value}
            onChange={onChange} cities={cities} onCityAdded={addCity}
            zIndex={3000} error={errors.to?.message} />
        )} />

        <Controller control={control} name="airline" render={({field: {onChange, value}}) => (
          <AppInput label="Airline Code" value={value} onChangeText={onChange} placeholder="e.g. 6E, AI, UK" autoCapitalize="characters" error={errors.airline?.message} />
        )} />
        <Controller control={control} name="flightNo" render={({field: {onChange, value}}) => (
          <AppInput label="Flight No" value={value} onChangeText={onChange} placeholder="e.g. 6802" autoCapitalize="characters" error={errors.flightNo?.message} />
        )} />
        <Controller control={control} name="pnrNo" render={({field: {onChange, value}}) => (
          <AppInput label="PNR No" value={value} onChangeText={onChange} placeholder="e.g. ABC123" autoCapitalize="characters" error={errors.pnrNo?.message} />
        )} />

        <Text style={styles.lbl}>Flight Time</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFlightTimePicker(true)}>
          <Text style={styles.dateBtnText}>{moment(flightTime).format('HH:mm')}</Text>
        </TouchableOpacity>
        {showFlightTimePicker && <DateTimePicker value={flightTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, t) => {setShowFlightTimePicker(false); if (t) {setFlightTime(t); setValue('flightTime', toAPITime(t));}}} />}

        <Text style={styles.lbl}>Arrival / Departure</Text>
        <Controller control={control} name="arrivalDeparture" render={({field: {onChange, value}}) => (
          <DropDownPicker open={arrDepOpen} setOpen={setArrDepOpen} value={value} setValue={cb => onChange(cb(value))} items={ARRIVAL_DEPARTURE} placeholder="Select" style={styles.dropdown} dropDownContainerStyle={styles.dropdownList} zIndex={2000} listMode="SCROLLVIEW" />
        )} />
        {errors.arrivalDeparture && <Text style={styles.err}>{errors.arrivalDeparture.message}</Text>}

        <Controller control={control} name="noOfPassengers" render={({field: {onChange, value}}) => (
          <AppInput
            label="No. of Passengers"
            value={String(value ?? '')}
            onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="1"
            error={errors.noOfPassengers?.message}
          />
        )} />

        <Text style={styles.lbl}>Airport</Text>
        <Controller control={control} name="airportId" render={({field: {value}}) => (
          <DropDownPicker open={airportOpen} setOpen={setAirportOpen} value={value}
            setValue={cb => handleAirportChange(cb(value))}
            items={airports.filter(a => a.isActive).map(a => ({label: `${a.name} (${a.code})`, value: a.id}))}
            placeholder="Select Airport" style={styles.dropdown} dropDownContainerStyle={styles.dropdownList} zIndex={1400} listMode="SCROLLVIEW" />
        )} />
        {errors.airportId && <Text style={styles.err}>{errors.airportId.message}</Text>}

        <Text style={styles.lbl}>Terminal</Text>
        <Controller control={control} name="terminalId" render={({field: {onChange, value}}) => (
          <DropDownPicker open={terminalOpen} setOpen={setTerminalOpen} value={value}
            setValue={cb => {
              const tId = cb(value);
              const terminal = terminals.find(t => t.id === tId);
              onChange(tId);
              setValue('terminalName', terminal?.name || '');
            }}
            items={terminals.filter(t => t.isActive).map(t => ({label: `${t.name} (${t.code})`, value: t.id}))}
            placeholder={terminals.length === 0 ? 'Select airport first' : 'Select Terminal'}
            disabled={terminals.length === 0}
            style={[styles.dropdown, terminals.length === 0 && styles.dropdownDisabled]}
            dropDownContainerStyle={styles.dropdownList} zIndex={1300} listMode="SCROLLVIEW" />
        )} />
        {errors.terminalId && <Text style={styles.err}>{errors.terminalId.message}</Text>}

        {/* ── Remark / Details ── */}
        <Controller control={control} name="remark" render={({field: {onChange, value}}) => (
          <AppInput label="Remark / Details" value={value} onChangeText={onChange}
            placeholder="Add remark or details" multiline numberOfLines={3}
            style={{height: 80, textAlignVertical: 'top'}} />
        )} />

        {/* ── PDF Attachment ── */}
        <View style={styles.optionalRow}>
          <Text style={styles.sectionLabel}>PDF Attachment</Text>
          <Text style={styles.optionalTag}>Optional</Text>
        </View>
        {pdfData ? (
          <View style={styles.pdfAttached}>
            <Text style={styles.pdfName} numberOfLines={1}>📎 {pdfData.filename}</Text>
            <TouchableOpacity onPress={() => setPdfPreviewVisible(true)} style={styles.pdfViewBtn}>
              <Text style={styles.pdfViewText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPdfData(null)} style={styles.pdfRemoveBtn}>
              <Text style={styles.pdfRemoveText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addOptBtn} onPress={handleAttachOptions}>
            <Text style={styles.addOptBtnText}>📎 Attach PDF / Photo</Text>
          </TouchableOpacity>
        )}

        <PdfViewerModal
          visible={pdfPreviewVisible}
          filename={pdfData?.filename}
          localBase64={pdfData?.data}
          localMimeType={pdfData?.mimeType}
          onClose={() => setPdfPreviewVisible(false)}
        />
        <AppButton title="Submit Duty" onPress={handleSubmit(onSubmit, onFormError)} loading={isSubmitting} style={styles.btn} />
      </ScrollView>

      <WhatsAppMessageModal
        visible={msgVisible}
        duty={createdDuty}
        senderName={user?.name || ''}
        senderPhone={user?.phone || ''}
        subordinatePhone={user?.phone || ''}
        onClose={handleModalClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 20, fontWeight: '700', color: colors.text},
  scanHeaderBtn: {backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + '40'},
  scanHeaderText: {fontSize: 13, color: colors.primary, fontWeight: '600'},
  chainBadge: {backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#F59E0B'},
  chainBadgeArrival: {backgroundColor: '#F0FDF4', borderColor: '#16A34A'},
  chainBadgeText: {fontSize: 12, color: '#92400E', fontWeight: '700'},
  content: {padding: 16, paddingBottom: 40},
  lbl: {fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 5, marginTop: 8},
  row: {flexDirection: 'row', gap: 10, marginBottom: 8},
  triRow: {flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 4},
  triColDate: {flex: 5},
  triColDay: {flex: 3},
  triColType: {flex: 5},
  dateBtn: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.surface, marginBottom: 8},
  dateBtnCompact: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 11, backgroundColor: colors.surface, marginBottom: 8},
  dateBtnText: {fontSize: 15, color: colors.text},
  dateBtnCompactText: {fontSize: 13, color: colors.text},
  dayBox: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 11, backgroundColor: colors.background, justifyContent: 'center', marginBottom: 8},
  dayText: {fontSize: 14, color: colors.textSecondary},
  dropdown: {borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 4},
  dropdownDisabled: {backgroundColor: colors.background, opacity: 0.6},
  dropdownList: {borderColor: colors.border},
  err: {fontSize: 11, color: colors.error, marginBottom: 8},
  pdfAttached: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#93C5FD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#EFF6FF', marginBottom: 8},
  pdfName: {fontSize: 13, color: '#1D4ED8', flex: 1, marginRight: 8},
  pdfViewBtn: {paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primary + '15', borderRadius: 6, marginRight: 6},
  pdfViewText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
  pdfRemoveBtn: {paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.error + '15', borderRadius: 6},
  pdfRemoveText: {fontSize: 12, color: colors.error, fontWeight: '600'},
  readOnly: {backgroundColor: '#F3F4F6'},
  btn: {marginTop: 16},
});

export default OfficerCreateDutyScreen;
