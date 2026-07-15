import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span>🍽️</span> DineEase
        </Link>
        
        <nav className="navbar-links">
          <Link to="/" className={`navbar-link ${isActive('/')}`}>Home</Link>
          <Link to="/restaurants-page" className={`navbar-link ${isActive('/restaurants-page')}`}>Restaurants</Link>
          <Link to="/cart-page" className={`navbar-link ${isActive('/cart-page')}`}>
            Cart {cartCount > 0 && <span className="cart-badge-count">{cartCount}</span>}
          </Link>
          {user && (
            <Link to="/orders-page" className={`navbar-link ${isActive('/orders-page')}`}>My Orders</Link>
          )}
        </nav>

        <div className="navbar-user">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="navbar-user-welcome">
                Hi, <strong>{user.name}</strong>
              </span>
              <Link to="/profile-page" className="navbar-link" style={{ fontWeight: 600 }}>Profile</Link>
              <Link to="/wallet-page" className="navbar-link" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                💜 Wallet
                {user.walletBalance > 0 && (
                  <span style={{ background: '#7c3aed', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '20px' }}>
                    ₹{Math.floor(user.walletBalance)}
                  </span>
                )}
              </Link>
              {user.role === 'ADMIN' && (
                <>
                  <Link to="/restaurant-dashboard" className="navbar-link" style={{ fontWeight: 600 }}>Kitchen Dashboard</Link>
                  <Link to="/admin-page" className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Admin Portal</Link>
                </>
              )}
              <button onClick={handleLogout} className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login-page" className="navbar-link">Login</Link>
              <Link to="/register-page" className="navbar-link btn btn-primary" style={{ color: 'white', padding: '0.4rem 1rem' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
