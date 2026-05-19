import {store} from '../store';
import {API_BASE_URL} from '../config';

export const extractPdfText = async (fileUri, fileName) => {
  const token = store.getState().auth.token;

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'application/pdf',
    name: fileName || 'boarding-pass.pdf',
  });

  // Use fetch (not axiosInstance) — React Native's fetch correctly sets the
  // multipart/form-data boundary for FormData; axiosInstance's default
  // Content-Type header strips the boundary and breaks multipart parsing.
  const response = await fetch(`${API_BASE_URL}/boarding-pass/extract-text`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Server error ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
};
