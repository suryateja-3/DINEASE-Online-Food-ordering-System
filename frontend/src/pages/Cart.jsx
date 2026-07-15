import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { user } = useAuth();
  const { cartItems, loadingCart, updateQuantity, removeFromCart, clearCart, cartTotal, bookingDetails, setBookingDetails } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login-page');
    }
  }, [user, navigate]);

  // Compute maximum preparation time from items in cart
  const [maxPrepTime, setMaxPrepTime] = useState(0);
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const getPrepDetails = async () => {
      if (cartItems.length === 0) {
        setMaxPrepTime(0);
        return;
      }
      
      // Compute prep times
      let maxTime = 0;
      for (const item of cartItems) {
        try {
          const res = await fetch(`/fooditems/${item.foodItemId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.preparationTime > maxTime) {
              maxTime = data.preparationTime;
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
      setMaxPrepTime(maxTime);

      // Fetch restaurant name
      try {
        const restRes = await fetch(`/restaurants/${cartItems[0].restaurantId}`);
        if (restRes.ok) {
          const data = await restRes.json();
          setRestaurantName(data.restaurantName);
        }
      } catch (err) {
        console.error(err);
      }
    };

    getPrepDetails();
  }, [cartItems]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    setError('');

    if (!bookingDetails.arrivalDate || !bookingDetails.arrivalTime) {
      setError('Please provide your dine-in date and arrival time.');
      return;
    }

    if (bookingDetails.numberOfPeople <= 0) {
      setError('Please specify at least 1 guest.');
      return;
    }

    // Redirect to checkout page
    navigate('/checkout-page');
  };

  if (loadingCart) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading your cart...
      </div>
    );
  }

  return (
    <main className="container animate-fade-in">
      <div className="section-title-container" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title">My Dine-In Cart</h1>
        <p className="section-subtitle">Review items and schedule your table reservation</p>
      </div>

      {cartItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-color)', borderRadius: '16px', backgroundColor: 'white' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛒</span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Add delicious dishes from our partner restaurants first!</p>
          <Link to="/restaurants-page" className="btn btn-primary">Browse Restaurants</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
          {/* Cart Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Selected Dishes {restaurantName && `from ${restaurantName}`}
              </h2>
              <button 
                onClick={clearCart} 
                className="btn" 
                style={{ color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 700, background: 'transparent', border: 'none', padding: 0 }}
              >
                Clear All
              </button>
            </div>

            <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{item.foodName}</h3>
                    {item.customizations && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', backgroundColor: '#fff7ed', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.2rem', fontWeight: 600 }}>
                        ⚙️ {item.customizations}
                      </span>
                    )}
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      Price: ₹{item.price.toFixed(0)} | Total: <strong>₹{item.totalPrice.toFixed(0)}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                        style={{ padding: '0.3rem 0.6rem', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        -
                      </button>
                      <span style={{ padding: '0 0.8rem', fontSize: '0.9rem', fontWeight: 600 }}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                        style={{ padding: '0.3rem 0.6rem', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="btn" 
                      style={{ color: 'var(--danger-color)', padding: '0.4rem', background: '#fee2e2', borderRadius: '6px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Subtotal:</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹{cartTotal.toFixed(0)}</span>
            </div>
            
            {maxPrepTime > 0 && (
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)', fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: 1.4 }}>
                ℹ️ <strong>Food Preparation Estimate:</strong> These dishes will require at least <strong>{maxPrepTime} minutes</strong> to cook. Please schedule your arrival time at least {maxPrepTime} minutes from now.
              </div>
            )}
          </div>

          {/* Table Reservation Scheduling Form */}
          <div className="checkout-card" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Table Reservation Details</h2>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCheckout}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>Arrival Date</label>
                <input
                  type="date"
                  name="arrivalDate"
                  value={bookingDetails.arrivalDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>Arrival Time</label>
                <input
                  type="time"
                  name="arrivalTime"
                  value={bookingDetails.arrivalTime}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>Table Seating Type</label>
                <select
                  name="tableType"
                  value={bookingDetails.tableType || '4-Seater'}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                  required
                >
                  <option value="2-Seater">2-Seater (1-2 guests)</option>
                  <option value="4-Seater">4-Seater (3-4 guests)</option>
                  <option value="Family Table">Family Table (5+ guests)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>Number of Diners (Guests)</label>
                <input
                  type="number"
                  name="numberOfPeople"
                  min="1"
                  max="20"
                  value={bookingDetails.numberOfPeople}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>Special Requests (Optional)</label>
                <textarea
                  name="specialInstructions"
                  rows="3"
                  placeholder="E.g., Window seat, allergen warnings, high chair for toddlers..."
                  value={bookingDetails.specialInstructions}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', fontSize: '1rem' }}
              >
                Proceed to Checkout
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
