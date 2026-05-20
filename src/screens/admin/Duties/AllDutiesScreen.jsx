import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useDuties} from '../../../hooks/useDuties';
import DutyCard from '../../../components/common/DutyCard';
import EmptyState from '../../../components/common/EmptyState';
import ReportFilterBar from '../../../components/admin/ReportFilterBar';
import WhatsAppMessageModal from '../../../components/common/WhatsAppMessageModal';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';

const AllDutiesScreen = () => {
  const navigation = useNavigation();
  const {list: duties, fetchDuties, loadMore, isLoading, filters, setFilters, pagination} = useDuties();
  const [search, setSearch] = useState('');
  const [msgDuty, setMsgDuty] = useState(null);

  const user = useSelector(state => state.auth.user);

  useEffect(() => {fetchDuties(filters);}, [filters]);

  const filtered = duties.filter(d =>
    !search ||
    d.officerName?.toLowerCase().includes(search.toLowerCase()) ||
    d.flightNo?.toLowerCase().includes(search.toLowerCase()),
  );

  const renderItem = ({item}) => (
    <View style={styles.cardWrap}>
      <DutyCard duty={item} onPress={() => navigation.navigate('DutyDetail', {dutyId: item.id})} />
      {/* Quick message button below each card */}
      <TouchableOpacity style={styles.msgBtn} onPress={() => setMsgDuty(item)} activeOpacity={0.8}>
        <Text style={styles.msgBtnText}>📤  Send Messages</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>All Duties</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateDuty')}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.search}
          placeholder="Search subordinate, flight no..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textDisabled}
        />
      </View>
      <ReportFilterBar filters={filters} onChange={f => setFilters(f)} />
      <FlatList
        data={filtered}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={isLoading && pagination.page === 1}
        onRefresh={() => fetchDuties(filters)}
        onEndReached={() => !search && loadMore(filters)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading && pagination.page > 1 ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        ListEmptyComponent={<EmptyState icon="📋" title="No duties found" subtitle="Try adjusting your filters" />}
      />

      <WhatsAppMessageModal
        visible={!!msgDuty}
        duty={msgDuty}
        senderName={user?.name || ''}
        senderPhone={user?.phone || ''}
        subordinatePhone={msgDuty?.officerPhone || ''}
        onClose={() => setMsgDuty(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 20, fontWeight: '700', color: colors.text},
  addBtn: {backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8},
  addBtnText: {color: colors.white, fontWeight: '600', fontSize: 14},
  searchBox: {padding: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  search: {backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text},
  list: {padding: 12},
  footer: {paddingVertical: 16},
  cardWrap: {marginBottom: 4},
  msgBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', marginBottom: 14, marginTop: -4, ...shadows.sm,
  },
  msgBtnText: {color: colors.white, fontSize: 13, fontWeight: '700'},
});

export default AllDutiesScreen;
