import api from './client';

export const getPaymentConfig = () => api.get('/payment/config');
export const createOrder = (amount) => api.post('/payment/create-order', { amount });
export const verifyPayment = (data) => api.post('/payment/verify', data);
export const myOrders = () => api.get('/payment/orders');
