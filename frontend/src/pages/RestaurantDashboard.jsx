import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Protect route
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        setError('Failed to fetch kitchen orders.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error while fetching kitchen orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const txt = await res.text();
        alert(txt || 'Failed to update order state.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating status.');
    }
  };

  if (!user || user.role !== 'ADMIN') return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.arrivalDate === todayStr);

  // Grouping today's orders
  const currentPreparing = todayOrders.filter(o => o.orderStatus === 'Preparing');
  const startingSoon = todayOrders.filter(o => o.orderStatus === 'Accepted');
  const readyForCustomers = todayOrders.filter(o => o.orderStatus === 'Ready to Serve');
  const completedOrders = todayOrders.filter(o => o.orderStatus === 'Completed');

  // Today's Kitchen Timeline (Pending, Accepted, Preparing, Ready, Completed) sorted by arrivalTime
  const timelineOrders = [...todayOrders].sort((a, b) => {
    const timeA = a.arrivalTime || '';
    const timeB = b.arrivalTime || '';
    return timeA.localeCompare(timeB);
  });

  return (
    <main style={{ backgroundColor: '#0f172a', color: '#cbd5e1', minHeight: '90vh', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>🍳 Kitchen Dashboard</h1>
          <p style={{ color: '#94a3b8', margin: '0.2rem 0 0' }}>Dine-In Pre-Ordering Live Operations Portal</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1.1rem' }}>
            🕒 {currentTime.toLocaleTimeString()}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
            📅 Today: {todayStr}
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '8px', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading Kitchen Logs...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Real-time Category Grids */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* 1. STARTING SOON (Accepted) */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', borderTop: '4px solid #38bdf8' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⏳ Starting Soon</span>
                <span style={{ fontSize: '0.85rem', backgroundColor: '#0369a1', color: '#e0f2fe', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  {startingSoon.length}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {startingSoon.length === 0 ? (
                  <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>No orders scheduled to start soon.</p>
                ) : (
                  startingSoon.map(o => (
                    <div key={o.id} style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>#{o.id}</span>
                        <span style={{ color: '#38bdf8', fontSize: '0.85rem' }}>Prep Start: {o.preparationStartTime ? o.preparationStartTime.split('T')[1].substring(0, 5) : 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                        <div style={{ color: '#94a3b8' }}>Items: {o.itemsText}</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>Arrival: <strong>{o.arrivalTime}</strong> ({o.totalPreparationTime}m prep)</div>
                      </div>
                      <button 
                        onClick={() => updateStatus(o.id, 'Preparing')}
                        style={{ width: '100%', padding: '0.4rem', border: 'none', borderRadius: '4px', backgroundColor: '#0284c7', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                      >
                        🔥 Start Preparing
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. PREPARING NOW (Preparing) */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', borderTop: '4px solid #f97316' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔥 Preparing Now</span>
                <span style={{ fontSize: '0.85rem', backgroundColor: '#7c2d12', color: '#ffedd5', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  {currentPreparing.length}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentPreparing.length === 0 ? (
                  <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>No orders currently cooking.</p>
                ) : (
                  currentPreparing.map(o => (
                    <div key={o.id} style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>#{o.id}</span>
                        <span style={{ color: '#f97316', fontSize: '0.85rem', fontWeight: 700 }} className="pulse">Preparing...</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                        <div style={{ color: '#94a3b8' }}>Items: {o.itemsText}</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>Ready Time: <strong>{o.arrivalTime}</strong></div>
                      </div>
                      <button 
                        onClick={() => updateStatus(o.id, 'Ready to Serve')}
                        style={{ width: '100%', padding: '0.4rem', border: 'none', borderRadius: '4px', backgroundColor: '#ea580c', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                      >
                        ✅ Mark Ready to Serve
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. READY TO SERVE (Ready to Serve) */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', borderTop: '4px solid #22c55e' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🍽️ Ready for Customers</span>
                <span style={{ fontSize: '0.85rem', backgroundColor: '#14532d', color: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  {readyForCustomers.length}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {readyForCustomers.length === 0 ? (
                  <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>No orders waiting to be served.</p>
                ) : (
                  readyForCustomers.map(o => (
                    <div key={o.id} style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>#{o.id}</span>
                        <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>Ready to Serve</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                        <div style={{ color: '#94a3b8' }}>Items: {o.itemsText}</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>Table: <strong>{o.tableNumber || 'Standard'}</strong></div>
                      </div>
                      <button 
                        onClick={() => updateStatus(o.id, 'Completed')}
                        style={{ width: '100%', padding: '0.4rem', border: 'none', borderRadius: '4px', backgroundColor: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                      >
                        🏁 Completed (Served)
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </section>

          {/* Today's Kitchen Timeline */}
          <section style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.8rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📅</span> Today's Kitchen Timeline ({timelineOrders.length} bookings)
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Order ID</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Items</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Prep Starts</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Arrival / Ready</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Table</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timelineOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                        No bookings scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    timelineOrders.map(o => {
                      let badgeBg = '#475569';
                      let badgeColor = '#f1f5f9';
                      if (o.orderStatus === 'Pending') { badgeBg = '#854d0e'; badgeColor = '#fef9c3'; }
                      else if (o.orderStatus === 'Accepted') { badgeBg = '#0369a1'; badgeColor = '#e0f2fe'; }
                      else if (o.orderStatus === 'Preparing') { badgeBg = '#7c2d12'; badgeColor = '#ffedd5'; }
                      else if (o.orderStatus === 'Ready to Serve') { badgeBg = '#14532d'; badgeColor = '#dcfce7'; }
                      else if (o.orderStatus === 'Completed') { badgeBg = '#1e293b'; badgeColor = '#94a3b8'; }

                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid #334155', fontSize: '0.9rem' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#f8fafc' }}>#{o.id}</td>
                          <td style={{ padding: '1rem', color: '#cbd5e1' }}>{o.itemsText}</td>
                          <td style={{ padding: '1rem', color: '#38bdf8' }}>{o.preparationStartTime ? o.preparationStartTime.split('T')[1].substring(0, 5) : 'N/A'}</td>
                          <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>{o.arrivalTime}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              {o.orderStatus}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: '#cbd5e1' }}>{o.tableNumber || 'Standard'}</td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {o.orderStatus === 'Accepted' && (
                                <button onClick={() => updateStatus(o.id, 'Preparing')} style={{ padding: '0.2rem 0.5rem', border: 'none', borderRadius: '4px', backgroundColor: '#0284c7', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                                  Start Prep
                                </button>
                              )}
                              {o.orderStatus === 'Preparing' && (
                                <button onClick={() => updateStatus(o.id, 'Ready to Serve')} style={{ padding: '0.2rem 0.5rem', border: 'none', borderRadius: '4px', backgroundColor: '#ea580c', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                                  Mark Ready
                                </button>
                              )}
                              {o.orderStatus === 'Ready to Serve' && (
                                <button onClick={() => updateStatus(o.id, 'Completed')} style={{ padding: '0.2rem 0.5rem', border: 'none', borderRadius: '4px', backgroundColor: '#16a34a', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Historical Completed / Cancelled Today */}
          <section style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1rem' }}>🏁 Completed / Historical Orders Today ({completedOrders.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {completedOrders.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>No orders completed yet today.</p>
              ) : (
                completedOrders.map(o => (
                  <div key={o.id} style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>Order #{o.id}</span>
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Items: {o.itemsText}</div>
                    </div>
                    <span style={{ fontSize: '0.8rem', backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                      Completed
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
