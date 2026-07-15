import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Starter', 'Main Course', 'Dessert', 'Beverage'];
const STATUSES = [
  'Pending', 
  'Accepted', 
  'Preparing', 
  'Ready', 
  'Completed', 
  'Cancelled', 
  'Late Cancelled (10% Fee)', 
  'No Show (20% Penalty)'
];

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, bookings, restaurants, items, users, reports
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [tables, setTables] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter states
  const [statusFilter, setStatusFilter] = useState('All');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  
  // No-Show sweep simulation state
  const [runningSweep, setRunningSweep] = useState(false);

  // Timing/Timing updates state
  const [timingTriggerLog, setTimingTriggerLog] = useState('');

  // Form states
  const [restForm, setRestForm] = useState({ 
    id: null, 
    restaurantName: '', 
    ownerName: '', 
    email: '', 
    phone: '', 
    address: '', 
    cuisine: 'Italian', 
    openingTime: '11:00 AM', 
    closingTime: '11:00 PM', 
    rating: 4.5, 
    imageUrl: '',
    description: '',
    isOpen: true
  });

  const [foodForm, setFoodForm] = useState({ 
    id: null, 
    foodName: '', 
    description: '', 
    category: 'Starter', 
    price: 100, 
    preparationTime: 15, 
    available: true, 
    quantity: 10, 
    imageUrl: '', 
    restaurantId: '' 
  });

  const [showRestForm, setShowRestForm] = useState(false);
  const [showFoodForm, setShowFoodForm] = useState(false);

  // Reports data state
  const [reportsData, setReportsData] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', description: '', discountPercentage: 10, maxDiscount: 500, minOrderAmount: 0, expiryDate: '', type: 'STANDARD' });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);


  // Redirect non-admin users
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/admin-login');
    }
  }, [user, navigate]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Orders
      const orderRes = await fetch('/orders');
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        orderData.sort((a, b) => b.id - a.id);
        setOrders(orderData);
      }

      // 2. Fetch Restaurants
      const restRes = await fetch('/restaurants');
      if (restRes.ok) {
        const restData = await restRes.json();
        setRestaurants(restData);
      }

      // 3. Fetch Food Items
      const foodRes = await fetch('/fooditems');
      if (foodRes.ok) {
        const foodData = await foodRes.json();
        setFoodItems(foodData);
      }

      // 4. Fetch Users
      const userRes = await fetch('/users');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadAllData();
    }
  }, [user]);

  const loadCoupons = async () => {
    try {
      const res = await fetch('/admin/coupons');
      if (res.ok) setCoupons(await res.json());
    } catch (e) { console.error(e); }
  };



  // Fetch reports when reports tab is clicked
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/orders/reports');
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && user && user.role === 'ADMIN') {
      fetchReports();
    }
  }, [activeTab, user]);

  // Handle order status update
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus }),
      });
      if (res.ok) {
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || 'Failed to update order status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating order status.');
    }
  };

  // Reject order (sets cancelled and notifies customer)
  const handleRejectReservation = async (orderId) => {
    if (!window.confirm("Are you sure you want to REJECT this reservation request?")) return;
    try {
      const res = await fetch(`/orders/${orderId}/reject`, {
        method: 'PUT'
      });
      if (res.ok) {
        alert("Reservation slot rejected and customer notified.");
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || 'Failed to reject reservation.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Accept/Approve reservation (sets Accepted status)
  const handleApproveReservation = async (orderId) => {
    try {
      const res = await fetch(`/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'Accepted' })
      });
      if (res.ok) {
        alert("Reservation slot accepted and customer notified.");
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || 'Failed to approve reservation.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark Customer as Arrived (sets Completed and Completed reservation slot status)
  const handleMarkArrived = async (orderId) => {
    try {
      const res = await fetch(`/orders/${orderId}/arrive`, {
        method: 'PUT'
      });
      if (res.ok) {
        alert("Customer marked as arrived at restaurant.");
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || 'Failed to check in customer.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change table allocation
  const handleReallocateTable = async (orderId) => {
    const tableNum = prompt("Enter new table number:");
    if (tableNum === null) return;
    try {
      const res = await fetch(`/orders/${orderId}/allocate-table`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tableNum })
      });
      if (res.ok) {
        alert("Table slot reallocated successfully!");
        loadAllData();
      } else {
        alert("Failed to allocate new table.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Waive Penalty
  const handleWaivePenalty = async (orderId) => {
    if (!window.confirm("Are you sure you want to waive all penalty charges for this reservation?")) return;
    try {
      const res = await fetch(`/orders/${orderId}/waive`, {
        method: 'PUT'
      });
      if (res.ok) {
        alert("Penalty charges successfully waived!");
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || "Failed to waive penalty charges.");
      }
    } catch (err) {
      console.error(err);
      alert("Error waiving penalty.");
    }
  };

  // Trigger No-Show Sweep
  const handleRunNoShowSweep = async () => {
    setRunningSweep(true);
    try {
      const res = await fetch('/orders/run-no-show-check', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`No-Show Check Sweep Completed!\n\nMarked ${data.markedCount} reservations as 'No Show'.`);
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || "Failed to run No-Show check sweep.");
      }
    } catch (err) {
      console.error(err);
      alert("Error running sweep.");
    } finally {
      setRunningSweep(false);
    }
  };

  // User Suspension toggling
  const handleToggleSuspendUser = async (userId, isSuspended) => {
    const endpoint = isSuspended ? `/users/${userId}/reactivate` : `/users/${userId}/suspend`;
    const actionText = isSuspended ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} this user's access?`)) return;
    try {
      const res = await fetch(endpoint, { method: 'PUT' });
      if (res.ok) {
        alert(`Account successfully ${actionText}d!`);
        loadAllData();
      } else {
        const txt = await res.text();
        alert(txt || "Failed to modify suspension status.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Restaurant details (Create / Update)
  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    const method = restForm.id ? 'PUT' : 'POST';
    const url = restForm.id ? `/restaurants/${restForm.id}` : '/restaurants';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restForm),
      });

      if (res.ok) {
        alert("Restaurant details successfully saved!");
        setShowRestForm(false);
        setRestForm({ 
          id: null, 
          restaurantName: '', 
          ownerName: '', 
          email: '', 
          phone: '', 
          address: '', 
          cuisine: 'Italian', 
          openingTime: '11:00 AM', 
          closingTime: '11:00 PM', 
          rating: 4.5, 
          imageUrl: '',
          description: '',
          isOpen: true
        });
        loadAllData();
      } else {
        alert('Failed to save restaurant details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Restaurant
  const handleDeleteRestaurant = async (restId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant? This cannot be undone.')) return;
    try {
      const res = await fetch(`/restaurants/${restId}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Restaurant deleted.");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Food Item (Create / Update)
  const handleSaveFood = async (e) => {
    e.preventDefault();
    if (!foodForm.restaurantId) {
      alert("Please select a valid restaurant to link this food item.");
      return;
    }
    const method = foodForm.id ? 'PUT' : 'POST';
    const url = foodForm.id ? `/fooditems/${foodForm.id}` : '/fooditems';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodForm),
      });

      if (res.ok) {
        alert("Food item saved successfully!");
        setShowFoodForm(false);
        setFoodForm({ 
          id: null, 
          foodName: '', 
          description: '', 
          category: 'Starter', 
          price: 100, 
          preparationTime: 15, 
          available: true, 
          quantity: 10, 
          imageUrl: '', 
          restaurantId: '' 
        });
        loadAllData();
      } else {
        alert('Failed to save menu food item.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Food Item
  const handleDeleteFood = async (foodId) => {
    if (!window.confirm('Delete this food item?')) return;
    try {
      const res = await fetch(`/fooditems/${foodId}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Food item deleted.");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations for Dashcards
  const totalPenaltiesCollected = orders.reduce((acc, o) => {
    if (o.penaltyWaived) return acc;
    return acc + (o.cancellationFee || 0) + (o.noShowPenalty || 0);
  }, 0);

  const totalRevenue = orders.filter(o => o.orderStatus === 'Completed').reduce((acc, o) => acc + o.totalAmount, 0) + totalPenaltiesCollected;

  const activeReservationsCount = orders.filter(o => ['Pending', 'Accepted', 'Preparing', 'Ready', 'Ready to Serve'].includes(o.orderStatus)).length;
  const completedCount = orders.filter(o => o.orderStatus === 'Completed').length;
  const cancelledCount = orders.filter(o => o.orderStatus.toLowerCase().includes('cancel')).length;
  const noShowCount = orders.filter(o => o.orderStatus.toLowerCase().includes('no show')).length;

  const pendingPaymentsAmount = orders
    .filter(o => ['Pending', 'Accepted', 'Preparing', 'Ready'].includes(o.orderStatus) && o.paymentType && o.paymentType.toLowerCase() === 'pay at restaurant')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <main style={{ display: 'flex', minHeight: '85vh', backgroundColor: '#f8fafc', margin: 0, padding: 0 }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#f8fafc', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', borderRight: '1px solid #1e293b' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛠️</span> DineEase Admin
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Core Control Panel</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'dashboard' ? '#1e293b' : 'transparent', color: activeTab === 'dashboard' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('bookings')} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'bookings' ? '#1e293b' : 'transparent', color: activeTab === 'bookings' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            📋 Bookings ({orders.length})
          </button>
          <button 
            onClick={() => setActiveTab('restaurants')} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'restaurants' ? '#1e293b' : 'transparent', color: activeTab === 'restaurants' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            🍽️ Restaurants ({restaurants.length})
          </button>
          <button 
            onClick={() => setActiveTab('items')} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'items' ? '#1e293b' : 'transparent', color: activeTab === 'items' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            🍔 Menu Items ({foodItems.length})
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'users' ? '#1e293b' : 'transparent', color: activeTab === 'users' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            👥 User Accounts ({users.length})
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'reports' ? '#1e293b' : 'transparent', color: activeTab === 'reports' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            📈 Reports & Charts
          </button>
          <button 
            onClick={() => { setActiveTab('coupons'); loadCoupons(); }} 
            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'coupons' ? '#1e293b' : 'transparent', color: activeTab === 'coupons' ? 'white' : '#94a3b8', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            🏷️ Coupon Manager
          </button>
        </nav>
        
        <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          <span>Log: <strong>{user.email}</strong></span>
        </div>
      </aside>

      {/* Main Panel Content */}
      <section style={{ flexGrow: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>
        
        {/* Error notification card */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* 1. Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', textAlign: 'left' }}>Overview Metrics</h1>
            
            {/* Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>🍽️</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Total Restaurants</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{restaurants.length}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>👥</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Total Users</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{users.length}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>📋</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Total Orders</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{orders.length}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>⏳</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Active Bookings</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-color)', marginTop: '0.2rem' }}>{activeReservationsCount}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>✅</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Completed Slots</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{completedCount}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>❌</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Cancelled Slots</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#475569', marginTop: '0.2rem' }}>{cancelledCount}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>🚫</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>No-Shows</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{noShowCount}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>💰</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Total Revenue</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>₹{totalRevenue.toFixed(0)}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1.8rem' }}>🛡️</span>
                <h4 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>Pending Payments</h4>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c2410c', marginTop: '0.2rem' }}>₹{pendingPaymentsAmount.toFixed(0)}</p>
              </div>
            </div>

            {/* Quick action blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ padding: '2rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>No-Show Cleanup</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Execute a check sweep to find Pay-at-Restaurant slot bookings that are active but past their closing hour limit. These will automatically be set to 'No Show' and a 20% penalty applied.
                </p>
                <button 
                  onClick={handleRunNoShowSweep} 
                  disabled={runningSweep}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🔄 {runningSweep ? 'Scanning Active Slots...' : 'Run No-Show Sweep Scan'}
                </button>
              </div>

              <div style={{ padding: '2rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Timing Adjustments Info</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                  If you modify any restaurant's opening or closing time in the **Restaurants** management tab, the server automatically queries all customers with active bookings for that restaurant and dispatches an email request asking them to review their schedule.
                </p>
                <div style={{ padding: '0.8rem', backgroundColor: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '4px', fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                  Email Notifications automatically trigger for all booking state events.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', textAlign: 'left' }}>Dine-In Slots & Reservations</h1>
            
            {/* Filter controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Filter Status:</strong>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  >
                    <option value="All">All Reservatons</option>
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready">Ready / Ready to Serve</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled (All)</option>
                    <option value="Late Cancelled">Late Cancelled (10%)</option>
                    <option value="No Show">No Show (20%)</option>
                  </select>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Search Booking ID..." 
                  value={bookingSearch} 
                  onChange={(e) => setBookingSearch(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '180px', outline: 'none' }}
                />
              </div>

              <button 
                onClick={handleRunNoShowSweep} 
                disabled={runningSweep}
                className="btn btn-primary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '6px' }}
              >
                🔄 Trigger No-Show Sweep
              </button>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '0 0 12px 12px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '1rem' }}>ID</th>
                    <th style={{ padding: '1rem' }}>Diner Arrival</th>
                    <th style={{ padding: '1rem' }}>Table Slot</th>
                    <th style={{ padding: '1rem' }}>Diners</th>
                    <th style={{ padding: '1rem' }}>Pre-ordered Food</th>
                    <th style={{ padding: '1rem' }}>Grand Total</th>
                    <th style={{ padding: '1rem' }}>Payment Method</th>
                    <th style={{ padding: '1rem' }}>Penalties Applied</th>
                    <th style={{ padding: '1rem' }}>State</th>
                    <th style={{ padding: '1rem' }}>Action Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(order => {
                    // Filter logic
                    const matchSearch = order.id.toString().includes(bookingSearch);
                    let matchStatus = true;
                    if (statusFilter !== 'All') {
                      if (statusFilter === 'Late Cancelled') {
                        matchStatus = order.orderStatus.toLowerCase().includes('late');
                      } else if (statusFilter === 'No Show') {
                        matchStatus = order.orderStatus.toLowerCase().includes('no show') || order.orderStatus.toLowerCase().includes('show');
                      } else if (statusFilter === 'Ready') {
                        matchStatus = order.orderStatus.toLowerCase().includes('ready');
                      } else {
                        matchStatus = order.orderStatus.toLowerCase() === statusFilter.toLowerCase();
                      }
                    }
                    return matchSearch && matchStatus;
                  }).map((order) => {
                    const hasPenalty = (order.cancellationFee > 0 || order.noShowPenalty > 0);
                    const activePenalty = order.noShowPenalty > 0 ? order.noShowPenalty : order.cancellationFee;

                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{order.id}</td>
                        <td style={{ padding: '1rem' }}>{order.arrivalDate} at {order.arrivalTime}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>🪑 {order.tableNumber || 'Standard'}</span>
                          <button 
                            onClick={() => handleReallocateTable(order.id)}
                            style={{ marginLeft: '0.5rem', padding: '0.1rem 0.3rem', fontSize: '0.7rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}
                          >
                            Edit
                          </button>
                        </td>
                        <td style={{ padding: '1rem' }}>👥 {order.guestsCount || order.numberOfPeople}</td>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{order.itemsText}</td>
                        <td style={{ padding: '1rem', color: 'var(--primary-color)', fontWeight: 800 }}>₹{order.totalAmount.toFixed(0)}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{order.paymentType || 'Prepaid'}</td>
                        <td style={{ padding: '1rem', color: '#b91c1c', fontWeight: 700 }}>
                          {hasPenalty ? (
                            order.penaltyWaived ? (
                              <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>₹{activePenalty.toFixed(0)} (Waived)</span>
                            ) : (
                              <span>₹{activePenalty.toFixed(0)}</span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <select 
                            value={order.orderStatus}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            {STATUSES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
                          {order.orderStatus === 'Pending' && (
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                              <button 
                                onClick={() => handleApproveReservation(order.id)}
                                style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleRejectReservation(order.id)}
                                style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {['Accepted', 'Preparing', 'Ready'].includes(order.orderStatus) && (
                            <button 
                              onClick={() => handleMarkArrived(order.id)}
                              style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Arrived (Complete)
                            </button>
                          )}

                          {hasPenalty && !order.penaltyWaived && (
                            <button 
                              onClick={() => handleWaivePenalty(order.id)}
                              style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Waive Penalty
                            </button>
                          )}
                          {!hasPenalty && !['Pending', 'Accepted', 'Preparing', 'Ready'].includes(order.orderStatus) && (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No reservation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Restaurant Partners</h1>
              <button 
                onClick={() => {
                  setRestForm({ 
                    id: null, 
                    restaurantName: '', 
                    ownerName: '', 
                    email: '', 
                    phone: '', 
                    address: '', 
                    cuisine: 'Italian', 
                    openingTime: '11:00 AM', 
                    closingTime: '11:00 PM', 
                    rating: 4.5, 
                    imageUrl: '',
                    description: '',
                    isOpen: true
                  });
                  setShowRestForm(true);
                }} 
                className="btn btn-primary"
              >
                ➕ Add Restaurant
              </button>
            </div>

            {/* Form Drawer */}
            {showRestForm && (
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a' }}>
                  {restForm.id ? '✏️ Edit Restaurant Details' : '🍽️ Add Partner Restaurant'}
                </h3>
                <form onSubmit={handleSaveRestaurant} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Restaurant Name</label>
                    <input 
                      type="text" 
                      value={restForm.restaurantName} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Owner Name</label>
                    <input 
                      type="text" 
                      value={restForm.ownerName} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, ownerName: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Email ID</label>
                    <input 
                      type="email" 
                      value={restForm.email} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Phone Contact</label>
                    <input 
                      type="text" 
                      value={restForm.phone} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Street Address</label>
                    <input 
                      type="text" 
                      value={restForm.address} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, address: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Cuisine Specialty</label>
                    <input 
                      type="text" 
                      value={restForm.cuisine} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, cuisine: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Image Banner URL</label>
                    <input 
                      type="url" 
                      value={restForm.imageUrl} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Opening Hour</label>
                    <input 
                      type="text" 
                      placeholder="11:00 AM"
                      value={restForm.openingTime} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, openingTime: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Closing Hour</label>
                    <input 
                      type="text" 
                      placeholder="11:00 PM"
                      value={restForm.closingTime} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, closingTime: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Restaurant Bio/Description</label>
                    <textarea 
                      value={restForm.description} 
                      onChange={(e) => setRestForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', height: '80px', fontFamily: 'inherit' }}
                      placeholder="Enter restaurant bio..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Operational Status</label>
                    <select
                      value={restForm.isOpen}
                      onChange={(e) => setRestForm(prev => ({ ...prev, isOpen: e.target.value === 'true' }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                    >
                      <option value="true">Open</option>
                      <option value="false">Closed (Temp)</option>
                    </select>
                  </div>
                  
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>Save Details</button>
                    <button type="button" onClick={() => setShowRestForm(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {restaurants.map((rest) => (
                <div key={rest.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{rest.restaurantName}</h3>
                      <span style={{ 
                        backgroundColor: rest.isOpen ? '#dcfce7' : '#fee2e2', 
                        color: rest.isOpen ? '#15803d' : '#ef4444', 
                        padding: '0.15rem 0.5rem', 
                        borderRadius: '6px', 
                        fontWeight: 700, 
                        fontSize: '0.72rem' 
                      }}>
                        {rest.isOpen ? '🟢 Open' : '🔴 Closed'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.8rem' }}>
                      "{rest.description || 'Delicious food served hot and fresh.'}"
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.4rem' }}>
                      <strong>Hours:</strong> {rest.openingTime} - {rest.closingTime}
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.4rem' }}>
                      <strong>Cuisine:</strong> {rest.cuisine} | <strong>Owner:</strong> {rest.ownerName}
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.2rem' }}>
                      📍 {rest.address}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    <button 
                      onClick={() => {
                        setRestForm(rest);
                        setShowRestForm(true);
                      }} 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 600 }}
                    >
                      ✏️ Edit details
                    </button>
                    <button 
                      onClick={() => handleDeleteRestaurant(rest.id)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '6px', border: 'none', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Food Management Tab */}
        {activeTab === 'items' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Menu Food items</h1>
              <button 
                onClick={() => {
                  setFoodForm({ 
                    id: null, 
                    foodName: '', 
                    description: '', 
                    category: 'Starter', 
                    price: 100, 
                    preparationTime: 15, 
                    available: true, 
                    quantity: 10, 
                    imageUrl: '', 
                    restaurantId: restaurants.length > 0 ? restaurants[0].id.toString() : ''
                  });
                  setShowFoodForm(true);
                }} 
                className="btn btn-primary"
              >
                ➕ Add Menu Item
              </button>
            </div>

            {/* Food Form Drawer */}
            {showFoodForm && (
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a' }}>
                  {foodForm.id ? '✏️ Edit Food Item Details' : '🍔 Add Menu Food Item'}
                </h3>
                <form onSubmit={handleSaveFood} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Food Name</label>
                    <input 
                      type="text" 
                      value={foodForm.foodName} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, foodName: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Restaurant Partner</label>
                    <select 
                      value={foodForm.restaurantId} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, restaurantId: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                      required
                    >
                      {restaurants.map(rest => (
                        <option key={rest.id} value={rest.id}>{rest.restaurantName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Category</label>
                    <select 
                      value={foodForm.category} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, category: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Price (₹)</label>
                    <input 
                      type="number" 
                      value={foodForm.price} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Preparation Time (mins)</label>
                    <input 
                      type="number" 
                      value={foodForm.preparationTime} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, preparationTime: parseInt(e.target.value) }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Menu Availability</label>
                    <select 
                      value={foodForm.available} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, available: e.target.value === 'true' }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                    >
                      <option value="true">In Stock / Available</option>
                      <option value="false">Out of Stock</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Image URL</label>
                    <input 
                      type="url" 
                      value={foodForm.imageUrl} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.82rem', color: '#475569' }}>Food Description</label>
                    <textarea 
                      value={foodForm.description} 
                      onChange={(e) => setFoodForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', height: '60px', fontFamily: 'inherit' }}
                      required
                    />
                  </div>
                  
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>Save Food Item</button>
                    <button type="button" onClick={() => setShowFoodForm(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Food items list */}
            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '1rem' }}>Food Name</th>
                    <th style={{ padding: '1rem' }}>Restaurant Partner</th>
                    <th style={{ padding: '1rem' }}>Category</th>
                    <th style={{ padding: '1rem' }}>Price</th>
                    <th style={{ padding: '1rem' }}>Prep Time</th>
                    <th style={{ padding: '1rem' }}>Availability</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {foodItems.map(item => {
                    const r = restaurants.find(rest => rest.id.toString() === item.restaurantId.toString());
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.foodName}</td>
                        <td style={{ padding: '1rem' }}>{r ? r.restaurantName : `Rest ID #${item.restaurantId}`}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>{item.category}</span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary-color)' }}>₹{item.price.toFixed(0)}</td>
                        <td style={{ padding: '1rem' }}>⏱️ {item.preparationTime} mins</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            backgroundColor: item.available ? '#dcfce7' : '#fee2e2', 
                            color: item.available ? '#166534' : '#991b1b', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            fontWeight: 700 
                          }}>
                            {item.available ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button 
                            onClick={() => {
                              setFoodForm(item);
                              setShowFoodForm(true);
                            }}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', marginRight: '0.4rem', fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteFood(item.id)}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: 'none', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. User Management Tab */}
        {activeTab === 'users' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', textAlign: 'left' }}>User accounts & Security Control</h1>
            
            {/* Search filter */}
            <div style={{ display: 'flex', padding: '1rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0', marginBottom: 0 }}>
              <input 
                type="text" 
                placeholder="Search user name or email address..." 
                value={userSearch} 
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
              />
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '0 0 12px 12px', border: '1px solid #e2e8f0', borderTop: 'none', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '1rem' }}>User ID</th>
                    <th style={{ padding: '1rem' }}>Name</th>
                    <th style={{ padding: '1rem' }}>Email Address</th>
                    <th style={{ padding: '1rem' }}>Contact</th>
                    <th style={{ padding: '1rem' }}>Outstanding Penalty</th>
                    <th style={{ padding: '1rem' }}>Role</th>
                    <th style={{ padding: '1rem' }}>Account status</th>
                    <th style={{ padding: '1rem' }}>Security Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => 
                    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                    u.email.toLowerCase().includes(userSearch.toLowerCase())
                  ).map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{u.id}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '1rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem' }}>{u.phone}</td>
                      <td style={{ padding: '1rem', color: '#b91c1c', fontWeight: 700 }}>₹{u.totalPenalty ? u.totalPenalty.toFixed(0) : '0'}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        <span style={{ backgroundColor: u.role === 'ADMIN' ? '#eff6ff' : '#f1f5f9', color: u.role === 'ADMIN' ? '#1e40af' : '#475569', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          backgroundColor: u.suspended ? '#fee2e2' : '#dcfce7', 
                          color: u.suspended ? '#991b1b' : '#166534', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontWeight: 700 
                        }}>
                          {u.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.4rem' }}>
                        <button 
                          onClick={() => handleToggleSuspendUser(u.id, u.suspended)}
                          style={{ 
                            padding: '0.3rem 0.6rem', 
                            fontSize: '0.75rem', 
                            cursor: 'pointer', 
                            borderRadius: '4px', 
                            border: 'none', 
                            backgroundColor: u.suspended ? '#dcfce7' : '#fee2e2', 
                            color: u.suspended ? '#166534' : '#991b1b', 
                            fontWeight: 700 
                          }}
                          disabled={u.role === 'ADMIN'}
                        >
                          {u.suspended ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button 
                          onClick={() => setSelectedUserHistory(u)}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 600 }}
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History Modal view */}
            {selectedUserHistory && (
              <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>👤 Slot history logs: {selectedUserHistory.name} ({selectedUserHistory.email})</h3>
                  <button 
                    onClick={() => setSelectedUserHistory(null)}
                    style={{ padding: '0.25rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Close Log view
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.filter(o => o.userId.toString() === selectedUserHistory.id.toString()).length === 0 ? (
                    <p style={{ color: '#64748b', fontStyle: 'italic' }}>No reservations placed by this user yet.</p>
                  ) : (
                    orders.filter(o => o.userId.toString() === selectedUserHistory.id.toString()).map(o => (
                      <div key={o.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>Booking #{o.id}</strong> | Date: {o.arrivalDate} at {o.arrivalTime} | Amount: ₹{o.totalAmount.toFixed(0)} | Table: {o.tableNumber || 'Standard'}
                          <br/>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Menu: {o.itemsText}</span>
                        </div>
                        <span style={{ 
                          backgroundColor: '#f1f5f9', 
                          color: '#475569', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {o.orderStatus}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Reports & Analytics Tab */}
        {activeTab === 'reports' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', textAlign: 'left' }}>Analytics & Charts Report</h1>
            
            {loadingReports ? (
              <p style={{ color: '#64748b' }}>Generating reports, please wait...</p>
            ) : !reportsData ? (
              <p style={{ color: '#64748b' }}>No reports dataset available.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', textAlign: 'left' }}>
                
                {/* Daily Orders Bar Chart */}
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>📅 Daily Booking Density</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {Object.keys(reportsData.dailyOrders || {}).map(day => {
                      const count = reportsData.dailyOrders[day];
                      const percentage = Math.min((count / 10) * 100, 100);
                      return (
                        <div key={day}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                            <span>{day}</span>
                            <span>{count} Slot Bookings</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: '#e2ebf0', borderRadius: '4px' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: '#3b82f6', borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(reportsData.dailyOrders || {}).length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No data points.</p>}
                  </div>
                </div>

                {/* Monthly Revenue Chart */}
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>💳 Monthly Business Revenue</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {Object.keys(reportsData.monthlyRevenue || {}).map(month => {
                      const amount = reportsData.monthlyRevenue[month];
                      const percentage = Math.min((amount / 10000) * 100, 100);
                      return (
                        <div key={month}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                            <span>{month}</span>
                            <span style={{ color: '#16a34a' }}>₹{amount.toFixed(0)}</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: '#e2ebf0', borderRadius: '4px' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: '#10b981', borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(reportsData.monthlyRevenue || {}).length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No data points.</p>}
                  </div>
                </div>

                {/* Popular Restaurants */}
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>🏆 Restaurant Popularity Index</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {Object.keys(reportsData.popularRestaurants || {}).map(rest => (
                      <div key={rest} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                        <span>{rest}</span>
                        <strong style={{ color: 'var(--primary-color)' }}>{reportsData.popularRestaurants[rest]} reservations</strong>
                      </div>
                    ))}
                    {Object.keys(reportsData.popularRestaurants || {}).length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No data points.</p>}
                  </div>
                </div>

                {/* Popular Food Items */}
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>🔥 Most Popular Menu items ordered</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {Object.keys(reportsData.popularItems || {}).slice(0, 10).map(item => (
                      <div key={item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                        <span>🍔 {item}</span>
                        <strong>{reportsData.popularItems[item]} portions</strong>
                      </div>
                    ))}
                    {Object.keys(reportsData.popularItems || {}).length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No data points.</p>}
                  </div>
                </div>

                {/* Peak Reservation Hours */}
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>⏰ Peak Booking slot timings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {Object.keys(reportsData.peakTimes || {}).map(time => (
                      <div key={time} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                        <span>🕒 {time}</span>
                        <strong>{reportsData.peakTimes[time]} slot selections</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Policy Enforcement Metrics */}
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>🛡️ No-Shows Policy Enforcement</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Completed Slots:</span>
                        <strong style={{ color: '#16a34a' }}>{reportsData.completedCount}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Cancelled (Late / Free):</span>
                        <strong style={{ color: '#475569' }}>{reportsData.cancelledCount}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Enforced No-Shows (20% applied):</span>
                        <strong style={{ color: '#dc2626' }}>{reportsData.noShowsCount}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1.5rem', padding: '0.8rem', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #16a34a', fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                    💡 Tip: Automatic sweep cron jobs are running on the server every 15 minutes checking restaurant closing times.
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
        {/* 6. Coupons Tab */}
        {activeTab === 'coupons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>🏷️ Coupon Manager</h1>
              <button onClick={() => setShowCouponForm(v => !v)} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
                {showCouponForm ? '✕ Cancel' : '+ Create Coupon'}
              </button>
            </div>

            {showCouponForm && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontWeight: 800 }}>Create New Coupon</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {[['code', 'Coupon Code (e.g. SAVE20)', 'text'], ['description', 'Description', 'text'], ['discountPercentage', 'Discount %', 'number'], ['maxDiscount', 'Max Discount (₹)', 'number'], ['minOrderAmount', 'Min Order (₹)', 'number'], ['expiryDate', 'Expiry Date', 'date']].map(([field, label, type]) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#475569' }}>{label}</label>
                      <input
                        type={type}
                        value={couponForm[field]}
                        onChange={e => setCouponForm(p => ({ ...p, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    setCouponLoading(true);
                    try {
                      const res = await fetch('/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...couponForm, code: couponForm.code.trim().toUpperCase() }) });
                      if (res.ok) { alert('Coupon created!'); setShowCouponForm(false); setCouponForm({ code: '', description: '', discountPercentage: 10, maxDiscount: 500, minOrderAmount: 0, expiryDate: '', type: 'STANDARD' }); loadCoupons(); }
                      else { const t = await res.text(); alert(t || 'Failed to create coupon.'); }
                    } catch { alert('Error creating coupon.'); } finally { setCouponLoading(false); }
                  }}
                  disabled={couponLoading}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', padding: '0.65rem 1.5rem' }}
                >
                  {couponLoading ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {coupons.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏷️</div>
                  <p>No coupons yet. Create your first coupon above.</p>
                </div>
              ) : coupons.map(c => (
                <div key={c.id} style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', opacity: c.status === 'INACTIVE' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', color: '#4f46e5' }}>{c.code}</span>
                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: c.status === 'ACTIVE' ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.2)', color: c.status === 'ACTIVE' ? '#16a34a' : '#6b7280' }}>{c.status}</span>
                  </div>
                  {c.description && <p style={{ fontSize: '0.83rem', color: '#475569', margin: '0 0 0.4rem' }}>{c.description}</p>}
                  <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: '#7c3aed' }}>{c.discountPercentage}% OFF {c.maxDiscount ? `(max ₹${c.maxDiscount})` : ''}</p>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', opacity: 0.6 }}>Min order: ₹{c.minOrderAmount || 0}</p>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', opacity: 0.6 }}>Expires: {c.expiryDate || 'N/A'} &bull; Used: {c.usageCount}/{c.usageLimit}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={async () => { await fetch(`/admin/coupons/${c.id}/toggle`, { method: 'PUT' }); loadCoupons(); }}
                      style={{ flex: 1, padding: '0.4rem', background: c.status === 'ACTIVE' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${c.status === 'ACTIVE' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, borderRadius: '8px', color: c.status === 'ACTIVE' ? '#ef4444' : '#16a34a', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif' }}
                    >
                      {c.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={async () => { if (!window.confirm('Delete this coupon?')) return; await fetch(`/admin/coupons/${c.id}`, { method: 'DELETE' }); loadCoupons(); }}
                      style={{ padding: '0.4rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
