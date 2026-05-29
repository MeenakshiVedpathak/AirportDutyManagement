import React, {useState, useEffect} from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Share, Linking,
} from 'react-native';
import {colors} from '../../theme/colors';
import {shadows} from '../../theme/spacing';
import {formatTime, formatDate} from '../../utils/dateUtils';

const flightLabel = (airline, flightNo) =>
  airline ? `${airline} ${flightNo}`.trim() : (flightNo || '');

const buildTravellerMessage = ({travellerName, senderName, subordinateName, airportName, terminalName, date, airline, flightNo, flightTime, from, to, arrivalDeparture, contactNo}) => {
  const arrDep = arrivalDeparture === 'ARRIVAL' ? 'Arrival' : 'Departure';
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : '__________';
  const lines = [
    `Dear Maam/Sir,`,
    '',
    `${subordinateName || 'Our Officer'} will be facilitating you at`,
    `${airportName}${terminalName ? `, ${terminalName}` : ''} on ${formattedDate}`,
    `for your ${arrDep} — Flight ${flightLabel(airline, flightNo)} at ${formatTime(flightTime)}`,
    `(${from} → ${to}).`,
    '',
    `Contact No: ${contactNo || '__________'}`,
    '',
    `Regards,`,
    senderName,
    `Income Tax Officer (HQ) Airport Protocol, Mumbai`,
  ];
  return lines.join('\n');
};

const buildVipGuestMessageA = ({travellerName, travellerDesignation, senderName, senderPhone, airportName, date, airline, flightNo, flightTime, from, to, arrivalDeparture}) => {
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : '__________';
  const traveller = [travellerName, travellerDesignation].filter(Boolean).join(', ') || '__________';
  const isDeparture = arrivalDeparture === 'DEPARTURE';
  const lines = [
    `Sir/Madam,`,
    '',
    `${traveller}, is travelling from ${from || '__'} to ${to || '__'} on ${formattedDate} by ${flightLabel(airline, flightNo)}.`,
    '',
    isDeparture
      ? `Flight departure from ${from || '__'} at ${formatTime(flightTime)} and arriving ${to || '__'}.`
      : `Flight arrives at ${to || '__'} at ${formatTime(flightTime)} from ${from || '__'}.`,
    '',
    `Airport protocol and porter required at the airport.`,
    '',
    `Your assistance in ensuring smooth facilitation at the airport would be highly appreciated.`,
    `Thank you for your support.`,
    '',
    `Warm regards,`,
    senderName || '__________',
    `Income Tax Officer (HQ), Airport (Protocol)`,
    `Mumbai`,
    `Cont No ${senderPhone || '9869141242/9969236242'}`,
  ];
  return lines.join('\n');
};

const buildVipGuestMessageB = ({travellerName, travellerDesignation, travellerPhone, senderName, senderPhone, airportName, date, airline, flightNo, flightTime, from, to, arrivalDeparture}) => {
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : '__________';
  const traveller = [travellerName, travellerDesignation, travellerPhone].filter(Boolean).join(', ') || '__________';
  const isDeparture = arrivalDeparture === 'DEPARTURE';
  const lines = [
    `Sir/Madam,`,
    '',
    `${traveller}, is travelling from ${from || '__'} to ${to || '__'} on ${formattedDate} by ${flightLabel(airline, flightNo)}.`,
    '',
    isDeparture
      ? `Flight departure from ${from || '__'} at ${formatTime(flightTime)} and arriving ${to || '__'}.`
      : `Flight arrives at ${to || '__'} at ${formatTime(flightTime)} from ${from || '__'}.`,
    '',
    `Airport protocol and porter required at the airport ${airportName || ''}.`,
    '',
    `Your assistance in ensuring smooth facilitation at the airport would be highly appreciated.`,
    '',
    `Kindly revert with the details of the staff member who will be assisting at the airport to my mobile number mentioned below.`,
    '',
    `Thank you for your support.`,
    '',
    `Warm regards,`,
    senderName || '__________',
    `Income Tax Officer (HQ), Airport (Protocol)`,
    `Mumbai`,
    `Cont No ${senderPhone || '9869141242/9969236242'}`,
  ];
  return lines.join('\n');
};

const buildAuthorityEmail = ({senderName, senderPhone, subordinateName, airportName, terminalName, date, airline, flightNo, flightTime, from, to, arrivalDeparture, reportingTime, guestArrivalTime, contactNo}) => {
  const arrDep = arrivalDeparture === 'ARRIVAL' ? 'Arrival' : 'Departure';
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : date;
  const lines = [
    `Subject: Airport Protocol Duty – ${formattedDate} – Flight ${flightLabel(airline, flightNo)}`,
    '',
    `Dear Sir/Madam,`,
    '',
    `This is to inform you that ${subordinateName || 'our officer'} from the Income Tax`,
    `Department (HQ) Airport Protocol, Mumbai will be present at`,
    `${airportName}${terminalName ? `, ${terminalName}` : ''} on ${formattedDate}`,
    `for the ${arrDep} of Flight ${flightLabel(airline, flightNo)} at ${formatTime(flightTime)} (${from} → ${to}).`,
    '',
    `Reporting Time: ${formatTime(reportingTime)}`,
    guestArrivalTime ? `Guest Arrival Time: ${formatTime(guestArrivalTime)}` : null,
    '',
    `Contact No of ${subordinateName || 'Officer'}: ${contactNo || '__________'}`,
    '',
    `Kindly extend necessary cooperation and assistance.`,
    '',
    `Regards,`,
    senderName,
    `Income Tax Officer (HQ) Airport Protocol, Mumbai`,
    `Contact: ${senderPhone || '__________'}`,
  ].filter(l => l !== null);
  return lines.join('\n');
};

const TABS = ['Traveller', 'VIP Guest', 'Airport Authority'];

const WhatsAppMessageModal = ({visible, duty, senderName, senderPhone, subordinatePhone, onClose}) => {
  const [travellerName, setTravellerName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const defaultPhone = duty?.officerName === senderName ? senderPhone : subordinatePhone;

  useEffect(() => {
    if (visible) {
      setTravellerName(duty?.travellerName || '');
      setContactNo(defaultPhone || '');
      setActiveTab(0);
    }
  }, [visible, duty]);

  const travellerMsg = buildTravellerMessage({
    travellerName,
    senderName: senderName || '',
    subordinateName: duty?.officerName || '',
    airportName: duty?.airportName || '',
    terminalName: duty?.terminalName || '',
    date: duty?.date || '',
    airline: duty?.airline || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
    contactNo,
  });

  const vipMsgA = buildVipGuestMessageA({
    travellerName: duty?.travellerName || '',
    travellerDesignation: duty?.travellerDesignation || '',
    senderName: senderName || '',
    senderPhone: senderPhone || '',
    airportName: duty?.airportName || '',
    date: duty?.date || '',
    airline: duty?.airline || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
  });

  const vipMsgB = buildVipGuestMessageB({
    travellerName: duty?.travellerName || '',
    travellerDesignation: duty?.travellerDesignation || '',
    travellerPhone: duty?.travellerPhone || '',
    senderName: senderName || '',
    senderPhone: senderPhone || '',
    airportName: duty?.airportName || '',
    date: duty?.date || '',
    airline: duty?.airline || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
  });

  const authorityMsg = buildAuthorityEmail({
    senderName: senderName || '',
    senderPhone: senderPhone || '',
    subordinateName: duty?.officerName || '',
    airportName: duty?.airportName || '',
    terminalName: duty?.terminalName || '',
    date: duty?.date || '',
    airline: duty?.airline || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
    reportingTime: duty?.reportingTime || '',
    guestArrivalTime: duty?.guestArrivalTime || null,
    contactNo,
  });

  const shareWhatsApp = async msg => {
    try {
      const phone = duty?.travellerPhone ? duty.travellerPhone.replace(/\D/g, '') : '';
      const url = phone
        ? `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(msg)}`
        : `whatsapp://send?text=${encodeURIComponent(msg)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { await Linking.openURL(url); }
      else { await Share.share({message: msg}); }
    } catch { await Share.share({message: msg}); }
  };

  const handleShareEmail = async () => {
    try {
      const subject = `Airport Protocol Duty – ${duty?.date || ''} – Flight ${flightLabel(duty?.airline, duty?.flightNo)}`;
      const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(authorityMsg)}`;
      await Linking.openURL(url);
    } catch { await Share.share({message: authorityMsg}); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          <View style={styles.header}>
            <Text style={styles.title}>📤 Send Messages</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {TABS.map((tab, i) => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(i)}
                style={[styles.tab, activeTab === i && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>

            {/* ── Tab 0: Traveller ── */}
            {activeTab === 0 && (
              <>
                <Text style={styles.label}>Contact No. of Officer</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textSecondary}
                  value={contactNo}
                  onChangeText={v => setContactNo(v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                <Text style={styles.label}>Message Preview</Text>
                <ScrollView style={[styles.previewBox, styles.greenBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Text style={[styles.previewText, styles.greenText]} selectable>{travellerMsg}</Text>
                </ScrollView>
                <TouchableOpacity style={styles.whatsappBtn} onPress={() => shareWhatsApp(travellerMsg)}>
                  <Text style={styles.whatsappBtnText}>📲 Share via WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Tab 1: VIP Guest ── */}
            {activeTab === 1 && (
              <>
                <Text style={styles.subTitle}>Two templates — send to officials/authorities about the VIP traveller.</Text>

                <Text style={styles.msgGroupLabel}>Message A — Request for facilitation</Text>
                <ScrollView style={[styles.previewBox, styles.greenBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Text style={[styles.previewText, styles.greenText]} selectable>{vipMsgA}</Text>
                </ScrollView>
                <TouchableOpacity style={styles.whatsappBtn} onPress={() => shareWhatsApp(vipMsgA)}>
                  <Text style={styles.whatsappBtnText}>📲 Share Message A</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.msgGroupLabel}>Message B — Request for staff details</Text>
                <ScrollView style={[styles.previewBox, styles.blueBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Text style={[styles.previewText, styles.blueText]} selectable>{vipMsgB}</Text>
                </ScrollView>
                <TouchableOpacity style={[styles.whatsappBtn, {backgroundColor: '#1A9E52'}]} onPress={() => shareWhatsApp(vipMsgB)}>
                  <Text style={styles.whatsappBtnText}>📲 Share Message B</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Tab 2: Airport Authority ── */}
            {activeTab === 2 && (
              <>
                <Text style={styles.subTitle}>Email to airport authority with duty details.</Text>
                <Text style={styles.label}>Contact No. of Officer</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textSecondary}
                  value={contactNo}
                  onChangeText={v => setContactNo(v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                <Text style={styles.label}>Email Preview</Text>
                <ScrollView style={[styles.previewBox, styles.blueBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Text style={[styles.previewText, styles.blueText]} selectable>{authorityMsg}</Text>
                </ScrollView>
                <TouchableOpacity style={styles.emailBtn} onPress={handleShareEmail}>
                  <Text style={styles.emailBtnText}>✉️ Open in Email</Text>
                </TouchableOpacity>
              </>
            )}

          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '94%', ...shadows.md},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  title: {fontSize: 17, fontWeight: '700', color: colors.text},
  closeX: {fontSize: 18, color: colors.textSecondary, fontWeight: '600'},
  tabRow: {flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 14},
  tab: {flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.background},
  tabActive: {backgroundColor: colors.primary},
  tabText: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  tabTextActive: {color: colors.white},
  subTitle: {fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 17},
  label: {fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6},
  msgGroupLabel: {fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 4},
  input: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surface, marginBottom: 12},
  previewBox: {borderRadius: 10, padding: 14, borderWidth: 1, maxHeight: 160, marginBottom: 12},
  greenBox: {backgroundColor: '#F0FDF4', borderColor: '#86EFAC'},
  blueBox: {backgroundColor: '#EFF6FF', borderColor: '#93C5FD'},
  previewText: {fontSize: 13, lineHeight: 20},
  greenText: {color: '#166534'},
  blueText: {color: '#1e3a5f'},
  divider: {height: 1, backgroundColor: colors.border, marginVertical: 12},
  whatsappBtn: {backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  whatsappBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},
  emailBtn: {backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  emailBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},
  doneBtn: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8},
  doneBtnText: {fontSize: 14, color: colors.textSecondary, fontWeight: '500'},
});

export default WhatsAppMessageModal;
