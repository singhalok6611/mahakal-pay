import api from './client';

export const getDashboard = () => api.get('/retailer/dashboard');
export const getWallet = () => api.get('/retailer/wallet');
export const getWalletTransactions = (params) => api.get('/retailer/wallet/transactions', { params });
export const getTransactions = (params) => api.get('/retailer/transactions', { params });
export const getDetailedTransactions = (params) => api.get('/retailer/transactions/detailed', { params });
export const recharge = (data) => api.post('/retailer/recharge', data);
export const getOperators = (params) => api.get('/retailer/operators', { params });
export const createPaymentRequest = (data) => api.post('/retailer/payment-request', data);
export const createSupportTicket = (data) => api.post('/retailer/support-ticket', data);
