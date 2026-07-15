import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section animate-fade-in">
        <div className="hero-content">
          <span className="hero-tagline">No Waiting. Just Dining.</span>
          <h1 className="hero-title">Order Food Online & Pre-Book Your Dine-In Table</h1>
          <p className="hero-description">
            Browse partner restaurants, customize your order, choose your arrival time, and pay online. 
            Your hot meals will be freshly prepared and ready exactly when you step inside the restaurant.
          </p>
          <div className="hero-buttons">
            <Link to="/restaurants-page" className="btn btn-primary">Browse Restaurants</Link>
            <Link to="/register-page" className="btn btn-secondary">Create Account</Link>
          </div>
        </div>
      </section>

      <main className="container">
        {/* Features List Section */}
        <section className="features-section">
          <div className="section-title-container">
            <h2 className="section-title">How DineEase Works</h2>
            <p className="section-subtitle">Save up to 45 minutes of waiting time in four simple steps</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            <div className="feature-card">
              <span className="feature-icon" style={{ fontSize: '2.5rem' }}>🔍</span>
              <h3 className="feature-title">1. Choose Restaurant</h3>
              <p className="feature-desc">Select from premium local partner restaurants based on cuisine or distance.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon" style={{ fontSize: '2.5rem' }}>🍔</span>
              <h3 className="feature-title">2. Select Dishes</h3>
              <p className="feature-desc">Add delicious food items to your cart, check preparation times and stock.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon" style={{ fontSize: '2.5rem' }}>⏰</span>
              <h3 className="feature-title">3. Book Table & Time</h3>
              <p className="feature-desc">Enter your arrival date, time, and number of guests for custom preparation.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon" style={{ fontSize: '2.5rem' }}>💳</span>
              <h3 className="feature-title">4. Arrive & Eat</h3>
              <p className="feature-desc">Walk in, sit down, and enjoy freshly cooked meals ready on your table.</p>
            </div>
          </div>
        </section>

        {/* Explore Restaurants Nearby */}
        <section className="section-title-container" style={{ marginTop: '5rem', textAlign: 'center' }}>
          <h2 className="section-title">Explore Restaurants Nearby</h2>
          <p className="section-subtitle">Browse partner tables available today</p>
          <br />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/restaurants-page" className="btn btn-primary">View Restaurants List & Search</Link>
          </div>
        </section>

        {/* Customer Reviews */}
        <section style={{ marginTop: '5rem' }}>
          <div className="section-title-container">
            <h2 className="section-title">What Our Foodies Say</h2>
            <p className="section-subtitle">Read reviews from real diners who skipped the line</p>
          </div>
          
          <div className="reviews-container">
            <div className="review-card">
              <div className="review-rating" style={{ color: 'var(--warning-color)' }}>⭐⭐⭐⭐⭐</div>
              <p className="review-text">
                "Pre-ordered lunch before leaving office. Walking in and finding our starters waiting on the table was amazing! A total game-changer for office breaks."
              </p>
              <div className="review-author">- Surya Prakash, Software Engineer</div>
            </div>
            <div className="review-card">
              <div className="review-rating" style={{ color: 'var(--warning-color)' }}>⭐⭐⭐⭐⭐</div>
              <p className="review-text">
                "Booked for 6 people on Sunday. We arrived and food was served within 5 minutes. Kids didn't have to wait. Staff was extremely cooperative."
              </p>
              <div className="review-author">- Neha Sharma, Business Analyst</div>
            </div>
            <div className="review-card">
              <div className="review-rating" style={{ color: 'var(--warning-color)' }}>⭐⭐⭐⭐⭐</div>
              <p className="review-text">
                "Great interface. It showed prep time was 25 mins, we timed our drive perfectly. Everything was fresh and piping hot. Strongly recommended!"
              </p>
              <div className="review-author">- Rajesh Kumar, Sales Lead</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
