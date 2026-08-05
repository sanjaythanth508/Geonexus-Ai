import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getUserProfile } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    const savedUser = localStorage.getItem('geonexus_user');
    const token = localStorage.getItem('access_token');

    let resolvedUser = null;
    if (token && savedUser) {
      try {
        resolvedUser = JSON.parse(savedUser);
      } catch (e) {}
    }

    return {
      user: token ? (resolvedUser || { username: 'Operator' }) : null,
      loading: false
    };
  });

  const { user, loading } = authState;

  // Refresh current user details from backend profile endpoint
  const refreshUser = useCallback(async () => {
    try {
      const res = await getUserProfile();
      if (res.data) {
        localStorage.setItem('geonexus_user', JSON.stringify(res.data));
        setAuthState(prev => ({ ...prev, user: res.data }));
        return res.data;
      }
    } catch (e) {
      // If fetching full profile fails, fallback gracefully
    }
  }, []);

  const loginUser = async (username, password) => {
    const res = await api.post('users/token/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    localStorage.setItem('is_authenticated', 'true');
    
    // Try to fetch full profile object
    try {
      const profileRes = await getUserProfile();
      const userObj = profileRes.data;
      localStorage.setItem('geonexus_user', JSON.stringify(userObj));
      setAuthState({ user: userObj, loading: false });
    } catch (e) {
      const userObj = { username };
      localStorage.setItem('geonexus_user', JSON.stringify(userObj));
      setAuthState({ user: userObj, loading: false });
    }
    return res;
  };

  const loginWithTokens = (data, fallbackUsername = 'User') => {
    if (data?.access) localStorage.setItem('access_token', data.access);
    if (data?.refresh) localStorage.setItem('refresh_token', data.refresh);

    const nextUser = data?.user
      ? { ...data.user }
      : { username: fallbackUsername };

    localStorage.setItem('geonexus_user', JSON.stringify(nextUser));
    localStorage.setItem('is_authenticated', 'true');

    setAuthState({
      user: nextUser,
      loading: false
    });
    return nextUser;
  };

  const updateUserState = (updatedUserObj) => {
    localStorage.setItem('geonexus_user', JSON.stringify(updatedUserObj));
    setAuthState(prev => ({
      ...prev,
      user: updatedUserObj
    }));
  };

  const logout = () => {
    localStorage.clear();
    setAuthState({
      user: null,
      loading: false
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, loginWithTokens, updateUserState, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);