import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert} from 'react-native';
import {Linking, NativeModules} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import DropDownPicker from 'react-native-dropdown-picker';
import {useDuties} from '../../../hooks/useDuties';
import StatusBadge from '../../../components/common/StatusBadge';
import {STATUS_DESCRIPTIONS} from '../../../constants/dutyStatus';
import DutyStatusUpdater from '../../../components/officer/DutyStatusUpdater';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import WhatsAppMessageModal from '../../../components/common/WhatsAppMessageModal';
import {colors} from '../../../theme/colors';
import {shadows} from '../../../theme/spacing';
import {formatDate, formatTime, getDayFromDate} from '../../../utils/dateUtils';
import {fetchOfficersStart, fetchOfficersSuccess, fetchOfficersFailure} from '../../../store/slices/officerSlice';
import {getOfficers} from '../../../api/officerApi';
import {uploadDutyPdf} from '../../../api/dutyApi';
import {API_BASE_URL} from '../../../config';
const {FilePicker} = NativeModules;

const Row = ({label, value}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const AdminDutyDetailScreen = () => {
  const navigation = useNavigation();
  const {params: {dutyId}} = useRoute();
  const dispatch = useDispatch();
  const {selectedDuty: duty, fetchDuty, changeStatus, assignOfficer, removeDuty, isLoading} = useDuties();
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [officerOpen, setOfficerOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const {user, token} = useSelector(state => state.auth);
  const officers = useSelector(state => state.officers.list);

  useEffect(() => {fetchDuty(dutyId);}, [dutyId]);

  useEffect(() => {
    if (assignModalVisible && officers.length === 0) {
      dispatch(fetchOfficersStart());
      getOfficers()
        .then(res => dispatch(fetchOfficersSuccess(res.data)))
        .catch(e => dispatch(fetchOfficersFailure(e?.message)));
    }
  }, [assignModalVisible]);

  const handleStatusUpdate = async status => {
    setUpdating(true);
    await changeStatus(dutyId, status);
    await fetchDuty(dutyId);
    setUpdating(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Duty', 'Are you sure you want to delete this duty? This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(true);
        const ok = await removeDuty(dutyId);
        setDeleting(false);
        if (ok) navigation.navigate('AllDuties');
      }},
    ]);
  };

  const handleUploadPdf = async () => {
    try {
      const file = await FilePicker.pickPdf();
      setPdfLoading(true);
      await uploadDutyPdf(dutyId, {filename: file.fileName, data: file.base64, mimeType: 'application/pdf', size: 0});
      await fetchDuty(dutyId);
    } catch (e) {
      if (e?.code !== 'CANCELLED') {
        Alert.alert('Upload Failed', e?.message || 'Could not upload the file.');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCapturePhoto = () => {
    launchCamera({mediaType: 'photo', includeBase64: true, quality: 0.85}, async response => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset?.base64) return;
      try {
        setPdfLoading(true);
        await uploadDutyPdf(dutyId, {
          filename: asset.fileName || `photo_${Date.now()}.jpg`,
          data: asset.base64,
          mimeType: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        });
        await fetchDuty(dutyId);
      } catch (e) {
        Alert.alert('Upload Failed', e?.message || 'Could not upload the photo.');
      } finally {
        setPdfLoading(false);
      }
    });
  };

  const handleAttachOptions = () => {
    Alert.alert('Attach File', 'Choose an option', [
      {text: 'Pick PDF', onPress: handleUploadPdf},
      {text: 'Capture Photo', onPress: handleCapturePhoto},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleViewPdf = () => {
    if (!duty?.pdfAttachment?.hasFile) { Alert.alert('No PDF', 'No file is attached to this duty.'); return; }
    const url = `${API_BASE_URL}/duties/${duty.id}/pdf/view?token=${encodeURIComponent(token)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open PDF.'));
  };

  const handleAssign = async () => {
    if (!selectedOfficerId) return;
    const officer = officers.find(o => o.id?.toString() === selectedOfficerId);
    setAssigning(true);
    await assignOfficer(dutyId, selectedOfficerId, officer?.name || '');
    setAssigning(false);
    setAssignModalVisible(false);
    setSelectedOfficerId(null);
  };

  if (!duty) return <LoadingOverlay visible={isLoading} />;

  const confirmed = !!duty.officerConfirmed;
  const hasOfficer = !!duty.officerId;

  const officerItems = officers
    .filter(o => o.isEnabled)
    .map(o => ({label: o.name, value: o.id?.toString()}));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Duty Detail</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditDuty')}>
            <Text style={styles.editBtnText}>✎ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
            {deleting
              ? <ActivityIndicator color={colors.error} size="small" />
              : <Text style={styles.deleteBtnText}>🗑</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.srNo}>SR #{duty.srNo || duty.id}</Text>
              <Text style={styles.officerName}>{duty.officerName || 'Unassigned'}</Text>
            </View>
            <StatusBadge status={duty.status} />
          </View>
          <Text style={styles.statusDesc}>{STATUS_DESCRIPTIONS[duty.status]}</Text>

          <View style={[styles.confirmBadge, confirmed ? styles.confirmBadgeYes : styles.confirmBadgeNo]}>
            <Text style={[styles.confirmBadgeText, confirmed ? styles.confirmBadgeTextYes : styles.confirmBadgeTextNo]}>
              {confirmed ? '✓ Subordinate Confirmed' : '⏳ Awaiting Confirmation'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duty Information</Text>
          <Row label="Date" value={formatDate(duty.date)} />
          <Row label="Day" value={duty.date ? getDayFromDate(duty.date) : '—'} />
          <Row label="Arrival / Departure" value={duty.arrivalDeparture} />
          <Row label="Office Type" value={duty.officeType?.replace(/_/g, ' ')} />
          {duty.airline ? <Row label="Airline" value={duty.airline} /> : null}
          <Row label="Flight No" value={duty.airline ? `${duty.airline} ${duty.flightNo}`.trim() : duty.flightNo} />
          {duty.pnrNo ? <Row label="PNR No" value={duty.pnrNo} /> : null}
          <Row label="Flight Time" value={formatTime(duty.flightTime)} />
          <Row label="Reporting Time" value={formatTime(duty.reportingTime)} />
          {duty.guestArrivalTime ? <Row label="Guest Arrival Time" value={formatTime(duty.guestArrivalTime)} /> : null}
          <Row label="From" value={duty.from} />
          <Row label="To" value={duty.to} />
          <Row label="Airport" value={duty.airportName || duty.airport} />
          <Row label="Terminal" value={duty.terminalName} />
          <Row label="Passengers" value={duty.noOfPassengers?.toString()} />
          {duty.remark ? <Row label="Remark / Details" value={duty.remark} /> : null}
        </View>

        {(duty.travellerName || duty.travellerPhone || duty.travellerDesignation) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traveller Details</Text>
            {duty.travellerName ? <Row label="Name of Traveller" value={duty.travellerName} /> : null}
            {duty.travellerDesignation ? <Row label="Designation" value={duty.travellerDesignation} /> : null}
            {duty.travellerPhone ? <Row label="Mobile No. of Traveller" value={duty.travellerPhone} /> : null}
          </View>
        )}

        {/* PDF Attachment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachment</Text>
          {duty.pdfAttachment?.hasFile ? (
            <>
              <View style={styles.pdfRow}>
                <Text style={styles.pdfName}>📄 {duty.pdfAttachment.filename || 'document.pdf'}</Text>
                {duty.pdfAttachment.size ? <Text style={styles.pdfSize}>{(duty.pdfAttachment.size / 1024).toFixed(1)} KB</Text> : null}
              </View>
              <TouchableOpacity style={styles.viewPdfBtn} onPress={handleViewPdf} disabled={pdfLoading}>
                {pdfLoading
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Text style={styles.viewPdfBtnText}>👁  View / Share</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.replacePdfBtn} onPress={handleAttachOptions} disabled={pdfLoading}>
                <Text style={styles.replacePdfBtnText}>↺  Replace</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.uploadPdfBtn} onPress={handleAttachOptions} disabled={pdfLoading}>
              {pdfLoading
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={styles.uploadPdfBtnText}>📎  Attach PDF / Photo</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Subordinate section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subordinate</Text>
          {hasOfficer ? (
            <>
              <Row label="Name" value={duty.officerName} />
              <TouchableOpacity style={styles.reassignBtn} onPress={() => setAssignModalVisible(true)}>
                <Text style={styles.reassignBtnText}>✎  Change Subordinate</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.noOfficerText}>No subordinate assigned yet</Text>
              <TouchableOpacity style={styles.assignBtn} onPress={() => setAssignModalVisible(true)}>
                <Text style={styles.assignBtnText}>+ Assign Subordinate</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {confirmed && (
          <TouchableOpacity style={styles.msgBtn} onPress={() => setMsgModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.msgBtnText}>📤  Send Messages</Text>
          </TouchableOpacity>
        )}

        <DutyStatusUpdater duty={duty} onUpdate={handleStatusUpdate} loading={updating} />
      </ScrollView>

      {/* Assign Subordinate Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide" onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Assign Subordinate</Text>
            <Text style={styles.modalSub}>Select an officer to assign to this duty</Text>
            <DropDownPicker
              open={officerOpen} setOpen={setOfficerOpen}
              value={selectedOfficerId} setValue={setSelectedOfficerId}
              items={officerItems}
              placeholder="Select subordinate"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownList}
              listMode="SCROLLVIEW" zIndex={1000}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAssignModalVisible(false); setSelectedOfficerId(null); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmAssignBtn, (!selectedOfficerId || assigning) && styles.btnDisabled]}
                onPress={handleAssign} disabled={!selectedOfficerId || assigning}>
                {assigning
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.confirmAssignBtnText}>Assign</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <WhatsAppMessageModal
        visible={msgModalVisible}
        duty={duty}
        senderName={user?.name || ''}
        senderPhone={user?.phone || ''}
        subordinatePhone={officers.find(o => o.id === duty?.officerId || o._id === duty?.officerId)?.phone || ''}
        onClose={() => setMsgModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border},
  back: {color: colors.primary, fontSize: 15},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  editBtn: {backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.primary + '40'},
  editBtnText: {fontSize: 13, color: colors.primary, fontWeight: '600'},
  deleteBtn: {backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FECACA', minWidth: 36, alignItems: 'center'},
  deleteBtnText: {fontSize: 15},
  content: {padding: 16, paddingBottom: 40},
  card: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, ...shadows.sm},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  srNo: {fontSize: 12, color: colors.textSecondary},
  officerName: {fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2},
  statusDesc: {fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 17},
  confirmBadge: {borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 10},
  confirmBadgeYes: {backgroundColor: '#DCFCE7'},
  confirmBadgeNo: {backgroundColor: '#FEF9C3'},
  confirmBadgeText: {fontSize: 12, fontWeight: '700'},
  confirmBadgeTextYes: {color: '#16A34A'},
  confirmBadgeTextNo: {color: '#92400E'},
  section: {backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, ...shadows.sm},
  sectionTitle: {fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12},
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider},
  rowLabel: {fontSize: 13, color: colors.textSecondary},
  rowValue: {fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right'},
  noOfficerText: {fontSize: 13, color: colors.textSecondary, marginBottom: 12},
  assignBtn: {backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center'},
  assignBtnText: {color: colors.white, fontSize: 14, fontWeight: '700'},
  reassignBtn: {marginTop: 10, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  reassignBtnText: {color: colors.primary, fontSize: 13, fontWeight: '600'},
  msgBtn: {backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 12, ...shadows.sm},
  msgBtnText: {color: colors.white, fontSize: 15, fontWeight: '700'},

  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, ...shadows.md},
  modalTitle: {fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4},
  modalSub: {fontSize: 13, color: colors.textSecondary, marginBottom: 16},
  dropdown: {borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 8},
  dropdownList: {borderColor: colors.border},
  modalActions: {flexDirection: 'row', gap: 12, marginTop: 16},
  cancelBtn: {flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  cancelBtnText: {fontSize: 14, color: colors.textSecondary, fontWeight: '500'},
  confirmAssignBtn: {flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  confirmAssignBtnText: {color: colors.white, fontSize: 14, fontWeight: '700'},
  btnDisabled: {opacity: 0.5},
  pdfRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  pdfName: {fontSize: 13, color: colors.text, fontWeight: '500', flex: 1},
  pdfSize: {fontSize: 11, color: colors.textSecondary, marginLeft: 8},
  viewPdfBtn: {backgroundColor: colors.primary + '15', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: colors.primary + '40'},
  viewPdfBtnText: {fontSize: 13, color: colors.primary, fontWeight: '600'},
  replacePdfBtn: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center'},
  replacePdfBtnText: {fontSize: 12, color: colors.textSecondary, fontWeight: '500'},
  uploadPdfBtn: {borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary + '08'},
  uploadPdfBtnText: {fontSize: 13, color: colors.primary, fontWeight: '600'},
});

export default AdminDutyDetailScreen;
