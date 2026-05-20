import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';
import {addAirport, updateAirport} from '../../../store/slices/airportSlice';
import {createAirport, updateAirport as updateAirportApi} from '../../../api/airportApi';
import AppInput from '../../../components/common/AppInput';
import AppButton from '../../../components/common/AppButton';
import {colors} from '../../../theme/colors';

const AirportFormScreen = () => {
  const navigation = useNavigation();
  const {params: {airport}} = useRoute();
  const dispatch = useDispatch();
  const isEdit = !!airport;

  const {control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm({
    defaultValues: {name: '', code: '', city: ''},
  });

  useEffect(() => {
    if (airport) reset({name: airport.name, code: airport.code, city: airport.city});
  }, [airport]);

  const onSubmit = async data => {
    try {
      if (isEdit) {
        const res = await updateAirportApi(airport.id, data);
        dispatch(updateAirport(res.data));
        Toast.show({type: 'success', text1: 'Airport Updated'});
      } else {
        const res = await createAirport(data);
        dispatch(addAirport(res.data));
        Toast.show({type: 'success', text1: 'Airport Added', text2: res.data.name});
      }
      navigation.goBack();
    } catch (err) {
      Toast.show({type: 'error', text1: 'Error', text2: err?.message || 'Failed to save airport'});
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Airport' : 'Add Airport'}</Text>
        <View style={{width: 60}} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="name" rules={{required: 'Airport name is required'}}
          render={({field: {onChange, value}}) => (
            <AppInput required label="Airport Name" value={value} onChangeText={onChange}
              placeholder="e.g. Chhatrapati Shivaji Maharaj International Airport"
              error={errors.name?.message} />
          )} />
        <Controller control={control} name="code" rules={{required: 'Code is required'}}
          render={({field: {onChange, value}}) => (
            <AppInput required label="Airport Code" value={value} onChangeText={t => onChange(t.toUpperCase())}
              placeholder="e.g. BOM" autoCapitalize="characters" maxLength={6}
              error={errors.code?.message} />
          )} />
        <Controller control={control} name="city" rules={{required: 'City is required'}}
          render={({field: {onChange, value}}) => (
            <AppInput required label="City" value={value} onChangeText={onChange}
              placeholder="e.g. Mumbai" autoCapitalize="words"
              error={errors.city?.message} />
          )} />
        <AppButton title={isEdit ? 'Update Airport' : 'Add Airport'} onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  back: {color: colors.primary, fontSize: 15},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  content: {padding: 16},
  btn: {marginTop: 8},
});

export default AirportFormScreen;
