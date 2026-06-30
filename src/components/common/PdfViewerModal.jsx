import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Image, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import RNBlobUtil from 'react-native-blob-util';
import {useSelector} from 'react-redux';
import {colors} from '../../theme/colors';
import {API_BASE_URL} from '../../config';

const isImageMime = mime => /^image\//i.test(mime || '');

// Props:
//   dutyId + token  → fetch from backend (detail/edit screens)
//   localBase64 + localMimeType → write temp file locally (create screen preview)
const PdfViewerModal = ({visible, dutyId, filename, mimeType, localBase64, localMimeType, onClose}) => {
  const {token} = useSelector(state => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [localPath, setLocalPath] = useState(null);
  const [resolvedMime, setResolvedMime] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(false);
    setLocalPath(null);
    setResolvedMime(null);
    setTotalPages(0);
    setCurrentPage(1);

    // Local preview path (create screen — no dutyId yet)
    if (localBase64 && localMimeType) {
      const isImg = isImageMime(localMimeType);
      const ext = isImg ? 'jpg' : 'pdf';
      const path = `${RNBlobUtil.fs.dirs.CacheDir}/preview_local.${ext}`;
      RNBlobUtil.fs
        .writeFile(path, localBase64, 'base64')
        .then(() => {
          setResolvedMime(localMimeType);
          setLocalPath(path);
          setLoading(false);
        })
        .catch(err => {
          console.log('[PDF] local write error', err?.message || err);
          setLoading(false);
          setError(true);
        });
      return;
    }

    if (!dutyId) return;

    const url = `${API_BASE_URL}/duties/${dutyId}/pdf/view`;
    console.log('[PDF] fetching', url);
    RNBlobUtil.fetch(
      'GET',
      url,
      {Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache'},
    )
      .then(res => {
        const status = res.info().status;
        const headers = res.info().headers || {};
        console.log('[PDF] status', status, 'headers', JSON.stringify(headers));
        // Follow redirect (legacy Cloudinary duties)
        if (status === 301 || status === 302 || status === 307 || status === 308) {
          const redirectUrl = headers['location'] || headers['Location'];
          if (!redirectUrl) throw new Error('Redirect with no location header');
          return RNBlobUtil.fetch('GET', redirectUrl, {}).then(r2 => {
            if (r2.info().status >= 400) throw new Error(`HTTP ${r2.info().status}`);
            const ct2 = r2.info().headers['content-type'] || r2.info().headers['Content-Type'] || mimeType || 'application/pdf';
            return {b64: r2.base64(), ct: ct2};
          }).then(({b64, ct}) => {
            const ext = isImageMime(ct) ? 'jpg' : 'pdf';
            const path = `${RNBlobUtil.fs.dirs.CacheDir}/duty_${dutyId}.${ext}`;
            return RNBlobUtil.fs.writeFile(path, b64, 'base64').then(() => ({path, ct}));
          });
        }
        if (status < 200 || status >= 300) {
          const body = res.text ? res.text() : '';
          console.log('[PDF] error body', body);
          throw new Error(`HTTP ${status}: ${body}`);
        }
        const ct =
          headers['Content-Type'] ||
          headers['content-type'] ||
          mimeType ||
          'application/pdf';
        const b64 = res.base64();
        console.log('[PDF] base64 length', b64?.length, 'ct', ct);
        const isImg = isImageMime(ct);
        const ext = isImg ? 'jpg' : 'pdf';
        const path = `${RNBlobUtil.fs.dirs.CacheDir}/duty_${dutyId}.${ext}`;
        return RNBlobUtil.fs
          .writeFile(path, b64, 'base64')
          .then(() => { console.log('[PDF] written to', path); return {path, ct}; });
      })
      .then(({path, ct}) => {
        setResolvedMime(ct);
        setLocalPath(path);
        setLoading(false);
      })
      .catch(err => {
        const msg = err?.message || String(err);
        console.log('[PDF] error', msg);
        Alert.alert('PDF Load Error', msg);
        setLoading(false);
        setError(true);
      });
  }, [visible, dutyId, token, mimeType, localBase64, localMimeType]);

  const handleClose = () => {
    setLocalPath(null);
    setResolvedMime(null);
    setError(false);
    setLoading(true);
    onClose();
  };

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Could not load file.</Text>
          <Text style={styles.errorHint}>
            The file may not be available or the server returned an error.
          </Text>
          <Text style={styles.errorHint} selectable>
            URL: {dutyId ? `.../${dutyId}/pdf/view` : 'local preview'}
          </Text>
        </View>
      );
    }

    if (loading || !localPath) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Downloading...</Text>
        </View>
      );
    }

    const fileUri = `file://${localPath}`;
    const isImg = isImageMime(resolvedMime);

    if (isImg) {
      return (
        <ScrollView
          contentContainerStyle={styles.imageContainer}
          maximumZoomScale={4}
          minimumZoomScale={1}>
          <Image
            source={{uri: fileUri}}
            style={styles.image}
            resizeMode="contain"
            onError={() => setError(true)}
          />
        </ScrollView>
      );
    }

    return (
      <Pdf
        source={{uri: fileUri, cache: false}}
        style={styles.pdf}
        onLoadComplete={pages => setTotalPages(pages)}
        onPageChanged={page => setCurrentPage(page)}
        onError={() => setError(true)}
        enablePaging
        horizontal={false}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {filename || 'Document'}
          </Text>
          {!isImageMime(resolvedMime) && totalPages > 0 ? (
            <Text style={styles.pages}>{currentPage}/{totalPages}</Text>
          ) : (
            <View style={{width: 50}} />
          )}
        </View>
        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#1a1a1a'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {paddingRight: 12},
  closeText: {color: colors.white, fontSize: 14, fontWeight: '600'},
  title: {flex: 1, color: colors.white, fontSize: 14, fontWeight: '600'},
  pages: {color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 8},
  pdf: {flex: 1, width: '100%', backgroundColor: '#1a1a1a'},
  imageContainer: {flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 8},
  image: {width: '100%', height: undefined, aspectRatio: 1, maxHeight: 800},
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a1a',
  },
  loadingText: {color: colors.white, marginTop: 12, fontSize: 14},
  errorText: {color: colors.white, fontSize: 16, fontWeight: '600', marginBottom: 4},
  errorHint: {color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center'},
});

export default PdfViewerModal;
