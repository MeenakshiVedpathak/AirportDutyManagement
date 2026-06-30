import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {colors} from '../../theme/colors';

const CityDropdown = ({
  label,
  required,
  open,
  setOpen,
  value,
  onChange,
  cities = [],
  onCityAdded,
  zIndex = 3000,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleAdd = async () => {
    const trimmed = newCity.trim().toUpperCase();
    if (!trimmed) { setSaveError('City name is required'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const added = await onCityAdded(trimmed);
      onChange(added);
      setModalVisible(false);
      setNewCity('');
    } catch (e) {
      setSaveError(e?.response?.data?.message || 'Failed to add city');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{zIndex}}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}{required && <Text style={styles.star}> *</Text>}
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setNewCity(''); setSaveError(''); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>+ Add City</Text>
        </TouchableOpacity>
      </View>

      <DropDownPicker
        open={open}
        setOpen={setOpen}
        value={value}
        setValue={cb => onChange(cb(value))}
        items={cities.map(c => ({label: c.toUpperCase(), value: c.toUpperCase()}))}
        placeholder={`Select ${label}`}
        searchable
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownList}
        zIndex={zIndex}
        listMode="SCROLLVIEW"
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modal}>
            <Text style={styles.modalTitle}>Add New City</Text>
            <TextInput
              style={[styles.input, saveError ? styles.inputErr : null]}
              placeholder="Enter city name"
              placeholderTextColor={colors.textDisabled}
              value={newCity}
              onChangeText={v => { setNewCity(v.toUpperCase()); setSaveError(''); }}
              autoCapitalize="characters"
              autoFocus
            />
            {saveError ? <Text style={styles.saveErr}>{saveError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && styles.btnDisabled]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.confirmText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, marginTop: 8},
  label: {fontSize: 13, fontWeight: '500', color: colors.textSecondary},
  star: {color: colors.error, fontWeight: '700'},
  addBtn: {backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '40', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3},
  addBtnText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
  dropdown: {borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 4},
  dropdownList: {borderColor: colors.border},
  err: {fontSize: 11, color: colors.error, marginBottom: 8},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center'},
  modal: {backgroundColor: colors.white, borderRadius: 14, padding: 24, width: '82%'},
  modalTitle: {fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16},
  input: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text, marginBottom: 6},
  inputErr: {borderColor: colors.error},
  saveErr: {fontSize: 12, color: colors.error, marginBottom: 8},
  modalBtns: {flexDirection: 'row', gap: 10, marginTop: 8},
  cancelBtn: {flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingVertical: 11, alignItems: 'center'},
  cancelText: {fontSize: 14, color: colors.textSecondary, fontWeight: '600'},
  confirmBtn: {flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center'},
  confirmText: {fontSize: 14, color: colors.white, fontWeight: '700'},
  btnDisabled: {opacity: 0.6},
});

export default CityDropdown;
