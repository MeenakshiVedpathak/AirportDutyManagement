import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Linking, Alert, Modal, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getContacts, createContact, updateContact, deleteContact} from '../../../api/contactApi';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';

const TABS = ['T1', 'T2', 'Ulve'];

const getInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ContactListScreen = () => {
  const [allContacts, setAllContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('T1');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await getContacts();
      setAllContacts(res.data || []);
    } catch {
      Alert.alert('Error', 'Could not load contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const tabContacts = allContacts.filter(c => c.group === activeTab);

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormPhone('');
    setModalVisible(true);
  };

  const openEdit = contact => {
    setEditing(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    const phone = formPhone.trim().replace(/\D/g, '');
    if (!name) { Alert.alert('Validation', 'Name is required'); return; }
    if (!phone || phone.length < 10) { Alert.alert('Validation', 'Enter a valid 10-digit number'); return; }

    setSaving(true);
    try {
      if (editing) {
        const res = await updateContact(editing.id, { name, phone, group: activeTab });
        setAllContacts(prev => prev.map(c => c.id === editing.id ? res.data : c));
      } else {
        const res = await createContact({ name, phone, group: activeTab });
        setAllContacts(prev => [...prev, res.data]);
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = contact => {
    Alert.alert(
      'Delete Contact',
      `Remove ${contact.name} from ${activeTab}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contact.id);
              setAllContacts(prev => prev.filter(c => c.id !== contact.id));
            } catch {
              Alert.alert('Error', 'Could not delete contact');
            }
          },
        },
      ],
    );
  };

  const handleCall = phone => {
    Linking.canOpenURL(`tel:${phone}`).then(ok => {
      if (ok) Linking.openURL(`tel:${phone}`);
      else Alert.alert('Error', 'Calling not supported on this device');
    });
  };

  const renderItem = ({item, index}) => (
    <View style={[styles.card, index === 0 && styles.cardFirst]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>
      <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.phone)}>
        <Text style={styles.callIcon}>📞</Text>
        <Text style={styles.callLabel}>Call</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
        <Text style={styles.editIcon}>✎</Text>
        <Text style={styles.editLabel}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <Text style={styles.deleteIcon}>🗑</Text>
        <Text style={styles.deleteLabel}>Del</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{flex: 1}} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Contact Directory</Text>
          <Text style={styles.subtitle}>{tabContacts.length} contacts</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            <Text style={[styles.tabCount, activeTab === tab && styles.tabCountActive]}>
              {allContacts.filter(c => c.group === tab).length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={tabContacts}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No contacts in {activeTab}</Text>
            <Text style={styles.emptyHint}>Tap ＋ Add to create one</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit Contact' : `Add Contact — ${activeTab}`}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textSecondary}
              value={formPhone}
              onChangeText={v => setFormPhone(v.replace(/[^0-9]/g, ''))}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Contact'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: {fontSize: 20, fontWeight: '700', color: colors.white},
  subtitle: {fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2},
  addBtn: {backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)'},
  addBtnText: {color: colors.white, fontWeight: '700', fontSize: 14},

  tabRow: {flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 14, gap: 10},
  tab: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)'},
  tabActive: {backgroundColor: colors.white},
  tabText: {fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.85)'},
  tabTextActive: {color: colors.primary},
  tabCount: {fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2},
  tabCountActive: {color: colors.primary + 'AA'},

  list: {padding: 16, paddingBottom: 40},
  cardFirst: {marginTop: 0},
  card: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 10, ...shadows.sm},
  avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12},
  avatarText: {color: colors.white, fontSize: 15, fontWeight: '700'},
  info: {flex: 1},
  name: {fontSize: 14, fontWeight: '600', color: colors.text},
  phone: {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  callBtn: {alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#86EFAC', marginLeft: 6},
  callIcon: {fontSize: 16},
  callLabel: {fontSize: 9, color: '#16A34A', fontWeight: '600', marginTop: 1},

  editBtn: {alignItems: 'center', backgroundColor: colors.primary + '12', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + '40', marginLeft: 6},
  editIcon: {fontSize: 16, color: colors.primary},
  editLabel: {fontSize: 9, color: colors.primary, fontWeight: '600', marginTop: 1},

  deleteBtn: {alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#FECACA', marginLeft: 6},
  deleteIcon: {fontSize: 16},
  deleteLabel: {fontSize: 9, color: '#DC2626', fontWeight: '600', marginTop: 1},

  empty: {alignItems: 'center', paddingTop: 60},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {fontSize: 16, fontWeight: '600', color: colors.text},
  emptyHint: {fontSize: 13, color: colors.textSecondary, marginTop: 4},

  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, ...shadows.md},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  modalTitle: {fontSize: 17, fontWeight: '700', color: colors.text},
  modalClose: {fontSize: 18, color: colors.textSecondary, fontWeight: '600'},
  fieldLabel: {fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6},
  input: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.surface, marginBottom: 16},
  saveBtn: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4},
  saveBtnText: {color: colors.white, fontSize: 16, fontWeight: '700'},
});

export default ContactListScreen;
