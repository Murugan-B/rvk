import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Package } from 'lucide-react';

const S = {
  page: {
    padding: '40px 48px',
    minHeight: '100vh',
    background: 'var(--bg-main)',
    fontFamily: 'var(--font-sans)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 36,
  },
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.15em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 42,
    fontWeight: 700,
    color: 'var(--text-main)',
    lineHeight: 1.1,
    margin: 0,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    background: 'var(--accent-primary)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: '6px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  tableWrap: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    animation: 'slideUp 0.4s ease-out',
  },
  thead: {
    background: 'var(--bg-main)',
    borderBottom: '1px solid var(--border-color)',
  },
  th: {
    padding: '14px 20px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '16px 20px',
    fontSize: 14,
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  imgBox: {
    width: 44,
    height: 44,
    borderRadius: '6px',
    objectFit: 'cover',
    border: '1px solid var(--border-color)',
  },
  noImg: {
    width: 44,
    height: 44,
    borderRadius: '6px',
    background: 'var(--bg-surface-hover)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  productName: {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    color: 'var(--text-main)',
    fontSize: 14,
  },
  price: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: '#4A7FA5',
  },
  stockOk: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: '#4A8C5C',
    background: '#4A8C5C18',
    padding: '3px 10px',
    borderRadius: '2px',
  },
  stockLow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: '#C0572A',
    background: '#C0572A18',
    padding: '3px 10px',
    borderRadius: '2px',
  },
  actionBtn: {
    padding: '6px 8px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
  },
  emptyCell: {
    padding: '64px 20px',
    textAlign: 'center',
    color: 'var(--text-light)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.05em',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(44,40,32,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 50,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: 440,
    padding: '36px 36px 32px',
    position: 'relative',
    boxShadow: 'var(--shadow-lg)',
    animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  modalAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 4,
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    background: 'var(--accent-primary)',
  },
  modalTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--text-main)',
    marginBottom: 28,
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    background: 'var(--bg-main)',
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-main)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  submitBtn: {
    marginTop: 24,
    width: '100%',
    padding: '12px',
    background: 'var(--accent-primary)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: '6px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: 'var(--shadow-sm)',
  },
};

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', unit: '', image_url: '', entry_date: '' });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch { toast.error('Failed to fetch products'); }
    finally { setLoading(false); }
  };

  const openModal = (product = null) => {
    if (product) { 
      setFormData({ ...product, entry_date: product.entry_date ? new Date(product.entry_date).toISOString().split('T')[0] : '' }); 
      setEditingId(product.id); 
    }
    else { 
      setFormData({ name: '', price: '', stock: '', unit: '', image_url: '', entry_date: new Date().toISOString().split('T')[0] }); 
      setEditingId(null); 
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', price: '', stock: '', unit: '', image_url: '', entry_date: '' });
    setImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        toast.loading('Uploading image...', { id: 'upload' });
        finalImageUrl = await uploadImageToCloudinary(imageFile);
        toast.dismiss('upload');
      }
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        unit: formData.unit || 'units',
        image_url: finalImageUrl,
        entry_date: formData.entry_date || null,
      };
      if (editingId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingId);
        if (error) throw error;
        toast.success('Product updated!');
      } else {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
        toast.success('Product added!');
      }
      closeModal();
      fetchProducts();
    } catch (error) { toast.error('An error occurred'); console.error(error); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        toast.success('Product deleted!');
        fetchProducts();
      } catch { toast.error('Failed to delete product'); }
    }
  };

  const inputStyle = (field) => ({
    ...S.input,
    borderColor: focusedInput === field ? 'var(--accent-primary)' : 'var(--border-color)',
    background: focusedInput === field ? '#FFFFFF' : 'var(--bg-main)',
    boxShadow: focusedInput === field ? '0 0 0 1px var(--accent-primary)' : 'none',
  });

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />

      <div style={S.headerRow}>
        <div>
          <p style={S.eyebrow}>Stock Management</p>
          <h1 style={S.title}>Inventory</h1>
        </div>
        <button
          style={S.addBtn}
          onClick={() => openModal()}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <Plus size={15} strokeWidth={2} />
          Add Material
        </button>
      </div>

      <div style={S.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={S.thead}>
            <tr>
              {['Image', 'Material Name', 'Price', 'Stock', 'Unit', 'Entry Date', 'Actions'].map((h, i) => (
                  <th key={h} style={{ ...S.th, textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={S.emptyCell}>Loading inventory...</td></tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...S.emptyCell, paddingTop: 80 }}>
                  <Package size={36} style={{ color: '#D4CEBF', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  No materials found. Add your first one.
                </td>
              </tr>
            ) : products.map((product) => (
              <tr
                key={product.id}
                style={{ ...S.tr, background: hoveredRow === product.id ? 'var(--bg-surface-hover)' : 'transparent' }}
                onMouseEnter={() => setHoveredRow(product.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={S.td}>
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} style={S.imgBox} />
                    : <div style={S.noImg}><Package size={16} /></div>
                  }
                </td>
                <td style={S.td}>
                  <span style={S.productName}>{product.name}</span>
                </td>
                <td style={S.td}>
                  <span style={S.price}>₹{Number(product.price).toFixed(2)}</span>
                </td>
                <td style={S.td}>
                  <span style={product.stock < 10 ? S.stockLow : S.stockOk}>
                    {product.stock < 10 && '⚠️ '}
                    {product.stock}
                  </span>
                </td>
                <td style={S.td}>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: '#6B6358', fontSize: 13 }}>
                    {product.unit || 'units'}
                  </span>
                </td>
                <td style={S.td}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#2C2820', fontSize: 14 }}>
                    {product.entry_date ? new Date(product.entry_date).toLocaleDateString() : '-'}
                  </span>
                </td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <button
                    onClick={() => openModal(product)}
                    style={{ ...S.actionBtn, color: '#4A7FA5', marginRight: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#4A7FA518'; e.currentTarget.style.borderColor = '#4A7FA5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Edit2 size={15} strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    style={{ ...S.actionBtn, color: '#C0572A' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#C0572A18'; e.currentTarget.style.borderColor = '#C0572A'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {!loading && products.length > 0 && (
        <p style={{ marginTop: 16, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#B8B0A0', letterSpacing: '0.06em' }}>
          {products.length} material{products.length !== 1 ? 's' : ''} in catalogue
        </p>
      )}

      {isModalOpen && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={S.modal}>
            <div style={S.modalAccent} />
            <button
              onClick={closeModal}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#B8B0A0', padding: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = '#2C2820'}
              onMouseLeave={e => e.currentTarget.style.color = '#B8B0A0'}
            >
              <X size={20} strokeWidth={1.8} />
            </button>

            <h2 style={S.modalTitle}>{editingId ? 'Edit Material' : 'Add Material'}</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={S.label}>Material Name</label>
                <input
                  required type="text"
                  style={inputStyle('name')}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="e.g. Portland Cement"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Price (₹)</label>
                  <input
                    required type="number" step="0.01"
                    style={inputStyle('price')}
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    onFocus={() => setFocusedInput('price')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label style={S.label}>Category / Unit</label>
                  <select
                    required
                    style={inputStyle('unit')}
                    value={formData.unit || 'units'}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    onFocus={() => setFocusedInput('unit')}
                    onBlur={() => setFocusedInput(null)}
                  >
                    <option value="units">units</option>
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="bags">bags</option>
                    <option value="liters">liters</option>
                    <option value="meters">meters</option>
                    <option value="boxes">boxes</option>
                    <option value="count">count</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Stock Qty</label>
                  <input
                    required type="number"
                    style={inputStyle('stock')}
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    onFocus={() => setFocusedInput('stock')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={S.label}>Entry Date</label>
                  <input
                    type="date"
                    style={inputStyle('entry_date')}
                    value={formData.entry_date}
                    onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                    onFocus={() => setFocusedInput('entry_date')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </div>
              </div>

              <div>
                <label style={S.label}>Image — Optional</label>
                <div style={{ padding: '10px 14px', border: '1px solid #E8E4DC', borderRadius: '2px', background: '#F5F1EB' }}>
                  <input
                    type="file" accept="image/*"
                    style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#6B6358', width: '100%' }}
                    onChange={e => setImageFile(e.target.files[0])}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={S.submitBtn}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                {editingId ? 'Update Material' : 'Save Material'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;