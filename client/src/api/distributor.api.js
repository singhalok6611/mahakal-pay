import api from './client';

export const getDashboard = () => api.get('/distributor/dashboard');
export const getRetailers = (params) => api.get('/distributor/retailers', { params });
export const createRetailer = (data) => api.post('/distributor/retailers', data);
export const updateRetailer = (id, data) => api.put(`/distributor/retailers/${id}`, data);
export const getTransactions = (params) => api.get('/distributor/transactions', { params });
export const transferBalance = (data) => api.post('/distributor/wallet/transfer', data);
