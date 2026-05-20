import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import {useDispatch} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {addOfficerSchema} from '../../../utils/validationSchemas';
import {updateOfficer as updateOfficerApi} from '../../../api/officerApi';
import {updateOfficer} from '../../../store/slices/officerSlice';
import AppInput from '../../../components/common/AppInput';
import AppButton from '../../../components/common/AppButton';
import {colors} from '../../../theme/colors';

const EditOfficerScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {params: {officer}} = useRoute();
  const {control, handleSubmit, formState: {errors, isSubmitting}} = useForm({
    resolver: yupResolver(addOfficerSchema),
    defaultValues: {name: officer.name, phone: officer.phone, email: officer.email, employeeId: officer.employeeId},
  });

  const onSubmit = async data => {
    try {
      const res = await updateOfficerApi(officer.id, data);
      dispatch(updateOfficer(res.data));
      Toast.show({type: 'success', text1: 'Subordinate Updated'});
      navigation.goBack();
    } catch (err) {
      Toast.show({type: 'error', text1: 'Error', text2: err?.message || 'Failed to update subordinate'});
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Edit Subordinate</Text>
        <View style={{width: 60}} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="name" render={({field: {onChange, value}}) => (
          <AppInput required label="Full Name" value={value} onChangeText={onChange} autoCapitalize="words" error={errors.name?.message} />
        )} />
        <Controller control={control} name="employeeId" render={({field: {onChange, value}}) => (
          <AppInput required label="Employee ID" value={value} onChangeText={onChange} error={errors.employeeId?.message} />
        )} />
        <Controller control={control} name="phone" render={({field: {onChange, value}}) => (
          <AppInput required label="Phone Number" value={value} onChangeText={onChange} keyboardType="phone-pad" error={errors.phone?.message} />
        )} />
        <Controller control={control} name="email" render={({field: {onChange, value}}) => (
          <AppInput label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
        )} />
        <AppButton title="Save Changes" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.btn} />
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

export default EditOfficerScreen;
