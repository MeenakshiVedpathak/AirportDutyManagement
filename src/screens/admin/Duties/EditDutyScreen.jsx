import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import {dutySchema} from '../../../utils/validationSchemas';
import {useDuties} from '../../../hooks/useDuties';
import {fetchAirportsStart, fetchAirportsSuccess, setTerminals} from '../../../store/slices/airportSlice';
import {getAirports, getTerminals} from '../../../api/airportApi';
import {NativeModules} from 'react-native';
import PdfViewerModal from '../../../components/common/PdfViewerModal';
import {launchCamera} from 'react-native-image-picker';
const {FilePicker} = NativeModules;
import AppInput from '../../../components/common/AppInput';
import AppButton from '../../../components/common/AppButton';
import AutocompleteInput from '../../../components/common/AutocompleteInput';
import CityDropdown from '../../../components/common/CityDropdown';
import {colors} from '../../../theme/colors';
import {OFFICE_TYPES, ARRIVAL_DEPARTURE} from '../../../constants/dutyFormFields';
import {getDayFromDate, toAPIDate, toAPITime} from '../../../utils/dateUtils';
import {useCities} from '../../../hooks/useCities';
import moment from 'moment';

const EditDutyScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {selectedDuty: duty, editDuty, uploadPdf} = useDuties();
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

  useEffect(() => {
    dispatch(fetchAirportsStart());
    getAirports()
      .then(res => dispatch(fetchAirportsSuccess(res.data)))
      .catch(() => {});
    if (duty?.airportId) {
      getTerminals(duty.airportId)
        .then(res => dispatch(setTerminals(res.data)))
        .catch(() => dispatch(setTerminals([])));
    } else {
      dispatch(setTerminals([]));
    }
  }, []);

  const parseTime = t => {
    if (!t) return new Date();
    const d = moment(t, 'HH:mm');
    return d.isValid() ? d.toDate() : new Date();
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReportingTimePicker, setShowReportingTimePicker] = useState(false);
  const [showFlightTimePicker, setShowFlightTimePicker] = useState(false);
  const [showGuestArrivalPicker, setShowGuestArrivalPicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState(duty?.date ? new Date(duty.date) : new Date());
  const [flightTime, setFlightTime] = useState(parseTime(duty?.flightTime));
  const [reportingTime, setReportingTime] = useState(parseTime(duty?.reportingTime));
  const [guestArrivalTime, setGuestArrivalTime] = useState(parseTime(duty?.guestArrivalTime));
  const [hasGuestArrivalTime, setHasGuestArrivalTime] = useState(!!duty?.guestArrivalTime);

  const [pdfData, setPdfData] = useState(null);
  const [pdfVisible, setPdfVisible] = useState(false);

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

  const handleViewExistingPdf = () => {
    if (!duty?.pdfAttachment?.hasFile) { Alert.alert('Error', 'No PDF attached.'); return; }
    setPdfVisible(true);
  };

  const handleAttachOptions = () => {
    Alert.alert('Attach File', 'Choose an option', [
      {text: 'Pick PDF', onPress: handlePickPdf},
      {text: 'Capture Photo', onPress: handleCapturePhoto},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const [officerOpen, setOfficerOpen] = useState(false);
  const [officeTypeOpen, setOfficeTypeOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [arrDepOpen, setArrDepOpen] = useState(false);
  const [airportOpen, setAirportOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

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

  const {control, handleSubmit, setValue, watch, formState: {errors, isSubmitting}} = useForm({
    resolver: dutyResolver,
    defaultValues: {
      travellerName: duty?.travellerName || '',
      travellerDesignation: duty?.travellerDesignation || '',
      travellerPhone: duty?.travellerPhone || '',
      airportAuthorityPhone: duty?.airportAuthorityPhone || '',
      date: duty?.date || toAPIDate(new Date()),
      reportingTime: duty?.reportingTime || toAPITime(new Date()),
      guestArrivalTime: duty?.guestArrivalTime || null,
      officeType: duty?.officeType || '',
      from: duty?.from || '',
      to: duty?.to || '',
      airline: duty?.airline || '',
      flightNo: duty?.flightNo || '',
      pnrNo: duty?.pnrNo || '',
      flightTime: duty?.flightTime || toAPITime(new Date()),
      arrivalDeparture: duty?.arrivalDeparture || 'DEPARTURE',
      airportId: duty?.airportId || '',
      airportName: duty?.airportName || '',
      terminalId: duty?.terminalId || '',
      terminalName: duty?.terminalName || '',
      noOfPassengers: duty?.noOfPassengers?.toString() || '1',
      remark: duty?.remark || '',
    },
  });

  const dateValue = watch('date');
  const arrivalDepartureValue = watch('arrivalDeparture');
  const dayValue = dateValue ? getDayFromDate(dateValue) : '';

  const onFormError = errs => {
    const msgs = Object.entries(errs).map(([k, v]) => `${k}: ${v.message}`).join('\n');
    Alert.alert('Please fix these fields', msgs);
  };

  const onSubmit = async data => {
    try {
      const payload = {...data};
      if (!hasGuestArrivalTime) delete payload.guestArrivalTime;
      const result = await editDuty(duty.id, payload);
      if (!result) {
        Alert.alert('Save Failed', 'Could not save changes. Check your connection and try again.');
        return;
      }
      if (pdfData) {
        await uploadPdf(result.id, pdfData.filename, pdfData.data, pdfData.mimeType);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unexpected Error', e?.message || 'Something went wrong. Please try again.');
    }
  };

  if (!duty) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Edit Duty</Text>
        <View style={{width: 60}} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>

        {/* ── 1. Date, Day & Office Type ── */}
        <View style={styles.triRow}>
          <View style={styles.triColDate}>
            <Text style={styles.sectionLabel}>Date <Text style={styles.requiredStar}>*</Text></Text>
            <TouchableOpacity style={styles.dateBtnCompact} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateBtnCompactText}>{moment(selectedDate).format('DD MMM YYYY')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.triColDay}>
            <Text style={styles.sectionLabel}>Day</Text>
            <View style={styles.dayBox}><Text style={styles.dayText}>{dayValue}</Text></View>
          </View>
          <View style={[styles.triColType, {zIndex: 9500}]}>
            <Text style={styles.sectionLabel}>Type <Text style={styles.requiredStar}>*</Text></Text>
            <Controller control={control} name="officeType" render={({field: {onChange, value}}) => (
              <DropDownPicker open={officeTypeOpen} setOpen={setOfficeTypeOpen} value={value} setValue={cb => onChange(cb(value))}
                items={OFFICE_TYPES} placeholder="Select" style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList} zIndex={9500} listMode="SCROLLVIEW" />
            )} />
            {errors.officeType && <Text style={styles.err}>{errors.officeType.message}</Text>}
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowDatePicker(false); if (d) { setSelectedDate(d); setValue('date', toAPIDate(d)); } }} />
        )}

        {/* ── 2. Arrival / Departure ── */}
        <Text style={styles.sectionLabel}>Arrival / Departure <Text style={styles.requiredStar}>*</Text></Text>
        <Controller control={control} name="arrivalDeparture" render={({field: {onChange, value}}) => (
          <DropDownPicker open={arrDepOpen} setOpen={setArrDepOpen} value={value} setValue={cb => onChange(cb(value))}
            items={ARRIVAL_DEPARTURE} placeholder="Select Arrival/Departure" style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList} zIndex={9000} listMode="SCROLLVIEW" />
        )} />
        {errors.arrivalDeparture && <Text style={styles.err}>{errors.arrivalDeparture.message}</Text>}

        {/* ── 3. Airport ── */}
        <Text style={styles.sectionLabel}>Airport <Text style={styles.requiredStar}>*</Text></Text>
        <Controller control={control} name="airportId" render={({field: {value}}) => (
          <DropDownPicker open={airportOpen} setOpen={setAirportOpen} value={value}
            setValue={cb => handleAirportChange(cb(value))}
            items={airports.filter(a => a.isActive).map(a => ({label: `${a.name} (${a.code})`, value: a.id}))}
            placeholder="Select Airport" style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList} zIndex={8000} listMode="SCROLLVIEW" />
        )} />
        {errors.airportId && <Text style={styles.err}>{errors.airportId.message}</Text>}

        {/* ── 4. Terminal ── */}
        <Text style={styles.sectionLabel}>Terminal <Text style={styles.requiredStar}>*</Text></Text>
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
            dropDownContainerStyle={styles.dropdownList} zIndex={7000} listMode="SCROLLVIEW" />
        )} />
        {errors.terminalId && <Text style={styles.err}>{errors.terminalId.message}</Text>}

        {/* ── 5. Flight Time ── */}
        <Text style={styles.sectionLabel}>Flight Time <Text style={styles.requiredStar}>*</Text></Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFlightTimePicker(true)}>
          <Text style={styles.dateBtnText}>{moment(flightTime).format('HH:mm')}</Text>
        </TouchableOpacity>
        {showFlightTimePicker && (
          <DateTimePicker value={flightTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, t) => { setShowFlightTimePicker(false); if (t) { setFlightTime(t); setValue('flightTime', toAPITime(t)); } }} />
        )}
        {errors.flightTime && <Text style={styles.err}>{errors.flightTime.message}</Text>}

        {/* ── 6. Airline + Flight No ── */}
        <Controller control={control} name="airline" render={({field: {onChange, value}}) => (
          <AppInput label="Airline Code" value={value} onChangeText={onChange}
            placeholder="e.g. 6E, AI, UK" autoCapitalize="characters" error={errors.airline?.message} />
        )} />
        <Controller control={control} name="flightNo" render={({field: {onChange, value}}) => (
          <AppInput required label="Flight Number" value={value} onChangeText={onChange}
            placeholder="e.g. 6802" autoCapitalize="characters" error={errors.flightNo?.message} />
        )} />
        <Controller control={control} name="pnrNo" render={({field: {onChange, value}}) => (
          <AppInput label="PNR No" value={value} onChangeText={onChange}
            placeholder="e.g. ABC123" autoCapitalize="characters" error={errors.pnrNo?.message} />
        )} />

        {/* ── 7. Name of Traveller ── */}
        <Controller control={control} name="travellerName" render={({field: {onChange, value}}) => (
          <AutocompleteInput
            label="Name of Traveller"
            value={value}
            onChangeText={v => onChange(v.toUpperCase())}
            onSelect={name => {
              const upper = name.toUpperCase();
              onChange(upper);
              if (nameToDesignation[name]) setValue('travellerDesignation', nameToDesignation[name]);
            }}
            suggestions={pastNames}
            placeholder="Enter traveller's full name"
            error={errors.travellerName?.message}
          />
        )} />

        {/* ── 8. Designation ── */}
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

        {/* ── 9. Contact No. of Traveller ── */}
        <Controller control={control} name="travellerPhone" render={({field: {onChange, value}}) => (
          <AppInput label="Contact No." value={value}
            onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))}
            placeholder="10-digit mobile number" keyboardType="phone-pad"
            maxLength={10}
            error={errors.travellerPhone?.message} />
        )} />


        {/* ── 9. From ── */}
        <Controller control={control} name="from" render={({field: {onChange, value}}) => (
          <CityDropdown label="From" required open={fromOpen} setOpen={setFromOpen} value={value}
            onChange={onChange} cities={cities} onCityAdded={addCity}
            zIndex={6000} error={errors.from?.message} />
        )} />

        {/* ── 10. To ── */}
        <Controller control={control} name="to" render={({field: {onChange, value}}) => (
          <CityDropdown label="To" required open={toOpen} setOpen={setToOpen} value={value}
            onChange={onChange} cities={cities} onCityAdded={addCity}
            zIndex={5000} error={errors.to?.message} />
        )} />

        {/* ── 11. Reporting Time ── */}
        <Text style={styles.sectionLabel}>
          Reporting Time at Airport <Text style={styles.requiredStar}>*</Text>
          <Text style={styles.autoHint}>
            {arrivalDepartureValue === 'ARRIVAL' ? '  (1 hr before flight)' : '  (2 hrs before flight)'}
          </Text>
        </Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowReportingTimePicker(true)}>
          <Text style={styles.dateBtnText}>{moment(reportingTime).format('HH:mm')}</Text>
        </TouchableOpacity>
        {showReportingTimePicker && (
          <DateTimePicker value={reportingTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, t) => { setShowReportingTimePicker(false); if (t) { setReportingTime(t); setValue('reportingTime', toAPITime(t)); } }} />
        )}
        {errors.reportingTime && <Text style={styles.err}>{errors.reportingTime.message}</Text>}

        {/* ── 12. Guest Arrival Time (optional) ── */}
        <View style={styles.optionalRow}>
          <Text style={styles.sectionLabel}>Guest Arrival Time</Text>
          <Text style={styles.optionalTag}>Optional</Text>
        </View>
        {hasGuestArrivalTime ? (
          <View style={styles.row}>
            <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowGuestArrivalPicker(true)}>
              <Text style={styles.dateBtnText}>{moment(guestArrivalTime).format('HH:mm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setHasGuestArrivalTime(false); setValue('guestArrivalTime', null); }} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕ Clear</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addOptBtn} onPress={() => setHasGuestArrivalTime(true)}>
            <Text style={styles.addOptBtnText}>+ Set Guest Arrival Time</Text>
          </TouchableOpacity>
        )}
        {showGuestArrivalPicker && (
          <DateTimePicker value={guestArrivalTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, t) => { setShowGuestArrivalPicker(false); if (t) { setGuestArrivalTime(t); setValue('guestArrivalTime', toAPITime(t)); } }} />
        )}

        {/* ── 14. No. of Passengers ── */}
        <Controller control={control} name="noOfPassengers" render={({field: {onChange, value}}) => (
          <AppInput required label="No. of Passengers" value={String(value ?? '')}
            onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric" placeholder="1" error={errors.noOfPassengers?.message} />
        )} />

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
            <TouchableOpacity onPress={() => setPdfData(null)} style={styles.pdfRemoveBtn}>
              <Text style={styles.pdfRemoveText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : duty?.pdfAttachment?.hasFile ? (
          <View style={styles.pdfAttached}>
            <Text style={styles.pdfName} numberOfLines={1}>📎 {duty.pdfAttachment.filename || 'Attached PDF'}</Text>
            <View style={styles.pdfBtnRow}>
              <TouchableOpacity onPress={handleViewExistingPdf} style={styles.pdfViewBtn}>
                <Text style={styles.pdfViewText}>👁 View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAttachOptions} style={styles.pdfReplaceBtn}>
                <Text style={styles.pdfReplaceText}>↺ Replace</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addOptBtn} onPress={handleAttachOptions}>
            <Text style={styles.addOptBtnText}>📎 Attach PDF / Photo</Text>
          </TouchableOpacity>
        )}

        <AppButton title="Save Changes" onPress={handleSubmit(onSubmit, onFormError)} loading={isSubmitting} style={styles.btn} />
      </ScrollView>

      <PdfViewerModal
        visible={pdfVisible}
        dutyId={duty?.id}
        filename={duty?.pdfAttachment?.filename}
        mimeType={duty?.pdfAttachment?.mimeType}
        onClose={() => setPdfVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  back: {color: colors.primary, fontSize: 15},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  content: {padding: 16, paddingBottom: 40},
  sectionLabel: {fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 5, marginTop: 8},
  requiredStar: {color: colors.error, fontWeight: '700'},
  autoHint: {fontSize: 11, color: colors.primary, fontStyle: 'italic'},
  optionalRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 5},
  optionalTag: {fontSize: 10, color: colors.white, backgroundColor: colors.textSecondary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2},
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
  addOptBtn: {borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.primary + '08', marginBottom: 8, alignItems: 'center'},
  addOptBtnText: {fontSize: 14, color: colors.primary, fontWeight: '500'},
  clearBtn: {borderWidth: 1.5, borderColor: colors.error + '60', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.error + '08', marginBottom: 8, justifyContent: 'center'},
  clearBtnText: {fontSize: 13, color: colors.error},
  dropdown: {borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 4},
  dropdownDisabled: {backgroundColor: colors.background, opacity: 0.6},
  dropdownList: {borderColor: colors.border},
  err: {fontSize: 11, color: colors.error, marginBottom: 8},
  btn: {marginTop: 16},
  pdfAttached: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#93C5FD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#EFF6FF', marginBottom: 8},
  pdfName: {fontSize: 13, color: '#1D4ED8', flex: 1, marginRight: 8},
  pdfRemoveBtn: {paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.error + '15', borderRadius: 6},
  pdfRemoveText: {fontSize: 12, color: colors.error, fontWeight: '600'},
  pdfBtnRow: {flexDirection: 'row', gap: 6},
  pdfViewBtn: {paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#10B981' + '20', borderRadius: 6},
  pdfViewText: {fontSize: 12, color: '#059669', fontWeight: '600'},
  pdfReplaceBtn: {paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primary + '15', borderRadius: 6},
  pdfReplaceText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
});

export default EditDutyScreen;
