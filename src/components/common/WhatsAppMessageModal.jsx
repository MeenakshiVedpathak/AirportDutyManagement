import React, {useState, useEffect} from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Share, Linking, ActivityIndicator,
} from 'react-native';
import {getContacts} from '../../api/contactApi';
import {colors} from '../../theme/colors';
import {shadows} from '../../theme/spacing';
import {formatTime, formatDate} from '../../utils/dateUtils';

const flightLabel = (airline, flightNo) =>
  airline ? `${airline} ${flightNo}`.trim() : (flightNo || '');

const buildTravellerMessage = ({senderName, subordinateName, airportName, terminalName, date, airline, flightNo, flightTime, from, to, arrivalDeparture, contactNo}) => {
  const arrDep = arrivalDeparture === 'ARRIVAL' ? 'Arrival' : 'Departure';
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : '__________';
  const lines = [
    `Dear Maam/Sir,`,
    '',
    `Mr. ${subordinateName || 'Our Officer'} will be facilitating you at ${airportName}${terminalName ? `, ${terminalName}` : ''} on ${formattedDate} for your ${arrDep} — Flight ${flightLabel(airline, flightNo)} at ${formatTime(flightTime)}`,
    `(${from} → ${to}).`,
    '',
    `Contact No: ${contactNo || '__________'}`,
    '',
    `Regards,`,
    senderName,
    `Income Tax Officer (HQ) Airport Protocol, Mumbai.`,
  ];
  return lines.join('\n');
};

const flightLine = (isDeparture, from, to, flightTime) =>
  isDeparture
    ? `Flight departure from ${from || '__'} at ${formatTime(flightTime)} and arriving ${to || '__'}.`
    : `Flight arriving at ${to || '__'} at ${formatTime(flightTime)} from ${from || '__'}.`;

const buildVipGuestMessage = ({travellerName, travellerDesignation, travellerPhone, senderName, contactNo, airportName, date, airline, flightNo, flightTime, from, to, arrivalDeparture}) => {
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : '__________';
  const traveller = [travellerName, travellerDesignation, travellerPhone].filter(Boolean).join(', ') || '__________';
  const isDeparture = arrivalDeparture === 'DEPARTURE';
  const lines = [
    `Sir/Madam,`,
    '',
    `${traveller}, is travelling from ${from || '__'} to ${to || '__'} on ${formattedDate} by ${flightLabel(airline, flightNo)}.`,
    '',
    flightLine(isDeparture, from, to, flightTime),
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
    '',
    `Cont No ${contactNo || senderName || ''}`,
  ];
  return lines.join('\n');
};

const buildAirportMessage = ({travellerName, travellerDesignation, travellerPhone, senderName, contactNo, date, airline, flightNo, flightTime, from, to, arrivalDeparture}) => {
  const formattedDate = date ? formatDate(date, 'DD.MM.YYYY') : '__________';
  const traveller = [travellerName, travellerDesignation, travellerPhone].filter(Boolean).join(', ') || '__________';
  const isDeparture = arrivalDeparture === 'DEPARTURE';
  const lines = [
    `Sir/Madam,`,
    '',
    `${traveller}, is travelling from ${from || '__'} to ${to || '__'} on ${formattedDate} by ${flightLabel(airline, flightNo)}.`,
    '',
    flightLine(isDeparture, from, to, flightTime),
    '',
    `Airport protocol and porter required at the airport.`,
    '',
    `Your assistance in ensuring smooth facilitation at the airport would be highly appreciated.`,
    `Thank you for your support.`,
    '',
    `Warm regards,`,
    '',
    senderName || '__________',
    `Income Tax Officer (HQ), Airport (Protocol)`,
    `Mumbai`,
    `Cont No ${contactNo || senderName || ''}`,
  ];
  return lines.join('\n');
};

const TABS = ['Traveller', 'VIP Guest', 'Airport Authority'];

const WhatsAppMessageModal = ({visible, duty, senderName, senderPhone, subordinatePhone, onClose}) => {
  const [contactNo, setContactNo] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [airportPhone, setAirportPhone] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Prefer explicitly passed subordinatePhone, then duty.officerPhone, then sender's own phone
  const defaultPhone = subordinatePhone || duty?.officerPhone || (duty?.officerName === senderName ? senderPhone : '');

  useEffect(() => {
    if (visible) {
      setContactNo(defaultPhone || '');
      setAirportPhone(duty?.airportAuthorityPhone || '');
      setActiveTab(0);
      setSelectedContact(null);
      const group = duty?.terminalName;
      if (group) {
        setContactsLoading(true);
        getContacts({group})
          .then(res => setContacts(res.data || []))
          .catch(() => setContacts([]))
          .finally(() => setContactsLoading(false));
      }
    }
  }, [visible, duty]);

  const travellerMsg = buildTravellerMessage({
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

  const vipMsg = buildVipGuestMessage({
    travellerName: duty?.travellerName || '',
    travellerDesignation: duty?.travellerDesignation || '',
    travellerPhone: duty?.travellerPhone || '',
    senderName: senderName || '',
    contactNo,
    airportName: duty?.airportName || '',
    date: duty?.date || '',
    airline: duty?.airline || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
  });

  const airportMsg = buildAirportMessage({
    travellerName: duty?.travellerName || '',
    travellerDesignation: duty?.travellerDesignation || '',
    travellerPhone: duty?.travellerPhone || '',
    senderName: senderName || '',
    contactNo: senderPhone || '',
    date: duty?.date || '',
    airline: duty?.airline || '',
    flightNo: duty?.flightNo || '',
    flightTime: duty?.flightTime || '',
    from: duty?.from || '',
    to: duty?.to || '',
    arrivalDeparture: duty?.arrivalDeparture || '',
  });

  const shareWhatsApp = async (msg, recipientPhone) => {
    try {
      const phone = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';
      const url = phone
        ? `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(msg)}`
        : `whatsapp://send?text=${encodeURIComponent(msg)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { await Linking.openURL(url); }
      else { await Share.share({message: msg}); }
    } catch { await Share.share({message: msg}); }
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
                <TouchableOpacity style={styles.whatsappBtn} onPress={() => shareWhatsApp(travellerMsg, duty?.travellerPhone)}>
                  <Text style={styles.whatsappBtnText}>📲 Share via WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Tab 1: VIP Guest ── */}
            {activeTab === 1 && (
              <>
                <Text style={styles.subTitle}>Send to officials/authorities about the VIP traveller.</Text>
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
                  <Text style={[styles.previewText, styles.greenText]} selectable>{vipMsg}</Text>
                </ScrollView>
                <TouchableOpacity style={styles.whatsappBtn} onPress={() => shareWhatsApp(vipMsg, duty?.travellerPhone)}>
                  <Text style={styles.whatsappBtnText}>📲 Share via WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Tab 2: Airport Authority ── */}
            {activeTab === 2 && (
              <>
                <Text style={styles.subTitle}>Send to airport authority about the duty.</Text>
                <Text style={styles.label}>Select Airport Authority Contact</Text>
                {contactsLoading
                  ? <ActivityIndicator size="small" color={colors.primary} style={{marginBottom: 12}} />
                  : contacts.length > 0
                    ? <ScrollView style={styles.contactList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {contacts.map(c => (
                          <TouchableOpacity key={c._id || c.id} style={[styles.contactItem, selectedContact?.phone === c.phone && styles.contactItemSelected]}
                            onPress={() => { setSelectedContact(c); setAirportPhone(c.phone); }}>
                            <Text style={styles.contactName}>{c.name}</Text>
                            <Text style={styles.contactPhone}>📞 {c.phone}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    : <>
                        <Text style={styles.noContacts}>No contacts for this terminal. Enter manually:</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="10-digit mobile number"
                          placeholderTextColor={colors.textSecondary}
                          value={airportPhone}
                          onChangeText={v => setAirportPhone(v.replace(/[^0-9]/g, ''))}
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </>
                }
                {selectedContact && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓ {selectedContact.name} — {selectedContact.phone}</Text>
                  </View>
                )}
                <Text style={styles.label}>Message Preview</Text>
                <ScrollView style={[styles.previewBox, styles.blueBox]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Text style={[styles.previewText, styles.blueText]} selectable>{airportMsg}</Text>
                </ScrollView>
                <TouchableOpacity style={styles.whatsappBtn} onPress={() => shareWhatsApp(airportMsg, airportPhone)}>
                  <Text style={styles.whatsappBtnText}>📲 Share via WhatsApp</Text>
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
  input: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surface, marginBottom: 12},
  previewBox: {borderRadius: 10, padding: 14, borderWidth: 1, maxHeight: 160, marginBottom: 12},
  greenBox: {backgroundColor: '#F0FDF4', borderColor: '#86EFAC'},
  blueBox: {backgroundColor: '#EFF6FF', borderColor: '#93C5FD'},
  previewText: {fontSize: 13, lineHeight: 20},
  greenText: {color: '#166534'},
  blueText: {color: '#1e3a5f'},
  whatsappBtn: {backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  whatsappBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},
  contactList: {maxHeight: 160, marginBottom: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8},
  contactItem: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border},
  contactItemSelected: {backgroundColor: colors.primary + '15'},
  contactName: {fontSize: 13, fontWeight: '600', color: colors.text, flex: 1},
  contactPhone: {fontSize: 12, color: colors.textSecondary},
  noContacts: {fontSize: 12, color: colors.textSecondary, marginBottom: 8, fontStyle: 'italic'},
  selectedBadge: {backgroundColor: colors.success + '20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, borderWidth: 1, borderColor: colors.success + '40'},
  selectedBadgeText: {fontSize: 12, color: colors.success, fontWeight: '600'},
  doneBtn: {borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8},
  doneBtnText: {fontSize: 14, color: colors.textSecondary, fontWeight: '500'},
});

export default WhatsAppMessageModal;
