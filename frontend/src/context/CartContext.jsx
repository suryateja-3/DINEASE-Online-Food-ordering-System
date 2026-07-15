import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    arrivalDate: '',
    arrivalTime: '',
    numberOfPeople: 2,
    specialInstructions: '',
    tableId: '',
    tableNumber: '',
    tableType: '',
  });

  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      return;
    }
    setLoadingCart(true);
    try {
      const res = await fetch(`/carts/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCartItems(data);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoadingCart(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (foodItem, quantity, customizations = '') => {
    if (!user) return { success: false, message: 'Please log in to add items to cart.' };
    
    // Check if adding from a different restaurant
    if (cartItems.length > 0 && cartItems[0].restaurantId !== foodItem.restaurantId) {
      const confirmClear = window.confirm(
        'You have items from another restaurant in your cart. Adding this item will clear your previous cart. Proceed?'
      );
      if (!confirmClear) return { success: false, message: 'Action cancelled.' };
    }

    try {
      const cartItemPayload = {
        userId: user.id,
        foodItemId: foodItem.id,
        restaurantId: foodItem.restaurantId,
        foodName: foodItem.foodName,
        price: foodItem.price,
        quantity: quantity,
        customizations: customizations,
      };

      const res = await fetch('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartItemPayload),
      });

      if (res.ok) {
        await fetchCart();
        return { success: true };
      } else {
        const text = await res.text();
        return { success: false, message: text || 'Failed to add item to cart.' };
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      return { success: false, message: 'Server communication error.' };
    }
  };

  const updateQuantity = async (cartItemId, newQty) => {
    if (newQty <= 0) {
      return removeFromCart(cartItemId);
    }
    try {
      const res = await fetch(`/carts/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (res.ok) {
        await fetchCart();
        return { success: true };
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
    return { success: false };
  };

  const removeFromCart = async (cartItemId) => {
    try {
      const res = await fetch(`/carts/${cartItemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCart();
        return { success: true };
      }
    } catch (err) {
      console.error('Error removing from cart:', err);
    }
    return { success: false };
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/carts/user/${user.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCartItems([]);
        return { success: true };
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
    return { success: false };
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loadingCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        bookingDetails,
        setBookingDetails,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
