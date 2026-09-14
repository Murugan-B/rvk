import React, { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          toast.error(`Cannot add more. Only ${product.stock} in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      if (product.stock < 1) {
        toast.error(`Out of stock.`);
        return prev;
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Number(item.qty) + delta;
          if (newQty > item.stock) {
            toast.error(`Cannot exceed stock. Only ${item.stock} available.`);
            return { ...item, qty: item.stock };
          }
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const setItemQty = (id, qty) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const numQty = Number(qty);
          if (numQty > item.stock) {
            toast.error(`Cannot exceed available stock of ${item.stock}.`);
            return { ...item, qty: item.stock };
          }
          return { ...item, qty };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, setItemQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
