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
import AppInput from '../../../components/common/AppInput';
import AppButton from '../../../components/common/AppButton';
import {colors} from '../../../theme/colors';
import {OFFICE_TYPES, ARRIVAL_DEPARTURE, CITIES} from '../../../constants/dutyFormFields';
import {getDayFromDate, toAPIDate, toAPITime} from '../../../utils/dateUtils';
import moment from 'moment';

const EditDutyScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {selectedDuty: duty, editDuty} = useDuties();
  const {list: airports, terminals} = useSelector(state => state.airports);

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
      travellerPhone: duty?.travellerPhone || '',
      date: duty?.date || toAPIDate(new Date()),
      reportingTime: duty?.reportingTime || toAPITime(new Date()),
      guestArrivalTime: duty?.guestArrivalTime || null,
      officeType: duty?.officeType || '',
      from: duty?.from || '',
      to: duty?.to || '',
      flightNo: duty?.flightNo || '',
      flightTime: duty?.flightTime || toAPITime(new Date()),
      arrivalDeparture: duty?.arrivalDeparture || 'DEPARTURE',
      airportId: duty?.airportId || '',
      airportName: duty?.airportName || '',
      terminalId: duty?.terminalId || '',
      terminalName: duty?.terminalName || '',
      noOfPassengers: duty?.noOfPassengers?.toString() || '1',
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

        {/* ── 1. Date & Day ── */}
        <Text style={styles.sectionLabel}>Date & Day <Text style={styles.requiredStar}>*</Text></Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.dateBtn, {flex: 2}]} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateBtnText}>{moment(selectedDate).format('DD MMM YYYY')}</Text>
          </TouchableOpacity>
          <View style={[styles.dayBox, {flex: 1}]}>
            <Text style={styles.dayText}>{dayValue}</Text>
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

        {/* ── 6. Flight No ── */}
        <Controller control={control} name="flightNo" render={({field: {onChange, value}}) => (
          <AppInput required label="Flight Number" value={value} onChangeText={onChange}
            placeholder="e.g. 6E 201" autoCapitalize="characters" error={errors.flightNo?.message} />
        )} />

        {/* ── 7. Name of Traveller ── */}
        <Controller control={control} name="travellerName" render={({field: {onChange, value}}) => (
          <AppInput label="Name of Traveller" value={value} onChangeText={onChange}
            placeholder="Enter traveller's full name" autoCapitalize="words"
            error={errors.travellerName?.message} />
        )} />

        {/* ── 8. Mobile No. of Traveller ── */}
        <Controller control={control} name="travellerPhone" render={({field: {onChange, value}}) => (
          <AppInput label="Mobile No. of Traveller" value={value} onChangeText={onChange}
            placeholder="10-digit mobile number" keyboardType="phone-pad"
            error={errors.travellerPhone?.message} />
        )} />

        {/* ── 9. From ── */}
        <Text style={styles.sectionLabel}>From <Text style={styles.requiredStar}>*</Text></Text>
        <Controller control={control} name="from" render={({field: {onChange, value}}) => (
          <DropDownPicker open={fromOpen} setOpen={setFromOpen} value={value} setValue={cb => onChange(cb(value))}
            items={CITIES.map(c => ({label: c, value: c}))} placeholder="Select From City" style={styles.dropdown} searchable
            dropDownContainerStyle={styles.dropdownList} zIndex={6000} listMode="SCROLLVIEW" />
        )} />
        {errors.from && <Text style={styles.err}>{errors.from.message}</Text>}

        {/* ── 10. To ── */}
        <Text style={styles.sectionLabel}>To <Text style={styles.requiredStar}>*</Text></Text>
        <Controller control={control} name="to" render={({field: {onChange, value}}) => (
          <DropDownPicker open={toOpen} setOpen={setToOpen} value={value} setValue={cb => onChange(cb(value))}
            items={CITIES.map(c => ({label: c, value: c}))} placeholder="Select To City" style={styles.dropdown} searchable
            dropDownContainerStyle={styles.dropdownList} zIndex={5000} listMode="SCROLLVIEW" />
        )} />
        {errors.to && <Text style={styles.err}>{errors.to.message}</Text>}

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

        {/* ── 13. Holiday / Office Time ── */}
        <Text style={styles.sectionLabel}>Holiday / Office Time <Text style={styles.requiredStar}>*</Text></Text>
        <Controller control={control} name="officeType" render={({field: {onChange, value}}) => (
          <DropDownPicker open={officeTypeOpen} setOpen={setOfficeTypeOpen} value={value} setValue={cb => onChange(cb(value))}
            items={OFFICE_TYPES} placeholder="Select Type" style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList} zIndex={3000} listMode="SCROLLVIEW" />
        )} />
        {errors.officeType && <Text style={styles.err}>{errors.officeType.message}</Text>}

        {/* ── 14. No. of Passengers ── */}
        <Controller control={control} name="noOfPassengers" render={({field: {onChange, value}}) => (
          <AppInput required label="No. of Passengers" value={String(value ?? '')}
            onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric" placeholder="1" error={errors.noOfPassengers?.message} />
        )} />

        <AppButton title="Save Changes" onPress={handleSubmit(onSubmit, onFormError)} loading={isSubmitting} style={styles.btn} />
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
  sectionLabel: {fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 5, marginTop: 8},
  requiredStar: {color: colors.error, fontWeight: '700'},
  autoHint: {fontSize: 11, color: colors.primary, fontStyle: 'italic'},
  optionalRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 5},
  optionalTag: {fontSize: 10, color: colors.white, backgroundColor: colors.textSecondary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2},
  row: {flexDirection: 'row', gap: 10, marginBottom: 8},
  dateBtn: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.surface, marginBottom: 8},
  dateBtnText: {fontSize: 15, color: colors.text},
  dayBox: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.background, justifyContent: 'center'},
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
});

export default EditDutyScreen;
