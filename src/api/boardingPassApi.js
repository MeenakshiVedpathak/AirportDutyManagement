import axiosInstance from './axiosInstance';

export const extractPdfText = async (fileUri, fileName) => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'application/pdf',
    name: fileName || 'boarding-pass.pdf',
  });
  const res = await axiosInstance.post('/boarding-pass/extract-text', formData, {
    headers: {'Content-Type': 'multipart/form-data'},
    timeout: 30000,
  });
  return res.data.text || '';
};
