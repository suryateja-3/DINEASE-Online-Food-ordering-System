import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Wallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [copyToast, setCopyToast] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login-page'); return; }
    loadTransactions();
    loadCoupons();
  }, [user]);

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await fetch(`/users/${user.id}/wallet`);
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => new Date(b.transactionTime) - new Date(a.transactionTime));
        setTransactions(data);
      }
    } catch (e) { console.error(e); }
    setLoadingTx(false);
  };

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch(`/users/${user.id}/coupons`);
      if (res.ok) setCoupons(await res.json());
    } catch (e) { console.error(e); }
    setLoadingCoupons(false);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(`✓ ${label} copied!`);
      setTimeout(() => setCopyToast(''), 2500);
    }).catch(() => prompt('Copy this:', text));
  };

  if (!user) return null;

  const walletBalance = user.walletBalance || 0;

  return (
    <main className="container animate-fade-in" style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      {/* Hero Wallet Card */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
        borderRadius: '24px', padding: '2.5rem', marginBottom: '2rem',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(79, 70, 229, 0.4)'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40%', right: '-5%', width: '280px', height: '280px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30%', right: '22%', width: '180px', height: '180px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Card chip */}
        <div style={{ width: '44px', height: '33px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: '6px', marginBottom: '1.5rem' }} />

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0' }}>Available Balance</p>
        <p style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, margin: '0.4rem 0', letterSpacing: '-1px' }}>
          ₹{walletBalance.toFixed(2)}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0', fontSize: '0.9rem' }}>
          DineEase Digital Wallet &bull; {user.name}
        </p>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '2rem', opacity: 0.4 }}>💳</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)' }}>
        {[
          { key: 'transactions', label: '📋 Transactions' },
          { key: 'coupons', label: '🏷️ Coupons' },
          { key: 'referral', label: '🔗 Referral' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '0.65rem 1rem', border: 'none',
              borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              fontSize: '0.88rem', fontWeight: 600, transition: 'all 0.25s',
              background: activeTab === tab.key ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'rgba(0,0,0,0.5)',
              boxShadow: activeTab === tab.key ? '0 4px 15px rgba(79,70,229,0.3)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800 }}>Transaction History</h2>
          {loadingTx ? (
            <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading...</p>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📄</div>
              <p>No transactions yet. Place your first order to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {transactions.map((tx, i) => {
                const isCredit = tx.type === 'CREDIT';
                const dt = tx.transactionTime ? new Date(tx.transactionTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '--';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', background: isCredit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', flexShrink: 0 }}>
                        {isCredit ? '⬆️' : '⬇️'}
                      </div>
                      <div>
                        <p style={{ margin: '0', fontWeight: 600, fontSize: '0.92rem' }}>{tx.description || (isCredit ? 'Credit' : 'Debit')}</p>
                        <p style={{ margin: '0', fontSize: '0.78rem', opacity: 0.55 }}>{dt}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: isCredit ? '#16a34a' : '#dc2626' }}>
                      {isCredit ? '+' : '-'}₹{(tx.amount || 0).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ margin: '0', fontSize: '1.1rem', fontWeight: 800 }}>My Coupons</h2>
            <span style={{ fontSize: '0.8rem', opacity: 0.55 }}>Use at checkout to save on your orders</span>
          </div>
          {loadingCoupons ? (
            <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading...</p>
          ) : coupons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎫</div>
              <p>No coupons available right now.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {coupons.map((c, i) => {
                const code = c.code || c.couponCode || 'CODE';
                const isUsed = c.used === true;
                const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                const badge = isUsed ? 'Used' : isExpired ? 'Expired' : 'Available';
                const expiry = c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN') : 'N/A';
                return (
                  <div key={i} style={{
                    background: (isUsed || isExpired) ? 'rgba(0,0,0,0.04)' : 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.05))',
                    border: '1px solid rgba(99,102,241,0.25)', borderRadius: '16px', padding: '1.5rem',
                    opacity: (isUsed || isExpired) ? 0.55 : 1, transition: 'transform 0.2s',
                  }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.6rem', background: (!isUsed && !isExpired) ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.2)', color: (!isUsed && !isExpired) ? '#16a34a' : '#6b7280' }}>
                      {badge}
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '2px', color: '#4f46e5', marginBottom: '0.4rem' }}>{code}</div>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '1.1rem', color: '#6366f1' }}>
                      {c.discountPercentage ? `${c.discountPercentage}% OFF` : (c.description || 'Discount')}
                    </p>
                    {c.maxDiscount && <p style={{ margin: '0', fontSize: '0.78rem', opacity: 0.65 }}>Max: ₹{c.maxDiscount}</p>}
                    {c.minOrderAmount > 0 && <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', opacity: 0.65 }}>Min order: ₹{c.minOrderAmount}</p>}
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', opacity: 0.45 }}>Expires: {expiry}</p>
                    {!isUsed && !isExpired && (
                      <button
                        onClick={() => copyToClipboard(code, code)}
                        style={{ width: '100%', marginTop: '0.85rem', padding: '0.45rem', background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: '8px', color: '#4f46e5', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif' }}
                      >
                        Copy Code
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REFERRAL TAB */}
      {activeTab === 'referral' && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>🔗 Refer & Earn</h2>
          <p style={{ opacity: 0.65, fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
            Invite friends to DineEase. When they complete their first order, you earn <strong style={{ color: '#f59e0b' }}>₹200</strong> in your wallet!
          </p>

          <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.75 }}>Your Referral Code</p>
            <div
              onClick={() => user.referralCode && copyToClipboard(user.referralCode, 'Referral code')}
              style={{ display: 'inline-block', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '3px', color: '#f59e0b', padding: '0.75rem 1.5rem', background: 'rgba(251,191,36,0.08)', border: '2px dashed rgba(251,191,36,0.4)', borderRadius: '12px', margin: '1rem 0', cursor: 'pointer' }}
            >
              {user.referralCode || 'Loading...'}
            </div>
            <p style={{ fontSize: '0.78rem', opacity: 0.5, margin: '0 0 1rem' }}>Click to copy code</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ padding: '0.35rem 0.9rem', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px', fontSize: '0.8rem' }}>💰 ₹200 per referral</span>
              <span style={{ padding: '0.35rem 0.9rem', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px', fontSize: '0.8rem' }}>👥 Unlimited referrals</span>
              {user.referredByCode && (
                <span style={{ padding: '0.35rem 0.9rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', fontSize: '0.8rem', color: '#16a34a' }}>✓ You were referred</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(0,0,0,0.02)', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>How it works</h3>
            {[
              'Share your referral code with friends who haven\'t signed up on DineEase yet',
              'Your friend registers and enters your code in the "Referred By" field',
              'Once they complete their first order, ₹200 is automatically credited to your wallet!',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: i < 2 ? '0.85rem' : '0' }}>
                <div style={{ width: '28px', height: '28px', background: 'rgba(79,70,229,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', flexShrink: 0, color: '#4f46e5', fontWeight: 800 }}>{i + 1}</div>
                <p style={{ margin: '0', fontSize: '0.9rem', paddingTop: '0.2rem', opacity: 0.75 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy Toast */}
      {copyToast && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', zIndex: 9999, boxShadow: '0 8px 24px rgba(34,197,94,0.35)' }}>
          {copyToast}
        </div>
      )}
    </main>
  );
}
