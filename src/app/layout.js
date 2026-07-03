'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import './globals.css';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://itcrmbackend.vercel.app';

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try { setUser(JSON.parse(savedUser)); } catch (e) { }
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function verifyToken(t) {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function login(t, u) {
    setToken(t);
    setUser(u);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return (
    <html lang="en">
      <head>
        <title>Baselient IT Development CRM</title>
        <meta name="description" content="Baselient IT Development CRM - Project & Resource Management" />
      </head>
      <body>
        <AppContext.Provider value={{ user, token, login, logout, API, loading }}>
          {children}
        </AppContext.Provider>
      </body>
    </html>
  );
}