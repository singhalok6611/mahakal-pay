import api from './client';

export const getDashboard = () => api.get('/admin/dashboard');
export const getUsers = (params) => api.get('/admin/users', { params });
export const createDistributor = (data) => api.post('/admin/users/distributor', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const getTransactions = (params) => api.get('/admin/transactions', { params });
export const getKYCRequests = (params) => api.get('/admin/kyc-requests', { params });
export const updateKYC = (id, data) => api.put(`/admin/kyc-requests/${id}`, data);
export const getPaymentRequests = (params) => api.get('/admin/payment-requests', { params });
export const updatePaymentRequest = (id, data) => api.put(`/admin/payment-requests/${id}`, data);
export const creditWallet = (data) => api.post('/admin/wallet/credit', data);
export const getSupportTickets = (params) => api.get('/admin/support-tickets', { params });
export const updateSupportTicket = (id, data) => api.put(`/admin/support-tickets/${id}`, data);
export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (data) => api.put('/admin/settings', data);
export const getWalletTransactions = (params) => api.get('/admin/wallet-transactions', { params });
