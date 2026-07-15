import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState({}); // { id: name }
  const [payments, setPayments] = useState({}); // { id: statusInfo }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForms, setReviewForms] = useState({}); // { orderId: { rating: 5, comment: '', submitted: false } }

  // Edit Order state
  const [editingOrder, setEditingOrder] = useState(null); // the order being edited
  const [editForm, setEditForm] = useState({ arrivalDate: '', arrivalTime: '', numberOfPeople: 2, paymentType: '' });
  const [editLoading, setEditLoading] = useState(false);


  useEffect(() => {
    if (!user) {
      navigate('/login-page');
    }
  }, [user, navigate]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/orders/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        // Sort descending by ID
        data.sort((a, b) => b.id - a.id);
        setOrders(data);

        // Fetch restaurants and payments details for these orders
        data.forEach(order => {
          if (order.restaurantId && !restaurants[order.restaurantId]) {
            fetch(`/restaurants/${order.restaurantId}`)
              .then(r => r.json())
              .then(rest => {
                setRestaurants(prev => ({ ...prev, [order.restaurantId]: rest.restaurantName }));
              })
              .catch(err => console.error(err));
          }

          fetch(`/payments/order/${order.id}`)
            .then(pr => {
              if (!pr.ok) throw new Error();
              return pr.json();
            })
            .then(payment => {
              if (payment && payment.paymentStatus === 'SUCCESS') {
                setPayments(prev => ({ 
                  ...prev, 
                  [order.id]: { success: true, text: `🟢 PAID via ${payment.paymentMethod}` } 
                }));
              } else {
                setPayments(prev => ({ 
                  ...prev, 
                  [order.id]: { success: false, text: '🔴 Unpaid / Payment Pending' } 
                }));
              }
            })
            .catch(() => {
              setPayments(prev => ({ 
                ...prev, 
                [order.id]: { success: false, text: '🟡 Pay via Restaurant' } 
              }));
            });
        });
      } else {
        setError('Failed to fetch orders.');
      }
    } catch (err) {
      console.error(err);
      setError('Server communication error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const [currentLiveTime, setCurrentLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelOrder = async (orderId) => {
    try {
      // 1. Get cancellation quote
      const quoteRes = await fetch(`/orders/${orderId}/cancellation-quote`);
      if (!quoteRes.ok) {
        throw new Error("Could not retrieve cancellation details.");
      }
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
        fetchOrders();
      } else {
        const errText = await res.text();
        alert(errText || 'Failed to cancel order.');
      }
    } catch (err) {
      console.error(err);
      alert('Error canceling order: ' + err.message);
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
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '12px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⏱️</span>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b45309', fontWeight: 700 }}>Order Acceptance</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#78350f', marginTop: '0.1rem' }}>
              Accepting automatically in: <span style={{ color: '#d97706' }}>{formatDiff(diffAccept)}</span>
            </div>
          </div>
        </div>
      );
    } else if (status === 'Accepted') {
      return (
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', padding: '1rem', borderRadius: '12px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⏳</span>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0369a1', fontWeight: 700 }}>Kitchen Preparation Countdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.3rem', fontSize: '0.9rem' }}>
              <div>Kitchen Starts In: <strong style={{ color: '#0284c7' }}>{formatDiff(diffPrepStart)}</strong></div>
              <div>Estimated Ready In: <strong style={{ color: '#0284c7' }}>{formatDiff(diffReady)}</strong></div>
            </div>
          </div>
        </div>
      );
    } else if (status === 'Preparing') {
      return (
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '1rem', borderRadius: '12px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '1.5rem' }} className="pulse">🔥</span>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#c2410c', fontWeight: 700 }}>Cooking In Progress</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#9a3412', marginTop: '0.1rem' }}>
              Fresh food ready in: <span style={{ color: '#ea580c' }}>{formatDiff(diffReady)}</span>
            </div>
          </div>
        </div>
      );
    } else if (status === 'Ready to Serve') {
      return (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', padding: '1.2rem', borderRadius: '12px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🎉</span>
          <div>
            <div style={{ fontSize: '0.95rem', color: '#166534', fontWeight: 800 }}>Your Dine-In Pre-Order is Ready!</div>
            <p style={{ color: '#15803d', fontSize: '0.85rem', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
              Walk in, head to your table <strong>{order.tableNumber || 'Standard'}</strong>, and get served immediately! Pay at counter after dining.
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper: can the customer still edit this order?
  const canEdit = (order) => {
    const editableStatuses = ['Pending', 'Accepted'];
    if (!editableStatuses.includes(order.orderStatus)) return false;
    if (!order.arrivalDate || !order.arrivalTime) return false;
    try {
      const arrival = new Date(`${order.arrivalDate}T${order.arrivalTime}`);
      const cutoff = new Date(arrival.getTime() - 90 * 60 * 1000); // 90 min
      return new Date() < cutoff;
    } catch { return false; }
  };

  const handleEditOrder = async () => {
    if (!editingOrder) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/orders/${editingOrder.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        alert('✅ Order updated successfully!');
        setEditingOrder(null);
        fetchOrders();
      } else {
        const msg = await res.text();
        alert(msg || 'Failed to update order.');
      }
    } catch (err) {
      alert('Error updating order: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  if (!user) return null;


  return (
    <main className="container animate-fade-in">
      <div className="section-title-container" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title">My Bookings & Orders</h1>
        <p className="section-subtitle">Track your dine-in arrival countdown and food status</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading reservations...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger-color)', fontWeight: 700 }}>
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-color)', borderRadius: '16px', backgroundColor: 'white' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>📦</span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Bookings Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>You haven't reserved any dine-in tables yet.</p>
          <Link to="/restaurants-page" className="btn btn-primary">Browse Restaurants & Pre-Order</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {orders.map((order) => {
            const isPending = order.orderStatus === 'Pending';
            const payInfo = payments[order.id] || { success: false, text: 'Checking...' };

            return (
              <div key={order.id} className="order-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="order-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <span className="order-card-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Order #{order.id}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.1rem' }}>
                    {restaurants[order.restaurantId] ? `🍽️ ${restaurants[order.restaurantId]}` : '🍽️ Partner Restaurant'}
                  </span>
                </div>
                
                <div className="order-card-body">
                  <div className="order-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="order-info-item">
                      <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Dine-In Arrival</div>
                      <div className="order-info-value" style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        {order.arrivalDate} at <strong>{order.arrivalTime}</strong>
                      </div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Guests</div>
                      <div className="order-info-value" style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        👥 {order.numberOfPeople} People
                      </div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Preparation Buffer</div>
                      <div className="order-info-value" style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        🕒 {order.estimatedPreparationTime} mins
                      </div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Table Assigned</div>
                      <div className="order-info-value" style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        🪑 {order.tableNumber ? `${order.tableNumber} (${order.tableType})` : 'Standard Table'}
                      </div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Grand Total</div>
                      <div className="order-info-value" style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-color)', marginTop: '0.2rem' }}>
                        ₹{order.totalAmount.toFixed(0)}
                      </div>
                    </div>
                    {order.cancellationFee > 0 && (
                      <div className="order-info-item">
                        <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-color)', letterSpacing: '1px', textTransform: 'uppercase' }}>Cancellation Fee</div>
                        <div className="order-info-value" style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--danger-color)', marginTop: '0.2rem' }}>
                          ₹{order.cancellationFee.toFixed(0)} {order.penaltyWaived && <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>(Waived)</span>}
                        </div>
                      </div>
                    )}
                    {order.noShowPenalty > 0 && (
                      <div className="order-info-item">
                        <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-color)', letterSpacing: '1px', textTransform: 'uppercase' }}>No-Show Penalty</div>
                        <div className="order-info-value" style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--danger-color)', marginTop: '0.2rem' }}>
                          ₹{order.noShowPenalty.toFixed(0)} {order.penaltyWaived && <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>(Waived)</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="order-info-item" style={{ marginBottom: '1.2rem' }}>
                    <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Ordered Dishes</div>
                    <div className="order-info-value" style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}>
                      {order.itemsText || 'Food Menu Items'}
                    </div>
                  </div>

                  <div className="order-info-item" style={{ marginBottom: '1.2rem' }}>
                    <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Special Instructions</div>
                    <div className="order-info-value" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                      "{order.specialInstructions || 'None'}"
                    </div>
                  </div>

                  <div className="order-info-item" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div>
                      <div className="order-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Payment Details</div>
                      <div className="order-info-value" style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        <span style={{ color: 'var(--primary-color)' }}>{order.paymentType || 'Prepaid'}</span> — {payInfo.text}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {canEdit(order) && (
                        <button
                          onClick={() => {
                            setEditingOrder(order);
                            setEditForm({
                              arrivalDate: order.arrivalDate || '',
                              arrivalTime: order.arrivalTime || '',
                              numberOfPeople: order.numberOfPeople || 2,
                              paymentType: order.paymentType || 'Pay at Restaurant'
                            });
                          }}
                          className="btn"
                          style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #bfdbfe', fontWeight: 700, cursor: 'pointer' }}
                        >
                          ✏️ Edit Order
                        </button>
                      )}
                      {(order.orderStatus === 'Pending' || order.orderStatus === 'Accepted' || order.orderStatus === 'Preparing' || order.orderStatus.toLowerCase().includes('ready')) && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="btn"
                          style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Cancel Reservation
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timeline Tracker */}
                  <div style={{ marginTop: '2rem' }}>
                    {getCountdownInfo(order, currentLiveTime)}
                    <div style={{ marginTop: '1.5rem' }}>
                      {getTimelineSteps(order.orderStatus)}
                    </div>
                  </div>

                  {/* Review / Feedback Section for Completed orders */}
                  {order.orderStatus === 'Completed' && (
                    <div style={{ marginTop: '2rem', padding: '1.2rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>⭐ Rate Your Dining Experience</h4>
                      {reviewForms[order.id]?.submitted ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 600 }}>Thank you for your feedback! Your review has been saved.</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Rating:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForms(prev => ({
                                  ...prev,
                                  [order.id]: { ...(prev[order.id] || { rating: 5, comment: '' }), rating: star }
                                }))}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                              >
                                {star <= (reviewForms[order.id]?.rating || 5) ? '★' : '☆'}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="Write your review here..."
                              value={reviewForms[order.id]?.comment || ''}
                              onChange={(e) => setReviewForms(prev => ({
                                ...prev,
                                [order.id]: { ...(prev[order.id] || { rating: 5, comment: '' }), comment: e.target.value }
                              }))}
                              style={{ flexGrow: 1, padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.85rem' }}
                            />
                            <button
                              onClick={async () => {
                                const form = reviewForms[order.id] || { rating: 5, comment: '' };
                                if (!form.comment || !form.comment.trim()) {
                                  alert("Please enter a review comment.");
                                  return;
                                }
                                try {
                                  const res = await fetch(`/restaurants/${order.restaurantId}/reviews`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ rating: form.rating, comment: form.comment })
                                  });
                                  if (res.ok) {
                                    setReviewForms(prev => ({
                                      ...prev,
                                      [order.id]: { ...form, submitted: true }
                                    }));
                                  } else {
                                    alert("Failed to submit review.");
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }}
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== Edit Order Modal ====== */}
      {editingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setEditingOrder(null)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '480px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>✏️ Edit Order #{editingOrder.id}</h2>
              <button onClick={() => setEditingOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', padding: '0.6rem 0.9rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              ℹ️ Editing is allowed up to <strong>1 hr 30 min</strong> before arrival time and before kitchen prep begins.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Arrival Date</label>
                <input type="date" value={editForm.arrivalDate} onChange={e => setEditForm(p => ({ ...p, arrivalDate: e.target.value }))} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Arrival Time</label>
                <input type="time" value={editForm.arrivalTime} onChange={e => setEditForm(p => ({ ...p, arrivalTime: e.target.value }))} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Number of Guests</label>
                <input type="number" min="1" max="20" value={editForm.numberOfPeople} onChange={e => setEditForm(p => ({ ...p, numberOfPeople: parseInt(e.target.value) || 1 }))} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Payment Method</label>
                <select value={editForm.paymentType} onChange={e => setEditForm(p => ({ ...p, paymentType: e.target.value }))} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>
                  <option value="Pay at Restaurant">Pay at Restaurant</option>
                  <option value="Prepaid (Online)">Prepaid (Online)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button onClick={() => setEditingOrder(null)} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
              <button onClick={handleEditOrder} disabled={editLoading} className="btn btn-primary" style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', fontWeight: 700 }}>
                {editLoading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
