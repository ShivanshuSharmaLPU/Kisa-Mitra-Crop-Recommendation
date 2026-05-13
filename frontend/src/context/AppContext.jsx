import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { t } from '../utils/translations';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// Map display labels → internal lang codes
const LANG_CODE_MAP = {
  'en': 'en',
  'हिं': 'hi',
  'ਪੰ': 'pa',
  'த': 'ta',
  'తె': 'te',
};

export function AppProvider({ children }) {
  const [farmer, setFarmer] = useState(null);

  // Restore last language from localStorage so it persists across refreshes
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('km_lang') || 'en';
  });

  const [loading, setLoading] = useState(false);

  // Wrap setLang: map display label → code + persist
  const setLang = useCallback((rawValue) => {
    const code = LANG_CODE_MAP[rawValue] || rawValue;
    localStorage.setItem('km_lang', code);
    setLangState(code);
  }, []);

  // Translation helper bound to current lang
  const tr = useCallback((key) => t(lang, key), [lang]);

  useEffect(() => {
    const token = localStorage.getItem('km_token');
    if (token) {
      api.get('/auth/me')
        .then(r => setFarmer(r.farmer))
        .catch(() => localStorage.removeItem('km_token'));
    }
  }, []);

  const login = async (phone, password) => {
    const r = await api.post('/auth/login', { phone, password });
    localStorage.setItem('km_token', r.token);
    setFarmer(r.farmer);
    return r;
  };

  const register = async (data) => {
    const r = await api.post('/auth/register', data);
    localStorage.setItem('km_token', r.token);
    setFarmer(r.farmer);
    return r;
  };

  const logout = () => {
    localStorage.removeItem('km_token');
    setFarmer(null);
  };

  return (
    <AppCtx.Provider value={{
      farmer, lang, setLang, tr,
      loading, setLoading,
      login, register, logout,
    }}>
      {children}
    </AppCtx.Provider>
  );
}
