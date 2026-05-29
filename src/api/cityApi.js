import axiosInstance from './axiosInstance';

export const getCities = () => axiosInstance.get('/cities');
export const createCity = name => axiosInstance.post('/cities', { name });
export const updateCity = (id, name) => axiosInstance.patch(`/cities/${id}`, { name });
export const toggleCity = id => axiosInstance.patch(`/cities/${id}/toggle`);
