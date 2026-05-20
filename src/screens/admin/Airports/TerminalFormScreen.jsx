import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';
import {addTerminal, updateTerminal} from '../../../store/slices/airportSlice';
import {createTerminal, updateTerminal as updateTerminalApi} from '../../../api/airportApi';
import AppInput from '../../../components/common/AppInput';
import AppButton from '../../../components/common/AppButton';
import {colors} from '../../../theme/colors';

const TerminalFormScreen = () => {
  const navigation = useNavigation();
  const {params: {airport, terminal}} = useRoute();
  const dispatch = useDispatch();
  const isEdit = !!terminal;

  const {control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm({
    defaultValues: {name: '', code: ''},
  });

  useEffect(() => {
    if (terminal) reset({name: terminal.name, code: terminal.code});
  }, [terminal]);

  const onSubmit = async data => {
    try {
      if (isEdit) {
        const res = await updateTerminalApi(airport.id, terminal.id, data);
        dispatch(updateTerminal(res.data));
        Toast.show({type: 'success', text1: 'Terminal Updated'});
      } else {
        const res = await createTerminal(airport.id, data);
        dispatch(addTerminal(res.data));
        Toast.show({type: 'success', text1: 'Terminal Added', text2: `${data.name} added to ${airport.name}`});
      }
      navigation.goBack();
    } catch (err) {
      Toast.show({type: 'error', text1: 'Error', text2: err?.message || 'Failed to save terminal'});
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{isEdit ? 'Edit Terminal' : 'Add Terminal'}</Text>
          <Text style={styles.subtitle}>{airport.name}</Text>
        </View>
        <View style={{width: 60}} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="name" rules={{required: 'Terminal name is required'}}
          render={({field: {onChange, value}}) => (
            <AppInput required label="Terminal Name" value={value} onChangeText={onChange}
              placeholder="e.g. Terminal 1" autoCapitalize="words"
              error={errors.name?.message} />
          )} />
        <Controller control={control} name="code" rules={{required: 'Terminal code is required'}}
          render={({field: {onChange, value}}) => (
            <AppInput required label="Terminal Code" value={value} onChangeText={t => onChange(t.toUpperCase())}
              placeholder="e.g. T1" autoCapitalize="characters" maxLength={6}
              error={errors.code?.message} />
          )} />
        <AppButton title={isEdit ? 'Update Terminal' : 'Add Terminal'} onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  back: {color: colors.primary, fontSize: 15},
  headerCenter: {flex: 1, alignItems: 'center'},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  subtitle: {fontSize: 11, color: colors.textSecondary, marginTop: 1},
  content: {padding: 16},
  btn: {marginTop: 8},
});

export default TerminalFormScreen;
