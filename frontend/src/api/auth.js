import api from './client';

export const register = (userData) =>
  api.post('users/register/', typeof userData === 'object' ? userData : { username: arguments[0], password: arguments[1], email: arguments[2] });

export const login = (username, password) =>
  api.post('users/token/', { username, password });

// Google Authentication
export const loginWithGoogle = (googleToken) =>
  api.post('users/login/google/', { token: googleToken });

// Profile Management
export const getUserProfile = () =>
  api.get('users/profile/');

export const updateUserProfile = (profileData) =>
  api.put('users/profile/', profileData);