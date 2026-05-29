import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {colors} from '../../theme/colors';

const AutocompleteInput = ({
  label,
  required,
  value,
  onChangeText,
  onSelect,
  suggestions = [],
  placeholder,
  error,
  autoCapitalize = 'words',
  editable = true,
}) => {
  const [focused, setFocused] = useState(false);

  const filtered = suggestions
    .filter(s => s && (!value || s.toLowerCase().includes(value.toLowerCase())))
    .slice(0, 6);

  const showDropdown = focused && filtered.length > 0;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}{required && <Text style={styles.star}> *</Text>}
        </Text>
      )}
      <View style={[styles.inputRow, focused && styles.focused, !!error && styles.errBorder]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {showDropdown && (
        <View style={styles.dropdown}>
          {filtered.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.item, i < filtered.length - 1 && styles.itemBorder]}
              onPress={() => {
                onSelect(s);
                setFocused(false);
              }}>
              <Text style={styles.itemText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginBottom: 14, zIndex: 10},
  label: {fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 5},
  star: {color: colors.error, fontWeight: '700'},
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.surface,
  },
  focused: {borderColor: colors.primary},
  errBorder: {borderColor: colors.error},
  input: {flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text},
  errorText: {fontSize: 11, color: colors.error, marginTop: 3},
  dropdown: {
    borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 8,
    backgroundColor: colors.white, marginTop: 2,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  item: {paddingHorizontal: 14, paddingVertical: 11},
  itemBorder: {borderBottomWidth: 1, borderBottomColor: colors.border},
  itemText: {fontSize: 14, color: colors.text},
});

export default AutocompleteInput;
