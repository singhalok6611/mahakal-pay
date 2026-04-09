import api from './client';

export const getDashboard = () => api.get('/distributor/dashboard');
export const getRetailers = (params) => api.get('/distributor/retailers', { params });
export const createRetailer = (data) => api.post('/distributor/retailers', data);
export const updateRetailer = (id, data) => api.put(`/distributor/retailers/${id}`, data);
export const getTransactions = (params) => api.get('/distributor/transactions', { params });
export const getDetailedTransactions = (params) => api.get('/distributor/transactions/detailed', { params });
export const transferBalance = (data) => api.post('/distributor/wallet/transfer', data);

// Slice 4: own withdrawals
export const createWithdrawal = (data) => api.post('/distributor/withdrawals', data);
export const getMyWithdrawals = (params) => api.get('/distributor/withdrawals', { params });
