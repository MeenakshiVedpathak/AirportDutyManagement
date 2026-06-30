import axiosInstance from './axiosInstance';

export const getContacts  = (group) => axiosInstance.get('/contacts', { params: group ? { group } : {} });
export const createContact = (data) => axiosInstance.post('/contacts', data);
export const updateContact = (id, data) => axiosInstance.put(`/contacts/${id}`, data);
export const deleteContact = (id) => axiosInstance.delete(`/contacts/${id}`);
