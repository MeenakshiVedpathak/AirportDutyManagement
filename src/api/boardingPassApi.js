import axiosInstance from './axiosInstance';

export const extractPdfText = async (base64, fileName) => {
  const response = await axiosInstance.post('/boarding-pass/extract-text', {
    base64,
    fileName: fileName || 'boarding-pass.pdf',
  });
  return response.data?.text || '';
};
