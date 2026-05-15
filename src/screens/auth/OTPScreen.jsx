import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../hooks/useAuth';
import AppButton from '../../components/common/AppButton';
import {colors} from '../../theme/colors';

const OTP_LENGTH = 6;

const OTPScreen = () => {
  const navigation = useNavigation();
  const {otpPending, isLoggedIn, isLoading, error, verifyOTP, resendOTP, clearOTPPending, clearError} = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!otpPending && !isLoggedIn) {
      navigation.replace('Login');
      return;
    }
    if (otpPending?.otp) {
      const digits = otpPending.otp.split('');
      setOtp(digits);
    }
  }, [otpPending]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (val, idx) => {
    clearError();
    const digits = [...otp];
    digits[idx] = val.replace(/[^0-9]/g, '');
    setOtp(digits);
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) return;
    await verifyOTP(otpPending.userId, code);
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setResendTimer(30);
    const res = await resendOTP(otpPending.userId);
    if (res?.otp) {
      const digits = res.otp.split('');
      setOtp(digits);
    }
  };

  const handleBack = () => {
    clearOTPPending();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>✈️</Text>
            </View>
            <Text style={styles.appName}>Airport Duty</Text>
            <Text style={styles.appSub}>Management System</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>OTP Verification</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to your registered mobile number
            </Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={r => (inputRefs.current[idx] = r)}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={val => handleChange(val, idx)}
                  onKeyPress={e => handleKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            <AppButton
              title="Verify OTP"
              onPress={handleVerify}
              loading={isLoading}
              disabled={otp.join('').length < OTP_LENGTH}
              style={styles.btn}
            />

            <View style={styles.resendRow}>
              {resendTimer > 0 ? (
                <Text style={styles.timerText}>Resend OTP in {resendTimer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>GTT DATA • Airport Duty Management v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.primary},
  flex: {flex: 1},
  scroll: {flexGrow: 1, justifyContent: 'center', padding: 24},
  header: {alignItems: 'center', marginBottom: 32},
  logoBox: {width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12},
  logoIcon: {fontSize: 40},
  appName: {fontSize: 26, fontWeight: '700', color: colors.white},
  appSub: {fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4},
  card: {backgroundColor: colors.white, borderRadius: 16, padding: 24},
  cardTitle: {fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8},
  subtitle: {fontSize: 14, color: colors.textSecondary, textAlign: 'center'},
  email: {fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center', marginBottom: 24},
  errorBox: {backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16},
  errorText: {fontSize: 13, color: colors.error},
  otpRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24},
  otpInput: {
    width: 46, height: 54, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, fontSize: 22, fontWeight: '700', color: colors.text,
    backgroundColor: '#F8FAFC',
  },
  otpInputFilled: {borderColor: colors.primary, backgroundColor: '#EEF2FF'},
  btn: {marginBottom: 16},
  resendRow: {alignItems: 'center', marginBottom: 12},
  timerText: {fontSize: 13, color: colors.textSecondary},
  resendText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  backBtn: {alignItems: 'center', paddingVertical: 8},
  backText: {fontSize: 13, color: colors.textSecondary},
  footer: {textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 24},
});

export default OTPScreen;
