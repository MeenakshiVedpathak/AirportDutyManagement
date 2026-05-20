
import React, {useState} from 'react';
import {View, TextInput, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing as sp} from '../../theme/spacing';

const AppInput = ({label, required, error, style, secureTextEntry, ...props}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}{required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
      )}
      <View style={[styles.inputRow, focused && styles.focused, !!error && styles.error]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && hidden}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{hidden ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginBottom: 14},
  label: {fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 5},
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: colors.text,
  },
  focused: {borderColor: colors.primary},
  error: {borderColor: colors.error},
  eyeBtn: {paddingHorizontal: 12},
  eyeIcon: {fontSize: 16},
  errorText: {fontSize: 11, color: colors.error, marginTop: 3},
  requiredStar: {color: colors.error, fontWeight: '700'},
});

export default AppInput;