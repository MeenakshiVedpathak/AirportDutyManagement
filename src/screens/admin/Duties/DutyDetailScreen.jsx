import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useDuties} from '../../../hooks/useDuties';
import StatusBadge from '../../../components/common/StatusBadge';
import {STATUS_DESCRIPTIONS} from '../../../constants/dutyStatus';
import DutyStatusUpdater from '../../../components/officer/DutyStatusUpdater';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import WhatsAppMessageModal from '../../../components/common/WhatsAppMessageModal';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import {formatDate, formatTime} from '../../../utils/dateUtils';
import {isIncentiveEligible} from '../../../utils/incentiveUtils';

const Row = ({label, value}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const AdminDutyDetailScreen = () => {
  const navigation = useNavigation();
  const {params: {dutyId}} = useRoute();
  const {selectedDuty: duty, fetchDuty, changeStatus, isLoading} = useDuties();
  const [updating, setUpdating] = useState(false);
  const [msgModalVisible, setMsgModalVisible] = useState(false);

  const user = useSelector(state => state.auth.user);

  useEffect(() => {fetchDuty(dutyId);}, [dutyId]);

  const handleStatusUpdate = async status => {
    setUpdating(true);
    await changeStatus(dutyId, status);
    await fetchDuty(dutyId);
    setUpdating(false);
  };

  if (!duty) return <LoadingOverlay visible={isLoading} />;

  const confirmed = !!duty.officerConfirmed;

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
              <Text style={styles.officerName}>{duty.officerName || 'Unassigned'}</Text>
            </View>
            <StatusBadge status={duty.status} />
          </View>
          <Text style={styles.statusDesc}>{STATUS_DESCRIPTIONS[duty.status]}</Text>
          {isIncentiveEligible(duty.officeType) && (
            <View style={styles.incentiveBadge}><Text style={styles.incentiveText}>₹500 Incentive Eligible</Text></View>
          )}

          {/* Officer confirmation badge */}
          <View style={[styles.confirmBadge, confirmed ? styles.confirmBadgeYes : styles.confirmBadgeNo]}>
            <Text style={[styles.confirmBadgeText, confirmed ? styles.confirmBadgeTextYes : styles.confirmBadgeTextNo]}>
              {confirmed ? '✓ Officer Confirmed' : '⏳ Awaiting Officer Confirmation'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duty Information</Text>
          <Row label="Date" value={formatDate(duty.date)} />
          <Row label="Day" value={duty.day} />
          <Row label="Office Type" value={duty.officeType?.replace('_', ' ')} />
          <Row label="Reporting Time" value={formatTime(duty.reportingTime)} />
          <Row label="Airport" value={duty.airport} />
          <Row label="Arrival/Departure" value={duty.arrivalDeparture} />
          {duty.guestArrivalTime ? <Row label="Guest Arrival Time" value={formatTime(duty.guestArrivalTime)} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>
          <Row label="Flight No" value={duty.flightNo} />
          <Row label="Flight Time" value={formatTime(duty.flightTime)} />
          <Row label="From" value={duty.from} />
          <Row label="To" value={duty.to} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subordinate Details</Text>
          <Row label="Name" value={duty.officerName} />
          <Row label="Passengers" value={duty.noOfPassengers?.toString()} />
        </View>

        {/* Send Messages button — available once officer confirms */}
        {confirmed && (
          <TouchableOpacity style={styles.msgBtn} onPress={() => setMsgModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.msgBtnText}>📤  Send Messages</Text>
          </TouchableOpacity>
        )}

        <DutyStatusUpdater
          duty={duty}
          onUpdate={handleStatusUpdate}
          loading={updating}
        />
      </ScrollView>

      <WhatsAppMessageModal
        visible={msgModalVisible}
        duty={duty}
        senderName={user?.name || ''}
        senderPhone={user?.phone || ''}
        subordinatePhone={duty?.officerPhone || ''}
        onClose={() => setMsgModalVisible(false)}
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
  card: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, ...shadows.sm},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  srNo: {fontSize: 12, color: colors.textSecondary},
  officerName: {fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2},
  incentiveBadge: {backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 10},
  incentiveText: {fontSize: 12, fontWeight: '600', color: '#92400E'},
  statusDesc: {fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 17},
  confirmBadge: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 10,
  },
  confirmBadgeYes: {backgroundColor: '#DCFCE7'},
  confirmBadgeNo: {backgroundColor: '#FEF9C3'},
  confirmBadgeText: {fontSize: 12, fontWeight: '700'},
  confirmBadgeTextYes: {color: '#16A34A'},
  confirmBadgeTextNo: {color: '#92400E'},
  section: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, ...shadows.sm},
  sectionTitle: {fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12},
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider},
  rowLabel: {fontSize: 13, color: colors.textSecondary},
  rowValue: {fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right'},
  msgBtn: {
    backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginBottom: 12, ...shadows.sm,
  },
  msgBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},
});

export default AdminDutyDetailScreen;
