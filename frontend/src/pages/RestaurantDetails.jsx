import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Starter', 'Main Course', 'Dessert', 'Beverage'];

export default function RestaurantDetails() {
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedItemStatus, setAddedItemStatus] = useState({}); // { itemId: 'Added!' }
  const [quantities, setQuantities] = useState({}); // { itemId: qty }

  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [spiceLevel, setSpiceLevel] = useState('Medium');
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraSauce, setExtraSauce] = useState(false);
  const [noOnions, setNoOnions] = useState(false);
  const [noGarlic, setNoGarlic] = useState(false);

  const fetchDetails = async () => {
    if (!restaurantId) {
      setError('No Restaurant Selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Restaurant details
      const restRes = await fetch(`/restaurants/${restaurantId}`);
      if (!restRes.ok) {
        setError('Restaurant not found.');
        setLoading(false);
        return;
      }
      const restData = await restRes.json();
      setRestaurant(restData);

      // 2. Fetch Menu items
      let menuUrl = `/fooditems?restaurantId=${restaurantId}`;
      if (activeCategory !== 'All') {
        menuUrl += `&category=${encodeURIComponent(activeCategory)}`;
      }
      if (search.trim() !== '') {
        menuUrl += `&search=${encodeURIComponent(search.trim())}`;
      }

      const menuRes = await fetch(menuUrl);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(menuData);
        
        // Initialize quantities default to 1
        const qtys = {};
        menuData.forEach(item => {
          qtys[item.id] = 1;
        });
        setQuantities(prev => ({ ...qtys, ...prev }));
      }

      // Fetch reviews
      try {
        const revRes = await fetch(`/restaurants/${restaurantId}/reviews`);
        if (revRes.ok) {
          const revData = await revRes.json();
          setReviews(revData);
        }
      } catch (err) {
        console.error(err);
      }

      // Check if favorite
      if (user) {
        try {
          const favRes = await fetch(`/restaurants/${restaurantId}/is-favorite/user/${user.id}`);
          if (favRes.ok) {
            const favData = await favRes.json();
            setIsFavorite(favData.isFavorite);
          }
        } catch (err) {
          console.error(err);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [restaurantId, activeCategory, search]);

  const handleQtyChange = (itemId, val) => {
    const qty = parseInt(val) || 1;
    setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, qty) }));
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert('Please log in first to favorite restaurants.');
      navigate('/login-page');
      return;
    }
    try {
      const res = await fetch(`/restaurants/${restaurantId}/favorite`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleAddToCart = (item) => {
    if (!user) {
      alert('Please log in first to pre-order dishes.');
      navigate('/login-page');
      return;
    }
    setSelectedItem(item);
    setSpiceLevel('Medium');
    setExtraCheese(false);
    setExtraSauce(false);
    setNoOnions(false);
    setNoGarlic(false);
    setShowCustomModal(true);
  };

  const confirmAddToCart = async () => {
    const list = [];
    list.push(`${spiceLevel} Spice`);
    if (extraCheese) list.push('Extra Cheese');
    if (extraSauce) list.push('Extra Sauce');
    if (noOnions) list.push('No Onion');
    if (noGarlic) list.push('No Garlic');
    const customizations = list.join(', ');

    const item = selectedItem;
    const qty = quantities[item.id] || 1;
    if (qty > item.quantity) {
      alert(`Cannot add more than available stock (${item.quantity} items left)`);
      return;
    }

    const result = await addToCart(item, qty, customizations);
    setShowCustomModal(false);
    if (result.success) {
      setAddedItemStatus(prev => ({ ...prev, [item.id]: 'Added!' }));
      setTimeout(() => {
        setAddedItemStatus(prev => ({ ...prev, [item.id]: '' }));
      }, 2000);
    } else {
      alert(result.message);
    }
  };

  if (loading && !restaurant) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading restaurant menu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>
        <h2 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</h2>
        <Link to="/restaurants-page" className="btn btn-primary">Back to Restaurants</Link>
      </div>
    );
  }

  const restImg = restaurant?.imageUrl && restaurant.imageUrl.trim() !== '' 
    ? restaurant.imageUrl 
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80';

  return (
    <main className="container animate-fade-in">
      {/* Restaurant Header Section */}
      {restaurant && (
        <div className="restaurant-details-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '2rem', borderRadius: 'var(--border-radius)', backgroundColor: 'white', border: '1px solid var(--border-color)', marginBottom: '3rem', boxShadow: 'var(--shadow-premium)' }}>
          <div style={{ height: '250px', borderRadius: '12px', overflow: 'hidden' }}>
            <img 
              src={restImg} 
              alt={restaurant.restaurantName} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80';
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
            <button 
              onClick={handleToggleFavorite}
              style={{ position: 'absolute', top: 0, right: 0, background: 'transparent', border: 'none', fontSize: '2rem', cursor: 'pointer', outline: 'none', color: isFavorite ? '#ef4444' : '#cbd5e1', transition: 'transform 0.2s' }}
              className="favorite-toggle-btn"
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
              Partner Restaurant
            </span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.2, paddingRight: '3rem' }}>
              {restaurant.restaurantName}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span>🏷️ {restaurant.cuisine}</span>
              <span>⭐ {restaurant.rating ? restaurant.rating.toFixed(1) : 'New'}</span>
              <span>⏰ {restaurant.openingTime} - {restaurant.closingTime}</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-color)', fontSize: '0.9rem' }}>
              <div>📍 <strong>Address:</strong> {restaurant.address}</div>
              <div>📞 <strong>Phone:</strong> {restaurant.phone}</div>
              <div>✉️ <strong>Email:</strong> {restaurant.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Title and Search Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Explore Our Menu</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Customizable meals cooked fresh on your reservation</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '25px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '240px', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2.5rem' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`cuisine-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            style={{ padding: '0.45rem 1.2rem', borderRadius: '20px', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {menuItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
          No dishes available under this category.
        </div>
      ) : (
        <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
          {menuItems.map((item) => {
            const foodImg = item.imageUrl && item.imageUrl.trim() !== '' 
              ? item.imageUrl 
              : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
            
            const isAvailable = item.available && item.quantity > 0;
            const qtyInCart = quantities[item.id] || 1;

            return (
              <div key={item.id} className="menu-card animate-fade-in" style={{ display: 'flex', gap: '1.2rem', padding: '1.2rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div style={{ width: '110px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  <img 
                    src={foodImg} 
                    alt={item.foodName} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)' }}>{item.foodName}</h3>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹{item.price.toFixed(0)}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  </div>
                  
                  <div style={{ marginTop: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <span>⏱️ {item.preparationTime} mins prep</span>
                      <span style={{ fontWeight: 600, color: isAvailable ? 'var(--success-color)' : 'var(--danger-color)' }}>
                        {isAvailable ? `Stock: ${item.quantity}` : 'Out of Stock'}
                      </span>
                    </div>

                    {isAvailable && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={qtyInCart}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          style={{ width: '55px', padding: '0.35rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', outline: 'none', fontSize: '0.85rem' }}
                        />
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', flexGrow: 1, borderRadius: '6px' }}
                        >
                          {addedItemStatus[item.id] || 'Add to Cart'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reviews Section */}
      <section style={{ marginTop: '4rem', padding: '2rem', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⭐ Customer Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No reviews yet for this restaurant. Be the first to order and review!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700 }}>{r.userName}</span>
                  <span style={{ color: '#eab308', fontWeight: 'bold' }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', lineHeight: 1.4 }}>"{r.comment}"</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
                  Posted on {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Customization Modal */}
      {showCustomModal && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '420px', padding: '2rem', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.2rem' }}>Customize {selectedItem.foodName}</h3>
            
            {/* Spice Level */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Spice Level</label>
              <div style={{ display: 'flex', gap: '1.2rem' }}>
                {['Mild', 'Medium', 'Spicy'].map(level => (
                  <label key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="radio" name="spiceLevel" value={level} checked={spiceLevel === level} onChange={(e) => setSpiceLevel(e.target.value)} />
                    {level}
                  </label>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Add-ons</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={extraCheese} onChange={(e) => setExtraCheese(e.target.checked)} />
                  Extra Cheese (+₹30)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={extraSauce} onChange={(e) => setExtraSauce(e.target.checked)} />
                  Extra Sauce (+₹15)
                </label>
              </div>
            </div>

            {/* Exclusions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exclusions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={noOnions} onChange={(e) => setNoOnions(e.target.checked)} />
                  No Onion
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={noGarlic} onChange={(e) => setNoGarlic(e.target.checked)} />
                  No Garlic
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={confirmAddToCart} className="btn btn-primary" style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', fontSize: '0.95rem' }}>Add to Cart</button>
              <button onClick={() => setShowCustomModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', fontSize: '0.95rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
