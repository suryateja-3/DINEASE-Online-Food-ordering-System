import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, cartTotal, bookingDetails, setBookingDetails } = useCart();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);

  const [allTables, setAllTables] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Coupon & Wallet State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, message }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login-page');
      return;
    }
    if (cartItems.length === 0) {
      navigate('/cart-page');
    }
  }, [user, cartItems, navigate]);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (cartItems.length > 0) {
        try {
          const res = await fetch(`/restaurants/${cartItems[0].restaurantId}`);
          if (res.ok) {
            const data = await res.json();
            setRestaurant(data);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchRestaurantDetails();
  }, [cartItems]);

  useEffect(() => {
    const fetchTables = async () => {
      if (cartItems.length === 0 || !bookingDetails.arrivalDate || !bookingDetails.arrivalTime) return;
      const restaurantId = cartItems[0].restaurantId;
      setLoadingTables(true);
      try {
        const allRes = await fetch(`/restaurants/${restaurantId}/tables`);
        if (allRes.ok) {
          const allData = await allRes.json();
          setAllTables(allData);
        }

        const availRes = await fetch(`/restaurants/${restaurantId}/available-tables?date=${bookingDetails.arrivalDate}&time=${bookingDetails.arrivalTime}`);
        if (availRes.ok) {
          const availData = await availRes.json();
          setAvailableTables(availData);
        }
      } catch (err) {
        console.error('Error fetching tables:', err);
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTables();
  }, [cartItems, bookingDetails.arrivalDate, bookingDetails.arrivalTime]);

  // Load wallet balance for logged-in user
  useEffect(() => {
    if (user) {
      setWalletBalance(user.walletBalance || 0);
    }
  }, [user]);

  // Computed discount values
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const walletUsed = useWallet ? Math.min(walletBalance, Math.max(0, cartTotal - couponDiscount)) : 0;
  const finalTotal = Math.max(0, cartTotal - couponDiscount - walletUsed);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) { setCouponError('Please enter a coupon code.'); return; }
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/orders/apply-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode.trim().toUpperCase(), cartTotal })
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({ code: data.couponCode, discount: data.discount, message: data.message });
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message || 'Invalid coupon.');
      }
    } catch {
      setCouponError('Failed to validate coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleProceedToPayment = () => {
    if (!bookingDetails.tableId) {
      alert("Please select a table from the seating layout before proceeding to payment!");
      return;
    }
    // Store coupon & wallet info for payment page to pass to order creation
    sessionStorage.setItem('checkoutCouponCode', appliedCoupon ? appliedCoupon.code : '');
    sessionStorage.setItem('checkoutWalletUsed', useWallet ? walletUsed.toString() : '0');
    sessionStorage.setItem('checkoutFinalTotal', finalTotal.toString());
    navigate('/payment-page');
  };

  if (!user || cartItems.length === 0) return null;

  return (
    <main className="container animate-fade-in">
      <div className="section-title-container" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title">Order Checkout</h1>
        <p className="section-subtitle">Confirm your booking details and guest profile before payment</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        {/* Booking Details & User Profile summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* User Profile Info */}
          <div style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              👤 Guest Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.95rem' }}>
              <div><strong>Name:</strong> {user.name}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Phone:</strong> {user.phone}</div>
              <div><strong>Profile Address:</strong> {user.address}</div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.2rem' }}>
              * If you need to edit your profile, please update it on your <Link to="/profile-page" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Profile Page</Link>.
            </p>
          </div>

          {/* Dine-In Reservation Schedule */}
          <div style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              ⏰ Dine-In Reservation
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.95rem' }}>
              <div><strong>Restaurant:</strong> {restaurant ? restaurant.restaurantName : 'Loading...'}</div>
              <div><strong>Reservation Date:</strong> {bookingDetails.arrivalDate}</div>
              <div><strong>Arrival Time:</strong> {bookingDetails.arrivalTime}</div>
              <div><strong>Number of Diners:</strong> {bookingDetails.numberOfPeople} Guests</div>
              <div><strong>Assigned Table:</strong> {bookingDetails.tableNumber ? `${bookingDetails.tableNumber} (${bookingDetails.tableType})` : 'Not Selected'}</div>
              {bookingDetails.specialInstructions && (
                <div><strong>Special Requests:</strong> {bookingDetails.specialInstructions}</div>
              )}
            </div>
            <Link to="/cart-page" style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.85rem', display: 'inline-block', marginTop: '1rem' }}>
              ✏️ Modify Details
            </Link>
          </div>

          {/* Table Seating Map Selection Grid */}
          <div style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              🪑 Select Your Table
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: 1.4 }}>
              Choose a table matching your preference. <br />
              Legend: <span style={{ color: '#10b981', fontWeight: 'bold' }}>Green</span> (Available), <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Red</span> (Reserved), <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Blue</span> (Selected).
            </p>
            {loadingTables ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Loading restaurant seating layout...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {allTables.map(table => {
                  const isAvailable = availableTables.some(t => t.id === table.id);
                  const isSelected = bookingDetails.tableId === table.id;
                  
                  let bgColor = '#fee2e2'; // Reserved (light red)
                  let borderColor = '#ef4444';
                  let textColor = '#ef4444';
                  
                  if (isAvailable) {
                    bgColor = '#ecfdf5'; // Available (light green)
                    borderColor = '#10b981';
                    textColor = '#10b981';
                  }
                  
                  if (isSelected) {
                    bgColor = '#eff6ff'; // Selected (light blue)
                    borderColor = '#3b82f6';
                    textColor = '#3b82f6';
                  }
                  
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        if (!isAvailable) {
                          alert("This table is reserved during this time slot.");
                          return;
                        }
                        setBookingDetails(prev => ({
                          ...prev,
                          tableId: table.id,
                          tableNumber: table.tableNumber,
                          tableType: table.tableType,
                        }));
                      }}
                      style={{
                        padding: '1rem 0.5rem',
                        backgroundColor: bgColor,
                        border: `2px solid ${borderColor}`,
                        borderRadius: '12px',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.05)' : 'none',
                        boxShadow: isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🪑</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: textColor }}>{table.tableNumber}</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{table.tableType}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {bookingDetails.tableId ? (
              <div style={{ marginTop: '1.2rem', padding: '0.8rem', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6', fontSize: '0.85rem', fontWeight: 600 }}>
                Selected Seat: <strong style={{ color: '#3b82f6' }}>{bookingDetails.tableNumber} ({bookingDetails.tableType})</strong>
              </div>
            ) : (
              <div style={{ marginTop: '1.2rem', padding: '0.8rem', backgroundColor: '#fff7ed', borderRadius: '8px', borderLeft: '4px solid #f97316', fontSize: '0.85rem', fontWeight: 600, color: '#c2410c' }}>
                ⚠️ Please click on an available table from the seating layout above to reserve.
              </div>
            )}
          </div>
        </div>

        {/* Order Summary list */}
        <div className="checkout-card" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            🍽️ Order Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>
                    {item.foodName} <span style={{ color: 'var(--primary-color)' }}>x{item.quantity}</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>₹{item.totalPrice.toFixed(0)}</span>
                </div>
                {item.customizations && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.1rem' }}>
                    Preferences: {item.customizations}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>₹{cartTotal.toFixed(0)}</span>
            </div>
            {couponDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#16a34a' }}>
                <span>Coupon ({appliedCoupon.code}):</span>
                <span style={{ fontWeight: 600 }}>-₹{couponDiscount.toFixed(0)}</span>
              </div>
            )}
            {walletUsed > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#7c3aed' }}>
                <span>Wallet Applied:</span>
                <span style={{ fontWeight: 600 }}>-₹{walletUsed.toFixed(0)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
              <span>You Pay:</span>
              <span style={{ color: 'var(--primary-color)' }}>₹{finalTotal.toFixed(0)}</span>
            </div>
          </div>

          {/* Coupon Section */}
          <div style={{ marginBottom: '1rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.04)' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#f97316' }}>🏷️ Apply Coupon</h3>
            {!user?.firstOrderCompleted && (
              <p style={{ fontSize: '0.78rem', color: '#16a34a', marginBottom: '0.5rem', fontWeight: 600 }}>🎁 First order? Try code: <strong>NEWUSER25</strong> for 25% off!</p>
            )}
            {appliedCoupon ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, padding: '0.6rem 0.9rem', background: '#dcfce7', borderRadius: '8px', border: '1px solid #86efac', fontSize: '0.88rem', color: '#15803d', fontWeight: 600 }}>
                  ✓ {appliedCoupon.message}
                </div>
                <button onClick={handleRemoveCoupon} style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>✕ Remove</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', letterSpacing: '1px', fontWeight: 600 }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                />
                <button onClick={handleApplyCoupon} disabled={couponLoading} style={{ padding: '0.6rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#ef4444' }}>{couponError}</p>}
          </div>

          {/* Wallet Section */}
          {walletBalance > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: '0', fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed' }}>💜 Digital Wallet</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.8 }}>Available: <strong style={{ color: '#7c3aed' }}>₹{walletBalance.toFixed(0)}</strong></p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} style={{ accentColor: '#7c3aed', width: '1.1rem', height: '1.1rem' }} />
                  Use wallet balance
                </label>
              </div>
              {useWallet && walletUsed > 0 && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: '#7c3aed' }}>₹{walletUsed.toFixed(0)} will be deducted from your wallet at checkout.</p>
              )}
            </div>
          )}

          {/* Cancellation & No-Show Policy Box */}
          <div style={{
            marginTop: '1.5rem',
            marginBottom: '1.5rem',
            padding: '1.2rem',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.82rem',
            lineHeight: '1.5',
            textAlign: 'left'
          }}>
            <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🛡️ Dine-In Pre-Order Policy
            </h4>
            <p style={{ color: '#475569', marginBottom: '0.8rem', fontWeight: 600 }}>
              Cancel at least 30 minutes before your arrival time to avoid cancellation charges.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem' }}>
                ✓ Free Cancellation
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ffedd5', color: '#c2410c', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem' }}>
                ⚠ Late Cancel (10% Fee)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem' }}>
                ✗ No Show Penalty (20%)
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.6rem', fontStyle: 'italic' }}>
              * Policy applies ONLY to "Pay at Restaurant" reservations. Prepaid orders are not affected.
            </p>
          </div>

          <button 
            onClick={() => {
              sessionStorage.setItem('orderDiscounts', JSON.stringify({ coupon: appliedCoupon, useWallet, walletUsed }));
              handleProceedToPayment();
            }} 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 700 }}
          >
            Confirm & Pay ₹{finalTotal.toFixed(0)}
          </button>
        </div>
      </div>
    </main>
  );
}
