import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/users/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      return { success: true, user: data };
    } else {
      const errText = await res.text();
      return { success: false, message: errText || 'Login failed.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/users/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const register = async (userData) => {
    const res = await fetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, user: data };
    } else {
      const errText = await res.text();
      return { success: false, message: errText || 'Registration failed.' };
    }
  };

  const updateProfile = async (updatedData) => {
    if (!user) return { success: false, message: 'Not authenticated' };
    const res = await fetch(`/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      return { success: true, user: data };
    } else {
      const errText = await res.text();
      return { success: false, message: errText || 'Update failed.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateProfile, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
