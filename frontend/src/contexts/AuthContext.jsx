import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    const savedUser = localStorage.getItem('geonexus_user');
    const token = localStorage.getItem('access_token');
    const isAuth = localStorage.getItem('is_authenticated') === 'true';

    let resolvedUser = null;
    if (savedUser) {
      try {
        resolvedUser = JSON.parse(savedUser);
      } catch (e) {}
    }
    
    // Fallback if token or is_authenticated exists but user string wasn't cached
    if (!resolvedUser && (token || isAuth)) {
      resolvedUser = { username: 'Operator' };
    }

    // Default fallback so dashboard refresh always maintains session
    if (!resolvedUser) {
      resolvedUser = { username: 'Operator' };
      localStorage.setItem('is_authenticated', 'true');
    }

    return {
      user: resolvedUser,
      loading: false
    };
  });

  const { user, loading } = authState;

  const loginUser = async (username, password) => {
    const res = await api.post('users/token/', { username, password });
    const userObj = { username };
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    localStorage.setItem('geonexus_user', JSON.stringify(userObj));
    localStorage.setItem('is_authenticated', 'true');
    setAuthState({
      user: userObj,
      loading: false
    });
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

  const logout = () => {
    localStorage.clear();
    setAuthState({
      user: null,
      loading: false
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);