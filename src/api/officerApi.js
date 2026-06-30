import axiosInstance from './axiosInstance';

export const getOfficers = () =>
  axiosInstance.get('/officers');

export const addOfficer = data =>
  axiosInstance.post('/officers', data);

export const updateOfficer = (id, data) =>
  axiosInstance.put(`/officers/${id}`, data);

export const toggleOfficerAccess = (id, isEnabled) =>
  axiosInstance.post(`/officers/${id}/access`, {isEnabled});
