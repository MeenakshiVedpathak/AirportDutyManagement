import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {colors} from '../../theme/colors';
import {DUTY_STATUS} from '../../constants/dutyStatus';
import moment from 'moment';

const FilterChip = ({label, active, onPress}) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ReportFilterBar = ({filters, officers = [], onChange}) => {
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  return (
    <View style={styles.container}>

      {/* Date Range */}
      <Text style={styles.label}>Date Range</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFrom(true)}>
          <Text style={styles.dateBtnText}>
            {filters.dateFrom ? moment(filters.dateFrom).format('DD MMM YYYY') : 'From Date'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.dateSep}>—</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTo(true)}>
          <Text style={styles.dateBtnText}>
            {filters.dateTo ? moment(filters.dateTo).format('DD MMM YYYY') : 'To Date'}
          </Text>
        </TouchableOpacity>
        {(filters.dateFrom || filters.dateTo) && (
          <TouchableOpacity style={styles.clearDate} onPress={() => onChange({dateFrom: null, dateTo: null})}>
            <Text style={styles.clearDateText}>✕ Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showFrom && (
        <DateTimePicker
          value={filters.dateFrom ? new Date(filters.dateFrom) : new Date()}
          mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowFrom(false); if (d) onChange({dateFrom: moment(d).format('YYYY-MM-DD')}); }}
        />
      )}
      {showTo && (
        <DateTimePicker
          value={filters.dateTo ? new Date(filters.dateTo) : new Date()}
          mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTo(false); if (d) onChange({dateTo: moment(d).format('YYYY-MM-DD')}); }}
        />
      )}

      {/* Status */}
      <Text style={styles.label}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <FilterChip label="All" active={!filters.status && !filters.pending} onPress={() => onChange({status: null, pending: null})} />
        <FilterChip label="⏳ Pending" active={!!filters.pending} onPress={() => onChange({status: null, pending: true})} />
        {Object.values(DUTY_STATUS).map(s => (
          <FilterChip key={s} label={s} active={filters.status === s && !filters.pending} onPress={() => onChange({status: s, pending: null})} />
        ))}
      </ScrollView>

      {/* Officer (Admin only) */}
      {officers.length > 0 && (
        <>
          <Text style={styles.label}>Subordinate</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            <FilterChip label="All" active={!filters.officerId} onPress={() => onChange({officerId: null})} />
            {officers.filter(o => o.isEnabled).map(o => (
              <FilterChip key={o.id} label={o.name}
                active={filters.officerId === o.id} onPress={() => onChange({officerId: o.id})} />
            ))}
          </ScrollView>
        </>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border},
  label: {fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5},
  row: {marginBottom: 10},
  chip: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.white},
  chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: 12, color: colors.textSecondary},
  chipTextActive: {color: colors.white, fontWeight: '600'},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  dateBtn: {flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.background},
  dateBtnText: {fontSize: 13, color: colors.text, textAlign: 'center'},
  dateSep: {fontSize: 14, color: colors.textSecondary},
  clearDate: {paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 8},
  clearDateText: {fontSize: 11, color: colors.error, fontWeight: '600'},
});

export default ReportFilterBar;
