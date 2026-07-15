import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !phone || !address || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const regRes = await register({ name, email, phone, address, password, role: 'USER' });
    if (regRes.success) {
      setSuccess('Account created successfully! Logging you in...');
      // Automatically log in
      const loginRes = await login(email, password);
      setLoading(false);
      if (loginRes.success) {
        setTimeout(() => {
          navigate('/restaurants-page');
        }, 1500);
      } else {
        navigate('/login-page');
      }
    } else {
      setLoading(false);
      setError(regRes.message);
    }
  };

  return (
    <div className="login-body-wrapper" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="login-card animate-fade-in" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 className="login-title">Create Account</h2>
        <p className="login-subtitle">Join DineEase for a smart dining experience</p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#ecfdf5', color: 'var(--success-color)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Full Name</label>
            <input
              type="text"
              placeholder="Surya Prakash"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Email Address</label>
            <input
              type="email"
              placeholder="surya@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Phone Number</label>
            <input
              type="tel"
              placeholder="9988776655"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Address</label>
            <input
              type="text"
              placeholder="Sector 62, Noida, UP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                required
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="login-footer-text" style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login-page" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}
