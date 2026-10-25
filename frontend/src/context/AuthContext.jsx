import React, { createContext, useContext, useState, useEffect } from 'react';
import { spendsenseApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const savedToken = localStorage.getItem('spendsense_token');
    const savedUser = localStorage.getItem('spendsense_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('spendsense_token');
        localStorage.removeItem('spendsense_user');
      }
    } else {
      // Auto-initialize demo user for effortless viva/demo testing
      const defaultUser = { id: 'usr-atharv-1', name: 'Atharv Kulkarni', email: 'atharv@example.com' };
      const defaultToken = 'demo-jwt-token-spendsense-2026';
      setUser(defaultUser);
      setToken(defaultToken);
      localStorage.setItem('spendsense_token', defaultToken);
      localStorage.setItem('spendsense_user', JSON.stringify(defaultUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await spendsenseApi.login(email, password);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('spendsense_token', res.data.token);
      localStorage.setItem('spendsense_user', JSON.stringify(res.data.user));
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await spendsenseApi.register(name, email, password);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('spendsense_token', res.data.token);
      localStorage.setItem('spendsense_user', JSON.stringify(res.data.user));
    }
    return res;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('spendsense_token');
    localStorage.removeItem('spendsense_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
