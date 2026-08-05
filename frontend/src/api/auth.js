import api from './client';

export const register = (username, password, email) =>
  api.post('users/register/', { username, password, email });

export const login = (username, password) =>
  api.post('users/token/', { username, password });

// Google Authentication
export const loginWithGoogle = (googleToken) =>
  api.post('users/login/google/', { token: googleToken });