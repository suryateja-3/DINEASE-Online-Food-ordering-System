import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    
    if (res.success) {
      if (res.user.role === 'ADMIN') {
        navigate('/admin-page');
      } else {
        setError('Access denied. You do not have administrator privileges.');
      }
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="login-body-wrapper" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: '#f1f5f9' }}>
      <div className="login-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>Admin Portal</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Authorize to access manager dashboards</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.2rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>Admin Email Address</label>
            <input
              type="email"
              placeholder="admin@dineease.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>Security Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', backgroundColor: '#0f172a', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Secure Authorization'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          * Security policies require active session cookies.
        </p>
      </div>
    </div>
  );
}
