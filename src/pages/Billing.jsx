import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ShoppingCart, ArrowRight, Package, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { cart, addToCart, updateQty, setItemQty, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').gt('stock', 0);
      if (error) throw error;
      setProducts(data || []);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * (Number(item.qty) || 0), 0);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ display: 'flex', height: '100%', gap: 24, fontFamily: 'var(--font-sans)', background: 'var(--bg-main)', padding: '40px 48px', animation: 'fadeIn 0.2s ease-out' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />

      {/* Left: Product Grid */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Point of Sale</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 700, color: 'var(--text-main)', margin: 0, lineHeight: 1.1 }}>Billing</h1>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={15} strokeWidth={1.8} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--accent-primary)' : 'var(--text-light)', transition: 'color 0.15s' }} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                padding: '10px 16px 10px 38px', width: 280,
                border: `1px solid ${searchFocused ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: '6px', background: searchFocused ? '#FFFFFF' : 'var(--bg-surface)',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-main)',
                outline: 'none', transition: 'all 0.15s',
                boxShadow: searchFocused ? '0 0 0 1px var(--accent-primary)' : 'none'
              }}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-light)' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Package size={36} style={{ color: 'var(--border-color)', display: 'block', margin: '0 auto 12px' }} strokeWidth={1.2} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-light)', letterSpacing: '0.05em' }}>
              {searchTerm ? `No products matching "${searchTerm}"` : 'No products available'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {filteredProducts.map((product) => {
              const inCart = cart.find(c => c.id === product.id);
              const isHovered = hoveredProduct === product.id;
              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${isHovered ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    transform: isHovered ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {inCart && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 2,
                      background: 'var(--accent-primary)', color: 'var(--text-inverse)',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      padding: '2px 7px', borderRadius: '4px',
                    }}>{inCart.qty}</div>
                  )}
                  <div style={{ height: 120, background: 'var(--bg-surface-hover)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Package size={28} color="var(--text-light)" strokeWidth={1.5} />
                    }
                  </div>
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-main)', fontSize: 13, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Stock: {product.stock}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-main)', fontWeight: 500 }}>₹{Number(product.price).toFixed(2)}</span>
                      <button
                        onClick={() => addToCart(product)}
                        style={{
                          width: 30, height: 30, borderRadius: '4px',
                          background: isHovered ? 'var(--accent-primary)' : 'var(--bg-sidebar)',
                          border: 'none', cursor: 'pointer', color: 'var(--text-inverse)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s',
                        }}
                      >
                        <Plus size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Cart Panel */}
      <div style={{
        width: 340,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Accent */}
        <div style={{ height: 4, background: 'var(--accent-primary)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={18} strokeWidth={1.8} color="var(--accent-primary)" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, color: 'var(--text-main)' }}>Current Bill</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                style={{ background: 'none', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#EF4444', transition: 'background 0.15s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Clear Cart"
              >
                Clear
              </button>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface-hover)', padding: '3px 9px', borderRadius: '4px' }}>
              {cart.length} items
            </span>
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <ShoppingCart size={40} color="var(--border-color)" strokeWidth={1.2} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-light)', letterSpacing: '0.06em' }}>Cart is empty</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, position: 'relative' }}>
              <button 
                onClick={() => removeFromCart(item.id)}
                style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-light)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
                title="Remove Item"
              >
                <X size={14} strokeWidth={2} />
              </button>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>₹{Number(item.price).toFixed(2)}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                  <button onClick={() => updateQty(item.id, -1)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Minus size={12} strokeWidth={2} />
                  </button>
                  <input
                    type="number"
                    step="any"
                    value={item.qty}
                    onChange={(e) => setItemQty(item.id, e.target.value)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--text-main)',
                      width: 40,
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                    }}
                  />
                  <button onClick={() => updateQty(item.id, 1)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Plus size={12} strokeWidth={2} />
                  </button>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-main)', fontWeight: 500 }}>₹{(item.price * (Number(item.qty) || 0)).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '18px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 700, color: 'var(--text-main)' }}>₹{cartTotal.toFixed(2)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={() => navigate('/bill-preview')}
            style={{
              width: '100%', padding: '12px', background: cart.length === 0 ? 'var(--border-color)' : 'var(--accent-primary)',
              color: cart.length === 0 ? 'var(--text-light)' : 'var(--text-inverse)', border: 'none', borderRadius: '6px', cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s',
              boxShadow: cart.length === 0 ? 'none' : 'var(--shadow-sm)'
            }}
            onMouseEnter={e => { if (cart.length > 0) { e.currentTarget.style.background = 'var(--accent-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
            onMouseLeave={e => { if (cart.length > 0) { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
          >
            Proceed to Bill <ArrowRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;