import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--secondary-color)', color: 'white', padding: '3rem 1.5rem', marginTop: '5rem' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', padding: 0 }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🍽️</span> DineEase
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Pre-order your favorite meals, book tables in advance, and enjoy freshly cooked food the moment you walk into our partner restaurants.
          </p>
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>Quick Links</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Home</Link></li>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/restaurants-page" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Partner Restaurants</Link></li>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/cart-page" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>My Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>Contact Us</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📧 support@dineease.com</p>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📞 +91 98765 43210</p>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>📍 Hi-Tech city, Hyderabad, India</p>
        </div>
      </div>
      <div style={{ textAlign: 'center', borderTop: '1px solid #334155', marginTop: '3rem', paddingTop: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
        &copy; {new Date().getFullYear()} DineEase. All rights reserved. Designed for hassle-free dine-ins.
      </div>
    </footer>
  );
}
