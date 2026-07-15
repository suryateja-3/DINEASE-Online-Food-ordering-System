import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
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

  // Tab state
  const [activeTab, setActiveTab] = useState('details'); // details, favorites, payments, upcoming, cancellations, noshows, penalties
  const [favorites, setFavorites] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reservation list state
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [currentLiveTime, setCurrentLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login-page');
      return;
    }
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setAddress(user.address || '');
  }, [user, navigate]);

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/restaurants/favorites/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (err) {
      console.error("Error loading favorites:", err);
    }
  };

  const loadPaymentHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const ordersRes = await fetch(`/orders/user/${user.id}`);
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const list = [];
        for (const order of orders) {
          try {
            const payRes = await fetch(`/payments/order/${order.id}`);
            if (payRes.ok) {
              const pay = await payRes.json();
              list.push({
                orderId: order.id,
                amount: pay.amount,
                method: pay.paymentMethod,
                status: pay.paymentStatus,
                date: order.arrivalDate
              });
            } else {
              list.push({
                orderId: order.id,
                amount: order.totalAmount,
                method: "Cash at Restaurant",
                status: "PENDING",
                date: order.arrivalDate
              });
            }
          } catch (e) {
            console.error(e);
          }
        }
        list.sort((a, b) => b.orderId - a.orderId);
        setPaymentHistory(list);
      }
    } catch (err) {
      console.error("Error loading payment history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadUserOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`/orders/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => b.id - a.id);
        setUserOrders(data);
      }
    } catch (err) {
      console.error("Error loading user orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'favorites') {
      loadFavorites();
    } else if (activeTab === 'payments') {
      loadPaymentHistory();
    } else if (['upcoming', 'cancellations', 'noshows', 'penalties'].includes(activeTab)) {
      loadUserOrders();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) return;
    if (['upcoming', 'cancellations', 'noshows', 'penalties'].includes(activeTab)) {
      const interval = setInterval(loadUserOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  const handleCancelReservationInProfile = async (orderId) => {
    try {
      const quoteRes = await fetch(`/orders/${orderId}/cancellation-quote`);
      if (!quoteRes.ok) throw new Error("Could not retrieve cancellation details.");
      const quote = await quoteRes.json();
      
      let confirmMsg = "Are you sure you want to cancel this reservation?";
      if (quote.fee > 0) {
        confirmMsg = `⚠️ Late Cancellation Policy Warning:\n\nSince this cancellation is within 30 minutes of your arrival time, a late cancellation fee of 10% (₹${quote.fee.toFixed(0)}) will be applied to your account.\n\nDo you want to cancel and accept this fee?`;
      } else {
        confirmMsg = `Are you sure you want to cancel this reservation? (Free Cancellation)`;
      }

      if (!window.confirm(confirmMsg)) return;

      const res = await fetch(`/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        // Refresh orders and reload context user to update penalty statement
        const ordersRes = await fetch(`/orders/user/${user.id}`);
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          data.sort((a, b) => b.id - a.id);
          setUserOrders(data);
        }
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        const errText = await res.text();
        alert(errText || 'Failed to cancel reservation.');
      }
    } catch (err) {
      alert('Error canceling reservation: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !phone || !address) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const profilePayload = {
      name,
      email,
      phone,
      address,
      password: password || undefined,
    };

    const res = await updateProfile(profilePayload);
    setLoading(false);
    if (res.success) {
      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(res.message);
    }
  };

  const getTimelineSteps = (status) => {
    const normStatus = status ? status.toLowerCase() : 'pending';
    
    if (normStatus.includes('cancel') || normStatus.includes('no show') || normStatus.includes('show')) {
      return (
        <div className="status-timeline">
          <div className="timeline-step completed">
            <div className="step-bullet">✓</div>
            <div className="step-label">Pending</div>
          </div>
          <div className="timeline-step cancelled">
            <div className="step-bullet">✗</div>
            <div className="step-label" style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{status}</div>
          </div>
        </div>
      );
    }
 
    const steps = ['pending', 'accepted', 'preparing', 'ready to serve', 'completed'];
    const labels = ['Pending', 'Accepted', 'Preparing', 'Ready to Serve', 'Completed'];
    
    let activeIdx = steps.indexOf(normStatus);
    if (activeIdx === -1) {
      if (normStatus.includes('ready')) activeIdx = 3;
      else activeIdx = 0;
    }
 
    return (
      <div className="status-timeline">
        {steps.map((step, idx) => {
          let stepClass = '';
          let bullet = idx + 1;
          if (idx < activeIdx) {
            stepClass = 'completed';
            bullet = '✓';
          } else if (idx === activeIdx) {
            stepClass = 'active';
          }
          return (
            <div key={step} className={`timeline-step ${stepClass}`}>
              <div className="step-bullet">{bullet}</div>
              <div className="step-label">{labels[idx]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const getCountdownInfo = (order, now) => {
    if (!order.preparationStartTime || !order.readyTime) {
      return null;
    }

    const prepStart = new Date(order.preparationStartTime);
    const ready = new Date(order.readyTime);
    const accept = new Date(order.acceptedTime || new Date());

    const diffPrepStart = prepStart - now;
    const diffReady = ready - now;
    const diffAccept = accept - now;

    const formatDiff = (diffMs) => {
      if (diffMs <= 0) return "0s";
      const totalSecs = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      if (mins > 0) {
        return `${mins}m ${secs}s`;
      }
      return `${secs}s`;
    };

    const status = order.orderStatus;
    if (status === 'Pending') {
      return (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.8rem', borderRadius: '12px', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⏱️</span>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b45309', fontWeight: 700 }}>Acceptance countdown</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#78350f', marginTop: '0.1rem' }}>
              Accepting automatically in: <span style={{ color: '#d97706' }}>{formatDiff(diffAccept)}</span>
            </div>
          </div>
        </div>
      );
    } else if (status === 'Accepted') {
      return (
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', padding: '0.8rem', borderRadius: '12px', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⏳</span>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0369a1', fontWeight: 700 }}>Kitchen Preparation Countdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.8rem' }}>
              <div>Kitchen Starts: <strong style={{ color: '#0284c7' }}>{formatDiff(diffPrepStart)}</strong></div>
              <div>Estimated Ready: <strong style={{ color: '#0284c7' }}>{formatDiff(diffReady)}</strong></div>
            </div>
          </div>
        </div>
      );
    } else if (status === 'Preparing') {
      return (
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.8rem', borderRadius: '12px', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.2rem' }} className="pulse">🔥</span>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#c2410c', fontWeight: 700 }}>Cooking In Progress</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9a3412', marginTop: '0.1rem' }}>
              Fresh food ready in: <span style={{ color: '#ea580c' }}>{formatDiff(diffReady)}</span>
            </div>
          </div>
        </div>
      );
    } else if (status === 'Ready to Serve') {
      return (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', padding: '1rem', borderRadius: '12px', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🎉</span>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 800 }}>Your Dine-In Pre-Order is Ready!</div>
            <p style={{ color: '#15803d', fontSize: '0.78rem', margin: '0.1rem 0 0', lineHeight: 1.4 }}>
              Walk in, head to table <strong>{order.tableNumber || 'Standard'}</strong>, and get served immediately!
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!user) return null;

  return (
    <main className="container animate-fade-in" style={{ maxWidth: '600px', marginTop: '2rem' }}>
      <div className="login-card" style={{ padding: '2.5rem', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
        <h1 className="login-title" style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800 }}>My Account</h1>
        <p className="login-subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>Manage your profile settings, favorites, and reservations</p>

        {/* Tab Selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.8rem' }}>
          <button onClick={() => setActiveTab('details')} className={`btn ${activeTab === 'details' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            👤 Profile
          </button>
          <button onClick={() => setActiveTab('upcoming')} className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            📅 Upcoming
          </button>
          <button onClick={() => setActiveTab('cancellations')} className={`btn ${activeTab === 'cancellations' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            ➦ Cancellations
          </button>
          <button onClick={() => setActiveTab('noshows')} className={`btn ${activeTab === 'noshows' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            ✗ No-Shows
          </button>
          <button onClick={() => setActiveTab('penalties')} className={`btn ${activeTab === 'penalties' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            ⚠️ Penalties
          </button>
          <button onClick={() => setActiveTab('favorites')} className={`btn ${activeTab === 'favorites' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            ❤️ Favorites
          </button>
          <button onClick={() => setActiveTab('payments')} className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            💳 Billing
          </button>
          <button onClick={() => setActiveTab('wallet')} className={`btn ${activeTab === 'wallet' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem' }}>
            💜 Wallet & Rewards
          </button>
        </div>

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

        {activeTab === 'details' && (
          <div>
            <div style={{ 
              backgroundColor: (user.totalPenalty && user.totalPenalty > 0) ? '#fff1f2' : '#f0fdf4', 
              color: (user.totalPenalty && user.totalPenalty > 0) ? '#b91c1c' : '#166534', 
              padding: '1rem', 
              borderRadius: '12px', 
              border: `1px solid ${(user.totalPenalty && user.totalPenalty > 0) ? '#fecdd3' : '#bbf7d0'}`, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {(user.totalPenalty && user.totalPenalty > 0) ? '🛡️ Outstanding Penalty Balance:' : '🛡️ Penalty Status:'}
                </strong>
                <p style={{ fontSize: '0.72rem', color: (user.totalPenalty && user.totalPenalty > 0) ? '#9f1239' : '#15803d', marginTop: '0.15rem' }}>
                  {(user.totalPenalty && user.totalPenalty > 0) ? 'Fees applied for late cancellations or no-show reservations.' : 'No outstanding dine-in penalties.'}
                </p>
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>₹{user.totalPenalty ? user.totalPenalty.toFixed(0) : '0'}</span>
            </div>

            <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Booking Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                required
              />
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-color)' }}>Change Password (Optional)</h3>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>New Password</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

        {activeTab === 'favorites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {favorites.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No bookmarked restaurants yet.</p>
            ) : (
              favorites.map(rest => (
                <div key={rest.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{rest.restaurantName}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>{rest.cuisine} | ⭐ {rest.rating ? rest.rating.toFixed(1) : 'New'}</p>
                  </div>
                  <Link to={`/restaurant-details-page?restaurantId=${rest.id}`} className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}>
                    View Menu
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            {loadingOrders ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>Loading upcoming reservations...</p>
            ) : userOrders.filter(o => ['Pending', 'Accepted', 'Preparing', 'Ready', 'Ready to Serve'].includes(o.orderStatus)).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📅</span>
                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No active upcoming reservations.</p>
                <Link to="/restaurants-page" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px' }}>Book Dine-In Now</Link>
              </div>
            ) : (
              userOrders.filter(o => ['Pending', 'Accepted', 'Preparing', 'Ready', 'Ready to Serve'].includes(o.orderStatus)).map(order => (
                <div key={order.id} style={{ padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>Reservation #{order.id}</strong>
                    <span style={{
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.72rem'
                    }}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div>📅 <strong>Date:</strong> {order.arrivalDate}</div>
                    <div>🕒 <strong>Time:</strong> {order.arrivalTime}</div>
                    <div>👥 <strong>Guests:</strong> {order.guestsCount || order.numberOfPeople} guests</div>
                    <div>🪑 <strong>Seat:</strong> {order.tableNumber || 'Standard Table'}</div>
                  </div>
                  <div style={{ padding: '0.5rem 0', borderTop: '1px solid #f1f5f9' }}>
                    {getCountdownInfo(order, currentLiveTime)}
                    <div style={{ marginTop: '0.8rem', marginBottom: '0.8rem' }}>
                      {getTimelineSteps(order.orderStatus)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span>Method: <strong>{order.paymentType || 'Prepaid'}</strong></span>
                      <br/>
                      <span>Total: <strong style={{ color: 'var(--primary-color)' }}>₹{order.totalAmount.toFixed(0)}</strong></span>
                    </div>
                    {['Pending', 'Accepted', 'Preparing', 'Ready', 'Ready to Serve'].includes(order.orderStatus) && (
                      <button
                        onClick={() => handleCancelReservationInProfile(order.id)}
                        className="btn"
                        style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      >
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'cancellations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            {loadingOrders ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>Loading cancellations...</p>
            ) : userOrders.filter(o => o.orderStatus.toLowerCase().includes('cancel')).length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No cancellations recorded.</p>
            ) : (
              userOrders.filter(o => o.orderStatus.toLowerCase().includes('cancel')).map(order => (
                <div key={order.id} style={{ padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>Reservation #{order.id}</strong>
                    <span style={{
                      backgroundColor: order.orderStatus.includes('10%') ? '#ffedd5' : '#f1f5f9',
                      color: order.orderStatus.includes('10%') ? '#c2410c' : '#475569',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.72rem'
                    }}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div>📅 <strong>Original Arrival:</strong> {order.arrivalDate} at {order.arrivalTime}</div>
                    <div>💰 <strong>Total Amount:</strong> ₹{order.totalAmount.toFixed(0)}</div>
                    <div>🛡️ <strong>Method:</strong> {order.paymentType || 'Prepaid'}</div>
                    <div style={{ color: 'var(--danger-color)', fontWeight: 600 }}>
                      ⚠ <strong>Cancellation Fee:</strong> ₹{order.cancellationFee ? order.cancellationFee.toFixed(0) : '0'} 
                      {order.penaltyWaived && <span style={{ textDecoration: 'line-through', color: '#64748b', marginLeft: '0.3rem' }}>(Waived)</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'noshows' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            {loadingOrders ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>Loading no-shows...</p>
            ) : userOrders.filter(o => o.orderStatus.toLowerCase().includes('no show')).length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No "No-Show" reservations recorded. Good job!</p>
            ) : (
              userOrders.filter(o => o.orderStatus.toLowerCase().includes('no show')).map(order => (
                <div key={order.id} style={{ padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>Reservation #{order.id}</strong>
                    <span style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.72rem'
                    }}>
                      No Show
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div>📅 <strong>Missed Arrival:</strong> {order.arrivalDate} at {order.arrivalTime}</div>
                    <div>💰 <strong>Order Total:</strong> ₹{order.totalAmount.toFixed(0)}</div>
                    <div>🛡️ <strong>Method:</strong> {order.paymentType || 'Prepaid'}</div>
                    <div style={{ color: 'var(--danger-color)', fontWeight: 700 }}>
                      ⚠ <strong>No-Show Penalty (20%):</strong> ₹{order.noShowPenalty ? order.noShowPenalty.toFixed(0) : '0'}
                      {order.penaltyWaived && <span style={{ textDecoration: 'line-through', color: '#64748b', marginLeft: '0.3rem' }}>(Waived)</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'penalties' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Penalty Balance:</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: (user.totalPenalty && user.totalPenalty > 0) ? '#b91c1c' : '#15803d', marginTop: '0.2rem' }}>
                ₹{user.totalPenalty ? user.totalPenalty.toFixed(0) : '0'}
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem', lineHeight: '1.4' }}>
                * Outstanding penalty charges must be cleared. If you think there's a mistake, contact restaurant management to request a waive.
              </p>
            </div>

            {loadingOrders ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>Loading penalty statements...</p>
            ) : userOrders.filter(o => (o.cancellationFee > 0 || o.noShowPenalty > 0)).length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No penalty charges recorded on your profile.</p>
            ) : (
              userOrders.filter(o => (o.cancellationFee > 0 || o.noShowPenalty > 0)).map(order => {
                const isNoShow = order.noShowPenalty > 0;
                const charge = isNoShow ? order.noShowPenalty : order.cancellationFee;
                return (
                  <div key={order.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white', borderLeft: `4px solid ${order.penaltyWaived ? '#94a3b8' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{isNoShow ? '✗ No-Show Penalty' : '⚠ Late Cancel Fee'} (Order #{order.id})</strong>
                      <span style={{
                        backgroundColor: order.penaltyWaived ? '#f1f5f9' : '#fee2e2',
                        color: order.penaltyWaived ? '#475569' : '#b91c1c',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.68rem'
                      }}>
                        {order.penaltyWaived ? 'Waived' : 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      📅 reservation: {order.arrivalDate} at {order.arrivalTime} | Amount: <strong>₹{charge.toFixed(0)}</strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div style={{ overflowX: 'auto' }}>
            {loadingHistory ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>Loading billing statements...</p>
            ) : paymentHistory.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No payment transaction logs found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: '#64748b' }}>
                    <th style={{ padding: '0.5rem' }}>Order ID</th>
                    <th style={{ padding: '0.5rem' }}>Date</th>
                    <th style={{ padding: '0.5rem' }}>Method</th>
                    <th style={{ padding: '0.5rem' }}>Amount</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(pay => (
                    <tr key={pay.orderId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold' }}>#{pay.orderId}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{pay.date}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{pay.method}</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>₹{pay.amount.toFixed(0)}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <span style={{
                          backgroundColor: pay.status === 'SUCCESS' ? '#dcfce7' : '#ffedd5',
                          color: pay.status === 'SUCCESS' ? '#15803d' : '#c2410c',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.75rem'
                        }}>
                          {pay.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'wallet' && (
          <div>
            {/* Wallet Balance Card */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #db2777 100%)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.25rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: '160px', height: '160px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%', pointerEvents: 'none' }} />
              <p style={{ margin: '0', fontSize: '0.8rem', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px' }}>Wallet Balance</p>
              <p style={{ margin: '0.3rem 0 0.1rem', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px' }}>₹{(user.walletBalance || 0).toFixed(2)}</p>
              <p style={{ margin: '0', fontSize: '0.8rem', opacity: 0.65 }}>Available for your next order</p>
            </div>

            {/* Quick Links Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <Link to="/wallet-page" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '1.25rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', transition: 'background 0.2s' }}>
                <span style={{ fontSize: '1.4rem' }}>📋</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#4f46e5' }}>Transactions</span>
                <span style={{ fontSize: '0.77rem', opacity: 0.6 }}>View full history</span>
              </Link>
              <Link to="/wallet-page" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '1.25rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', transition: 'background 0.2s' }}>
                <span style={{ fontSize: '1.4rem' }}>🔗</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#d97706' }}>Referral Code</span>
                <span style={{ fontSize: '0.77rem', opacity: 0.6, letterSpacing: '1px', fontWeight: 700, color: '#f59e0b' }}>{user.referralCode || 'Generating...'}</span>
              </Link>
            </div>

            {/* Promo Cards */}
            <div style={{ padding: '1.25rem', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ margin: '0', fontWeight: 700, fontSize: '0.95rem', color: '#16a34a' }}>🎁 NEWUSER25 — First Order Offer</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', opacity: 0.7 }}>25% off your first order (max ₹1000)</p>
                </div>
                {user.firstOrderCompleted ? (
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', background: 'rgba(156,163,175,0.2)', color: '#6b7280', borderRadius: '20px', fontWeight: 700 }}>Used</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', background: 'rgba(34,197,94,0.12)', color: '#16a34a', borderRadius: '20px', fontWeight: 700 }}>Available</span>
                )}
              </div>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(79,70,229,0.04)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '12px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.95rem', color: '#4f46e5' }}>💰 Refer & Earn — ₹200 per friend</p>
              <p style={{ margin: '0', fontSize: '0.8rem', opacity: 0.7 }}>Your code: <strong style={{ letterSpacing: '1px' }}>{user.referralCode || '...'}</strong>. When friends complete their first order, ₹200 is credited instantly.</p>
            </div>

            <Link to="/wallet-page" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0.75rem', fontWeight: 700, marginTop: '0.5rem', textDecoration: 'none' }}>
              Open Full Wallet Dashboard →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
