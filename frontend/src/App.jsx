import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Restaurants from './pages/Restaurants';
import RestaurantDetails from './pages/RestaurantDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import RestaurantDashboard from './pages/RestaurantDashboard';
import Wallet from './pages/Wallet';


export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <div style={{ flexGrow: 1 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login-page" element={<Login />} />
                <Route path="/register-page" element={<Register />} />
                <Route path="/restaurants-page" element={<Restaurants />} />
                <Route path="/restaurant-details-page" element={<RestaurantDetails />} />
                <Route path="/cart-page" element={<Cart />} />
                <Route path="/checkout-page" element={<Checkout />} />
                <Route path="/payment-page" element={<Payment />} />
                <Route path="/orders-page" element={<Orders />} />
                <Route path="/profile-page" element={<Profile />} />
                <Route path="/admin-page" element={<Admin />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} />
                <Route path="/wallet-page" element={<Wallet />} />

                
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
