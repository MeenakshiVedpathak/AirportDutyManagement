import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDuties} from '../../../hooks/useDuties';
import StatusBadge from '../../../components/common/StatusBadge';
import {STATUS_DESCRIPTIONS, DUTY_STATUS} from '../../../constants/dutyStatus';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import {formatDate, formatTime} from '../../../utils/dateUtils';

const Row = ({label, value}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const OfficerDutyDetailScreen = () => {
  const navigation = useNavigation();
  const {params: {dutyId}} = useRoute();
  const {user} = useSelector(state => state.auth);
  const {selectedDuty: duty, fetchDuty, confirmDuty, claimDuty, releaseDuty, changeStatus, isLoading} = useDuties();
  const [acting, setActing] = useState(false);

  useEffect(() => {fetchDuty(dutyId);}, [dutyId]);

  if (!duty) return <LoadingOverlay visible={isLoading} />;

  const myId = user?.id || user?._id;
  const isMine = duty.officerId && (duty.officerId === myId || duty.officerId?.toString() === myId);
  const isAvailable = !duty.officerId;
  const isOtherOfficer = !!duty.officerId && !isMine;

  const handleClaim = () => {
    Alert.alert('Claim Duty', 'Take this duty?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Yes, Claim It', onPress: async () => {
        setActing(true);
        await claimDuty(dutyId);
        await fetchDuty(dutyId);
        setActing(false);
      }},
    ]);
  };

  const handleRelease = () => {
    Alert.alert('Release Duty', 'Release this duty so others can take it?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Release', style: 'destructive', onPress: async () => {
        setActing(true);
        await releaseDuty(dutyId);
        setActing(false);
        navigation.navigate('MyDuties', {screen: 'MyDutiesList'});
      }},
    ]);
  };

  const handleConfirm = () => {
    Alert.alert('Confirm Duty', 'Confirm you will do this duty?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Yes, Confirm', onPress: async () => {
        setActing(true);
        await confirmDuty(dutyId);
        await fetchDuty(dutyId);
        setActing(false);
      }},
    ]);
  };

  const handleComplete = () => {
    Alert.alert('Complete Duty', 'Mark this duty as completed?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Mark Completed', onPress: async () => {
        setActing(true);
        await changeStatus(dutyId, DUTY_STATUS.COMPLETED);
        await fetchDuty(dutyId);
        setActing(false);
      }},
    ]);
  };

  const handleCancelDuty = () => {
    Alert.alert('Cancel Duty', 'Mark this duty as cancelled?', [
      {text: 'No', style: 'cancel'},
      {text: 'Yes, Cancel It', style: 'destructive', onPress: async () => {
        setActing(true);
        await changeStatus(dutyId, DUTY_STATUS.CANCELLED);
        await fetchDuty(dutyId);
        setActing(false);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Duty Detail</Text>
        <View style={{width: 60}} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.srNo}>SR #{duty.srNo || duty.id}</Text>
              <Text style={styles.flightNo}>{duty.flightNo || '—'}</Text>
            </View>
            <StatusBadge status={duty.status} />
          </View>
          <Text style={styles.statusDesc}>{STATUS_DESCRIPTIONS[duty.status]}</Text>

          {/* Assignment state badge */}
          {isAvailable && (
            <View style={[styles.assignBadge, styles.availableBadge]}>
              <Text style={styles.availableText}>Available — not yet claimed</Text>
            </View>
          )}
          {isMine && (
            <View style={[styles.assignBadge, styles.mineBadge]}>
              <Text style={styles.mineText}>This duty is yours</Text>
            </View>
          )}
          {isOtherOfficer && (
            <View style={[styles.assignBadge, styles.otherBadge]}>
              <Text style={styles.otherText}>Taken by {duty.officerName}</Text>
            </View>
          )}


        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duty Information</Text>
          <Row label="Date" value={formatDate(duty.date)} />
          <Row label="Day" value={duty.day} />
          <Row label="Arrival / Departure" value={duty.arrivalDeparture} />
          <Row label="Holiday / Office Time" value={duty.officeType?.replace(/_/g, ' ')} />
          <Row label="Reporting Time" value={formatTime(duty.reportingTime)} />
          <Row label="Airport" value={duty.airportName || duty.airport} />
          <Row label="Terminal" value={duty.terminalName} />
          {duty.guestArrivalTime ? <Row label="Guest Arrival Time" value={formatTime(duty.guestArrivalTime)} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>
          <Row label="Flight No" value={duty.flightNo} />
          <Row label="Flight Time" value={formatTime(duty.flightTime)} />
          <Row label="From" value={duty.from} />
          <Row label="To" value={duty.to} />
          <Row label="Passengers" value={duty.noOfPassengers?.toString()} />
        </View>

        {(duty.travellerName || duty.travellerPhone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traveller Details</Text>
            {duty.travellerName ? <Row label="Name of Traveller" value={duty.travellerName} /> : null}
            {duty.travellerPhone ? <Row label="Mobile No." value={duty.travellerPhone} /> : null}
          </View>
        )}

        {/* Action area */}
        {isAvailable && (
          <TouchableOpacity
            style={[styles.claimBtn, acting && styles.btnDisabled]}
            onPress={handleClaim} disabled={acting} activeOpacity={0.8}>
            {acting
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.claimBtnText}>＋  Claim This Duty</Text>}
          </TouchableOpacity>
        )}

        {isMine && duty.status === DUTY_STATUS.UPCOMING && !duty.officerConfirmed && (
          <>
            <TouchableOpacity
              style={[styles.confirmBtn, acting && styles.btnDisabled]}
              onPress={handleConfirm} disabled={acting} activeOpacity={0.8}>
              {acting
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.confirmBtnText}>✓  OK — I'll Do This Duty</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.releaseBtn} onPress={handleRelease} disabled={acting}>
              <Text style={styles.releaseBtnText}>Release Duty</Text>
            </TouchableOpacity>
          </>
        )}

        {isMine && duty.status === DUTY_STATUS.UPCOMING && duty.officerConfirmed && (
          <>
            <View style={styles.confirmedBox}>
              <Text style={styles.confirmedIcon}>✓</Text>
              <Text style={styles.confirmedText}>You have confirmed this duty</Text>
            </View>
            <TouchableOpacity
              style={[styles.scanCompleteBtn, acting && styles.btnDisabled]}
              onPress={() => navigation.navigate('ScanToComplete', {dutyId, flightNo: duty.flightNo, travellerName: duty.travellerName || ''})}
              disabled={acting} activeOpacity={0.8}>
              <Text style={styles.scanCompleteBtnText}>📷  Scan Boarding Pass & Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, acting && styles.btnDisabled]}
              onPress={handleComplete} disabled={acting} activeOpacity={0.8}>
              {acting
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.completeBtnText}>✅  Complete Without Scan</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelDutyBtn, acting && styles.btnDisabled]}
              onPress={handleCancelDuty} disabled={acting} activeOpacity={0.8}>
              <Text style={styles.cancelDutyBtnText}>✕  Mark as Cancelled</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.releaseBtn} onPress={handleRelease} disabled={acting}>
              <Text style={styles.releaseBtnText}>Release Duty</Text>
            </TouchableOpacity>
          </>
        )}

        {isMine && duty.status === DUTY_STATUS.COMPLETED && (
          <View style={styles.doneBanner}>
            <Text style={styles.doneBannerIcon}>✅</Text>
            <Text style={styles.doneBannerText}>Duty Completed</Text>
          </View>
        )}

        {isMine && duty.status === DUTY_STATUS.CANCELLED && (
          <View style={[styles.doneBanner, styles.cancelledBanner]}>
            <Text style={styles.doneBannerIcon}>✕</Text>
            <Text style={[styles.doneBannerText, styles.cancelledBannerText]}>Duty Cancelled</Text>
          </View>
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
  card: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, ...shadows.sm},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  srNo: {fontSize: 12, color: colors.textSecondary},
  flightNo: {fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2},
  statusDesc: {fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 17},
  assignBadge: {borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 10},
  availableBadge: {backgroundColor: '#DBEAFE'},
  availableText: {fontSize: 12, fontWeight: '700', color: '#1D4ED8'},
  mineBadge: {backgroundColor: '#DCFCE7'},
  mineText: {fontSize: 12, fontWeight: '700', color: '#16A34A'},
  otherBadge: {backgroundColor: '#FEE2E2'},
  otherText: {fontSize: 12, fontWeight: '700', color: '#DC2626'},

  section: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, ...shadows.sm},
  sectionTitle: {fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12},
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider},
  rowLabel: {fontSize: 13, color: colors.textSecondary},
  rowValue: {fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right'},

  claimBtn: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 10, ...shadows.sm},
  claimBtnText: {color: colors.white, fontSize: 16, fontWeight: '700'},
  confirmBtn: {backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 10, ...shadows.sm},
  confirmBtnText: {color: colors.white, fontSize: 16, fontWeight: '700'},
  releaseBtn: {borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  releaseBtnText: {color: '#DC2626', fontSize: 14, fontWeight: '700'},
  btnDisabled: {opacity: 0.6},

  confirmedBox: {
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1.5, borderColor: '#86EFAC',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8, marginBottom: 10,
  },
  confirmedIcon: {fontSize: 20, color: '#16A34A', fontWeight: '800'},
  confirmedText: {fontSize: 15, fontWeight: '700', color: '#16A34A'},

  scanCompleteBtn: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 10, ...shadows.sm},
  scanCompleteBtnText: {color: colors.white, fontSize: 16, fontWeight: '700'},
  completeBtn: {backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10, ...shadows.sm},
  completeBtnText: {color: colors.white, fontSize: 14, fontWeight: '600'},
  cancelDutyBtn: {borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  cancelDutyBtnText: {color: '#DC2626', fontSize: 14, fontWeight: '700'},

  doneBanner: {
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1.5, borderColor: '#86EFAC',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, gap: 10, marginBottom: 10,
  },
  cancelledBanner: {backgroundColor: '#FEF2F2', borderColor: '#FECACA'},
  doneBannerIcon: {fontSize: 22},
  doneBannerText: {fontSize: 17, fontWeight: '700', color: '#16A34A'},
  cancelledBannerText: {color: '#DC2626'},
});

export default OfficerDutyDetailScreen;
