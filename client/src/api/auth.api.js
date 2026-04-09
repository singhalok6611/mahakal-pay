import api from './client';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const refresh = (refreshToken) => api.post('/auth/refresh', { refreshToken });
export const logout = (refreshToken) => api.post('/auth/logout', { refreshToken });
export const logoutAll = () => api.post('/auth/logout-all');
export const getMe = () => api.get('/auth/me');
export const changePassword = (currentPassword, newPassword) =>
  api.put('/auth/password', { currentPassword, newPassword });
