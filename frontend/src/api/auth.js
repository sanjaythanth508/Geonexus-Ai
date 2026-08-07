import api from './client';

export const register = (userData) =>
  api.post('users/register/', typeof userData === 'object' ? userData : { username: arguments[0], password: arguments[1], email: arguments[2] });

export const sendOTP = (email) =>
  api.post('users/send-otp/', { email });

export const verifyOTP = (email, otp) =>
  api.post('users/verify-otp/', { email, otp });

export const sendResetOtp = (email) =>
  api.post('users/send-reset-otp/', { email });

export const resetPassword = (email, otp, new_password) =>
  api.post('users/reset-password/', { email, otp, new_password });


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

export const uploadAvatar = (formData) =>
  api.post('users/profile/avatar/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });