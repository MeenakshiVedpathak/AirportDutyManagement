import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../../theme/colors';
import {shadows} from '../../theme/spacing';
import StatusBadge from './StatusBadge';
import {formatDate, formatTime} from '../../utils/dateUtils';

const claimBadge = duty => {
  if (!duty.officerId) return {label: 'Unclaimed', bg: '#F3F4F6', text: '#6B7280'};
  if (!duty.officerConfirmed)  return {label: '⏳ Awaiting Confirmation', bg: '#FEF9C3', text: '#92400E'};
  return {label: '✓ Confirmed', bg: '#DCFCE7', text: '#16A34A'};
};

const DutyCard = ({duty, onPress}) => {
  const badge = claimBadge(duty);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.srno}>SR #{duty.srNo || duty.id}</Text>
          <Text style={styles.officer}>{duty.officerName || duty.officer?.name || 'Unassigned'}</Text>
        </View>
        <StatusBadge status={duty.status} />
      </View>
      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <InfoItem label="Date" value={formatDate(duty.date)} />
        <InfoItem label="Report" value={duty.reportingTime ? formatTime(duty.reportingTime) : '—'} />
        <InfoItem label="Flight Time" value={duty.flightTime ? formatTime(duty.flightTime) : '—'} />
        <InfoItem label="A/D" value={duty.arrivalDeparture} />
      </View>
      <View style={styles.infoRow}>
        <InfoItem label="Flight" value={duty.airline ? `${duty.airline} ${duty.flightNo}`.trim() : duty.flightNo} />
        <InfoItem label="PNR" value={duty.pnrNo || '—'} />
        <InfoItem label="From" value={duty.from} />
        <InfoItem label="To" value={duty.to} />
      </View>
      <View style={styles.infoRow}>
        <InfoItem label="Airport" value={duty.airportName || duty.airport} />
        <InfoItem label="Terminal" value={duty.terminalName} />
      </View>
      {(duty.travellerName || duty.travellerDesignation) ? (
        <View style={styles.travellerRow}>
          <Text style={styles.travellerLabel}>Traveller</Text>
          <Text style={styles.travellerName}>
            {duty.travellerName || '—'}
            {duty.travellerDesignation ? `, ${duty.travellerDesignation}` : ''}
          </Text>
        </View>
      ) : null}
      <View style={[styles.claimBadge, {backgroundColor: badge.bg}]}>
        <Text style={[styles.claimText, {color: badge.text}]}>{badge.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const InfoItem = ({label, value}) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 10, ...shadows.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  flex: {flex: 1, marginRight: 8},
  srno: {fontSize: 11, color: colors.textSecondary, marginBottom: 2},
  officer: {fontSize: 15, fontWeight: '600', color: colors.text},
  divider: {height: 1, backgroundColor: colors.border, marginVertical: 10},
  infoRow: {flexDirection: 'row', marginBottom: 6},
  infoItem: {flex: 1},
  infoLabel: {fontSize: 11, color: colors.textSecondary},
  infoValue: {fontSize: 13, fontWeight: '500', color: colors.text, marginTop: 1},
  travellerRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6},
  travellerLabel: {fontSize: 11, color: colors.textSecondary},
  travellerName: {fontSize: 12, fontWeight: '600', color: colors.text, flex: 1, flexWrap: 'wrap'},
  claimBadge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4},
  claimText: {fontSize: 11, fontWeight: '600'},
});

export default DutyCard;
