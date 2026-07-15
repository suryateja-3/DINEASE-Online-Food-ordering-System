import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CUISINES = ['All', 'Italian', 'Chinese', 'Indian', 'Dessert', 'Fast Food', 'Japanese', 'Mexican', 'American'];

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRestaurants = async (searchQuery = '', cuisineFilter = 'All') => {
    setLoading(true);
    setError('');
    try {
      const params = [];
      if (searchQuery.trim() !== '') {
        params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      }
      if (cuisineFilter !== 'All') {
        params.push(`cuisine=${encodeURIComponent(cuisineFilter)}`);
      }
      
      let url = '/restaurants';
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      } else {
        setError('Failed to fetch restaurants.');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load partner restaurants. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on input change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRestaurants(search, activeCuisine);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, activeCuisine]);

  const handleCuisineClick = (cuisine) => {
    setActiveCuisine(cuisine);
  };

  return (
    <main className="container animate-fade-in">
      <div className="section-title-container" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title">Our Partner Restaurants</h1>
        <p className="section-subtitle">Choose a restaurant to pre-order and reserve your table</p>
      </div>

      {/* Search and Filters Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <input
            id="searchRestaurant"
            type="text"
            className="search-input"
            placeholder="🔍 Search restaurants by name, cuisine, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: '600px', padding: '0.85rem 1.5rem', borderRadius: '30px', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none', boxShadow: 'var(--shadow-sm)' }}
          />
        </div>

        {/* Cuisine Filters */}
        <div className="cuisine-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'center' }}>
          {CUISINES.map((cuisine) => (
            <button
              key={cuisine}
              className={`cuisine-btn ${activeCuisine === cuisine ? 'active' : ''}`}
              onClick={() => handleCuisineClick(cuisine)}
              style={{ padding: '0.5rem 1.2rem', borderRadius: '20px', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)' }}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurants List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: 'var(--primary-color)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
          Loading partner restaurants...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger-color)', fontWeight: 700 }}>
          {error}
        </div>
      ) : restaurants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No partner restaurants found matching your filters.
        </div>
      ) : (
        <div id="restaurantList" className="restaurant-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {restaurants.map((restaurant) => {
            const imgUrl = restaurant.imageUrl && restaurant.imageUrl.trim() !== '' 
              ? restaurant.imageUrl 
              : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80';
            const rating = restaurant.rating ? restaurant.rating.toFixed(1) : 'New';

            return (
              <div key={restaurant.id} className="restaurant-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="restaurant-img-container" style={{ position: 'relative', overflow: 'hidden', height: '200px' }}>
                  <img
                    src={imgUrl}
                    className="restaurant-img"
                    alt={restaurant.restaurantName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80';
                    }}
                  />
                </div>
                <div className="restaurant-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <h2 className="restaurant-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    {restaurant.restaurantName}
                  </h2>
                  <div className="restaurant-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <span className="restaurant-cuisine" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                      🏷️ {restaurant.cuisine}
                    </span>
                    <span className="restaurant-rating" style={{ fontWeight: 600 }}>
                      ⭐ {rating}
                    </span>
                  </div>
                  <div className="restaurant-details-list" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                    <div className="restaurant-details-item">📍 {restaurant.address}</div>
                    <div className="restaurant-details-item">📞 {restaurant.phone}</div>
                    <div className="restaurant-details-item">🕒 Hours: {restaurant.openingTime} - {restaurant.closingTime}</div>
                  </div>
                  
                  <Link
                    to={`/restaurant-details-page?restaurantId=${restaurant.id}`}
                    className="btn btn-primary"
                    style={{ marginTop: 'auto', textAlign: 'center', display: 'block' }}
                  >
                    View Menu & Reserve Table
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
