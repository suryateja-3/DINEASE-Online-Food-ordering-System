import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';


export default function Payment() {
  const { user } = useAuth();
  const { cartItems, cartTotal, bookingDetails, clearCart } = useCart();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('CARD'); // CARD, UPI, CASH
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [upiId, setUpiId] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login-page');
      return;
    }
    if (cartItems.length === 0) {
      navigate('/cart-page');
    }
  }, [user, cartItems, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (paymentMethod === 'CARD') {
      if (!cardNumber || !expiry || !cvv || !nameOnCard) {
        setError('Please fill in all credit card details.');
        return;
      }
    } else if (paymentMethod === 'UPI') {
      if (!upiId) {
        setError('Please enter your UPI ID.');
        return;
      }
    }

    if (paymentMethod === 'CASH') {
      const confirmPlace = window.confirm(
        "Dine-In Reservation Policy Confirmation:\n\n" +
        "\"Cancel at least 30 minutes before your arrival time to avoid cancellation charges.\"\n\n" +
        "Note: Late cancellations (within 30 minutes of arrival) incur a 10% fee. No-shows incur a 20% penalty. This policy applies only to 'Pay at Restaurant' orders.\n\n" +
        "Do you agree to these terms and want to place your booking?"
      );
      if (!confirmPlace) return;
    }

    setLoading(true);
    try {
      // 1. Place the order
      const orderPayload = {
        userId: user.id,
        restaurantId: cartItems[0].restaurantId,
        arrivalDate: bookingDetails.arrivalDate,
        arrivalTime: bookingDetails.arrivalTime,
        numberOfPeople: bookingDetails.numberOfPeople,
        specialInstructions: bookingDetails.specialInstructions,
        tableId: bookingDetails.tableId,
        tableNumber: bookingDetails.tableNumber,
        tableType: bookingDetails.tableType,
        paymentType: paymentMethod === 'CASH' ? 'Pay at Restaurant' : 'Prepaid',
      };

      const orderRes = await fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const orderErr = await orderRes.text();
        setError(orderErr || 'Failed to place order.');
        setLoading(false);
        return;
      }

      const createdOrder = await orderRes.json();

      // 2. Submit payment
      const paymentPayload = {
        orderId: createdOrder.id,
        amount: createdOrder.totalAmount,
        paymentMethod: paymentMethod === 'CARD' ? 'Credit Card' : (paymentMethod === 'UPI' ? 'UPI' : 'Cash at Restaurant'),
        paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'SUCCESS',
      };

      const paymentRes = await fetch('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload),
      });

      if (paymentRes.ok) {
        setSuccess(true);
        // Clear cart globally
        await clearCart();
        setTimeout(() => {
          setLoading(false);
          navigate('/orders-page');
        }, 2000);
      } else {
        const payErr = await paymentRes.text();
        setError(payErr || 'Order placed, but payment recording failed. Please check with staff.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during transaction processing. Please try again.');
      setLoading(false);
    }
  };

  if (!user || cartItems.length === 0) return null;

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="login-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
        <h2 className="login-title" style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: 800 }}>Dine-In Secure Payment</h2>
        <p className="login-subtitle" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Skip-the-line pre-ordering checkout</p>

        <div style={{ textAlign: 'center', margin: '1.2rem 0', padding: '0.8rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid var(--primary-color)' }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Payable Amount:</span>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--primary-color)', fontWeight: 800 }}>₹{cartTotal.toFixed(0)}</h3>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger-color)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#ecfdf5', color: 'var(--success-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.95rem', fontWeight: 700, textAlign: 'center' }}>
            🎉 Booking & Pre-Order Confirmed! Redirecting to tracking...
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            {/* Payment Method Selector */}
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                style={{ flex: 1, padding: '0.65rem 0.3rem', border: 'none', background: paymentMethod === 'CARD' ? 'var(--primary-color)' : '#f8fafc', color: paymentMethod === 'CARD' ? 'white' : 'var(--text-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                💳 Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                style={{ flex: 1, padding: '0.65rem 0.3rem', border: 'none', background: paymentMethod === 'UPI' ? 'var(--primary-color)' : '#f8fafc', color: paymentMethod === 'UPI' ? 'white' : 'var(--text-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                📱 UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                style={{ flex: 1, padding: '0.65rem 0.3rem', border: 'none', background: paymentMethod === 'CASH' ? 'var(--primary-color)' : '#f8fafc', color: paymentMethod === 'CASH' ? 'white' : 'var(--text-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                💵 Cash at Diner
              </button>
            </div>

            {paymentMethod === 'CARD' && (
              <div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="Surya Prakash"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Card Number</label>
                  <input
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    maxLength="19"
                    value={cardNumber}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      let matches = val.match(/\d{4,16}/g);
                      let match = (matches && matches[0]) || '';
                      let parts = [];
                      for (let i=0, len=match.length; i<len; i+=4) {
                        parts.push(match.substring(i, i+4));
                      }
                      if (parts.length > 0) {
                        setCardNumber(parts.join(' '));
                      } else {
                        setCardNumber(val);
                      }
                    }}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength="5"
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 2) {
                          setExpiry(val.substring(0, 2) + '/' + val.substring(2, 4));
                        } else {
                          setExpiry(val);
                        }
                      }}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>CVV</label>
                    <input
                      type="password"
                      placeholder="123"
                      maxLength="3"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'UPI' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '12px', marginBottom: '1.2rem', backgroundColor: '#f8fafc' }}>
                  {/* Simulated QR Box */}
                  <div style={{ width: '130px', height: '130px', border: '4px solid #0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', position: 'relative' }}>
                    <div style={{ width: '110px', height: '110px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '4px' }}>
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} style={{ background: (i % 3 === 0 || i % 5 === 0) ? '#0f172a' : 'transparent', borderRadius: '2px' }} />
                      ))}
                    </div>
                    <span style={{ position: 'absolute', bottom: '2px', fontSize: '0.6rem', background: '#0f172a', color: 'white', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>DineEase Pay</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Scan QR to Pay with any UPI App</span>
                </div>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Or enter UPI ID</label>
                  <input
                    type="text"
                    placeholder="surya@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem' }}
                    required
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div style={{ padding: '1.2rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #10b981', marginBottom: '1.5rem', fontSize: '0.88rem', color: '#166534', lineHeight: 1.5 }}>
                💡 <strong>Dine-in Pre-Ordering Confirmed:</strong> You will pay <strong>₹{cartTotal.toFixed(0)}</strong> directly at the restaurant counter after your meal. We will prepare your hot items to serve them right at <strong>{bookingDetails.arrivalTime}</strong>!
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? 'Processing Transaction...' : (paymentMethod === 'CASH' ? 'Confirm Reservation' : `Pay ₹${cartTotal.toFixed(0)}`)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
