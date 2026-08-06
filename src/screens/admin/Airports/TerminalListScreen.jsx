
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { setTerminals, updateTerminal } from '../../../store/slices/airportSlice';
import { getTerminals, toggleTerminal } from '../../../api/airportApi';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';

const TerminalListScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { params: { airport } } = useRoute();
  const { terminals } = useSelector(state => state.airports);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTerminals(airport.id);
      dispatch(setTerminals(res.data));
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = (terminal, val) => {
    Alert.alert(
      val ? 'Activate Terminal' : 'Deactivate Terminal',
      `${val ? 'Activate' : 'Deactivate'} ${terminal.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            try {
              const res = await toggleTerminal(airport.id, terminal.id, val);
              dispatch(updateTerminal(res.data));
            } catch { }
          }
        },
      ]
    );
  };

  // Filter only active terminals
  const activeTerminals = terminals.filter(terminal => terminal.isActive);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Active Terminals</Text>
          <Text style={styles.subtitle}>{airport.name}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('TerminalForm', { airport, terminal: null })}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTerminals}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, { color: item.isActive ? colors.success : colors.error }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('TerminalForm', { airport, terminal: item })}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <Switch
              value={item.isActive}
              onValueChange={val => handleToggle(item, val)}
              trackColor={{ false: colors.border, true: colors.success + '80' }}
              thumbColor={item.isActive ? colors.success : colors.textDisabled}
            />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No active terminals. Tap + Add to create one.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.primary, fontSize: 15 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 14, gap: 12, ...shadows.sm },
  codeBadge: { backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 48, alignItems: 'center' },
  codeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  status: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  editBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});

export default TerminalListScreen;



 