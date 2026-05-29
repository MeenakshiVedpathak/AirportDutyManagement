import axiosInstance from './axiosInstance';

export const createDuty = data =>
  axiosInstance.post('/duties', data);

export const getDuties = filters =>
  axiosInstance.get('/duties', {params: filters});

export const getDutyById = id =>
  axiosInstance.get(`/duties/${id}`);

export const updateDutyStatus = (id, status) =>
  axiosInstance.patch(`/duties/${id}/status`, {status});

export const confirmDuty = id =>
  axiosInstance.patch(`/duties/${id}/confirm`);

export const assignOfficer = (id, officerId, officerName) =>
  axiosInstance.patch(`/duties/${id}/assign`, {officerId, officerName});

export const claimDuty = id =>
  axiosInstance.patch(`/duties/${id}/claim`);

export const releaseDuty = id =>
  axiosInstance.patch(`/duties/${id}/release`);

export const updateDuty = (id, data) =>
  axiosInstance.put(`/duties/${id}`, data);

export const deleteDuty = id =>
  axiosInstance.delete(`/duties/${id}`);

export const uploadDutyPdf = (id, data) =>
  axiosInstance.post(`/duties/${id}/pdf`, data);

export const getDutyPdf = id =>
  axiosInstance.get(`/duties/${id}/pdf`);
