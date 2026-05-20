import React, {useState, useEffect} from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Share, Linking,
} from 'react-native';
import {colors} from '../../theme/colors';
import {shadows} from '../../theme/spacing';
import {formatTime} from '../../utils/dateUtils';

const buildTravellerMessage = ({travellerName, senderName, subordinateName, airportName, terminalName, date, flightNo, flightTime, from, to, arrivalDeparture, phone, destinationRef}) => {
  const arrDep = arrivalDeparture === 'ARRIVAL' ? 'Arrival' : 'Departure';
  const lines = [
    `Dear ${travellerName || '__________'},`,
    '',
    `This side ${senderName},`,
    `Income Tax Officer (HQ) Airport Protocol, Mumbai.`,
    '',
    `${subordinateName || 'Our Officer'} will be facilitating you at`,
    `${airportName}${terminalName ? `, ${terminalName}` : ''} on ${date}`,
    `for your ${arrDep} — Flight ${flightNo} at ${formatTime(flightTime)}`,
    `(${from} → ${to}).`,
    destinationRef ? `Destination/Ref: ${destinationRef}` : null,
    '',
    `Contact No: ${phone || '__________'}`,
    '',
    `Regards,`,
    senderName,
  ].filter(l => l !== null);
  return lines.join('\n');
};

const buildAuthorityEmail = ({senderName, subordinateName, airportName, terminalName, date, flightNo, flightTime, from, to, arrivalDeparture, senderPhone, reportingTime, guestArrivalTime}) => {
  const arrDep = arrivalDeparture === 'ARRIVAL' ? 'Arrival' : 'Departure';
  const lines = [
    `Subject: Airport Protocol Duty – ${date} – Flight ${flightNo}`,
    '',
    `Dear Sir/Madam,`,
    '',
    `This is to inform you that ${subordinateName || 'our officer'} from the Income Tax`,
    `Department (HQ) Airport Protocol, Mumbai will be present at`,
    `${airportName}${terminalName ? `, ${terminalName}` : ''} on ${date}`,
    `for the ${arrDep} of Flight ${flightNo} at ${formatTime(flightTime)} (${from} → ${to}).`,
    '',
    `Reporting Time: ${formatTime(reportingTime)}`,
    guestArrivalTime ? `Guest Arrival Time: ${formatTime(guestArrivalTime)}` : null,
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

const TABS = ['Traveller', 'Airport Authority'];

const WhatsAppMessageModal = ({visible, duty, senderName, senderPhone, subordinatePhone, onClose}) => {
  const [travellerName, setTravellerName] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (visible) { setTravellerName(duty?.travellerName || ''); setActiveTab(0); }
  }, [visible, duty]);

  const phone = duty?.officerName === senderName ? senderPhone : subordinatePhone;

  const travellerMsg = buildTravellerMessage({
    travellerName,
    senderName: senderName || '',
    subordinateName: duty?.officerName || '',
    airportName: duty?.airportName || '',
    terminalName: duty?.terminalName || '',
    date: duty?.date || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
    phone,
    destinationRef: duty?.destinationRef || '',
  });

  const authorityMsg = buildAuthorityEmail({
    senderName: senderName || '',
    senderPhone: senderPhone || '',
    subordinateName: duty?.officerName || '',
    airportName: duty?.airportName || '',
    terminalName: duty?.terminalName || '',
    date: duty?.date || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
    reportingTime: duty?.reportingTime || '',
    guestArrivalTime: duty?.guestArrivalTime || null,
  });

  const handleShareWhatsApp = async () => {
    try {
      const phone = duty?.travellerPhone ? duty.travellerPhone.replace(/\D/g, '') : '';
      const url = phone
        ? `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(travellerMsg)}`
        : `whatsapp://send?text=${encodeURIComponent(travellerMsg)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { await Linking.openURL(url); }
      else { await Share.share({message: travellerMsg}); }
    } catch { await Share.share({message: travellerMsg}); }
  };

  const handleShareEmail = async () => {
    try {
      const subject = `Airport Protocol Duty – ${duty?.date || ''} – Flight ${duty?.flightNo || ''}`;
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

          {activeTab === 0 ? (
            <>
              <Text style={styles.label}>Name of Traveller</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter traveller name"
                placeholderTextColor={colors.textSecondary}
                value={travellerName}
                onChangeText={setTravellerName}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Message Preview</Text>
              <ScrollView style={[styles.previewBox, styles.greenBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={[styles.previewText, styles.greenText]} selectable>{travellerMsg}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
                <Text style={styles.whatsappBtnText}>📲 Share via WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subTitle}>Email to airport authority with duty details.</Text>
              <Text style={styles.label}>Email Preview</Text>
              <ScrollView style={[styles.previewBox, styles.blueBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={[styles.previewText, styles.blueText]} selectable>{authorityMsg}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.emailBtn} onPress={handleShareEmail}>
                <Text style={styles.emailBtnText}>✉️ Open in Email</Text>
              </TouchableOpacity>
            </>
          )}

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
  sheet: {backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%', ...shadows.md},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  title: {fontSize: 17, fontWeight: '700', color: colors.text},
  closeX: {fontSize: 18, color: colors.textSecondary, fontWeight: '600'},
  tabRow: {flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 14},
  tab: {flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.background},
  tabActive: {backgroundColor: colors.primary},
  tabText: {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  tabTextActive: {color: colors.white},
  subTitle: {fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 17},
  label: {fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6},
  input: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surface, marginBottom: 12},
  previewBox: {borderRadius: 10, padding: 14, borderWidth: 1, maxHeight: 180, marginBottom: 14},
  greenBox: {backgroundColor: '#F0FDF4', borderColor: '#86EFAC'},
  blueBox: {backgroundColor: '#EFF6FF', borderColor: '#93C5FD'},
  previewText: {fontSize: 13, lineHeight: 20},
  greenText: {color: '#166534'},
  blueText: {color: '#1e3a5f'},
  whatsappBtn: {backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  whatsappBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},
  emailBtn: {backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  emailBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},
  doneBtn: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center'},
  doneBtnText: {fontSize: 14, color: colors.textSecondary, fontWeight: '500'},
});

export default WhatsAppMessageModal;
