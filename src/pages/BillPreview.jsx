import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const BillPreview = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [settings, setSettings] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [billGenerated, setBillGenerated] = useState(false);
  const [billId, setBillId] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paidAmount, setPaidAmount] = useState('');
  const savedCartRef = React.useRef([]);

  useEffect(() => {
    if (!billGenerated && cart.length > 0) savedCartRef.current = [...cart];
  }, [cart, billGenerated]);

  useEffect(() => {
    if (cart.length === 0 && !billGenerated) navigate('/billing');
    fetchSettings();
  }, [cart, navigate, billGenerated]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').limit(1).single();
      if (data) setSettings(data);
    } catch (e) { console.error(e); }
  };

  const displayCart = billGenerated ? savedCartRef.current : (cart.length > 0 ? cart : savedCartRef.current);
  const total = displayCart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.qty, 0);

  const generateBill = async () => {
    if (!customerInfo.name) { toast.error('Customer name is required'); return; }
    
    let finalPaidAmount = paymentStatus === 'Paid' ? total : (paymentStatus === 'Pending' ? 0 : Number(paidAmount) || 0);
    if (finalPaidAmount > total) {
      toast.error(`Paid amount cannot exceed the total bill amount of ₹${total.toFixed(2)}`);
      return;
    }
    
    const remainingAmount = total - finalPaidAmount;
    const currentCart = [...cart];
    setIsProcessing(true);
    try {
      const products = currentCart.map(item => ({
        sku: item.sku ?? item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: Number(item.price) || 0,
      }));

      const { data: billData, error: billError } = await supabase
        .from('bills').insert([{ 
          customer_name: customerInfo.name, 
          customer_phone: customerInfo.phone, 
          customer_address: customerInfo.address, 
          total_amount: total,
          status: paymentStatus,
          payment_status: paymentStatus,
          paid_amount: finalPaidAmount,
          pending_amount: remainingAmount,
          remaining_amount: remainingAmount,
          products
        }]).select().single();
      if (billError) throw billError;
      for (const item of currentCart) {
        const { data: productData } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (productData) {
          const newStock = Math.max(0, (productData.stock || 0) - item.qty);
          const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
          if (error) console.error('Failed to update stock for item', item.id, error);
        }
      }
      setBillId(billData.id);
      setBillGenerated(true);
      toast.success('Bill generated successfully!');
      clearCart();
    } catch (error) { 
      console.error("Bill generation error:", error); 
      toast.error(error.message || 'Failed to generate bill'); 
    }
    finally { setIsProcessing(false); }
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '10px 14px',
    border: `1px solid ${focusedInput === field ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    borderRadius: '6px', background: focusedInput === field ? '#FFFFFF' : 'var(--bg-surface)',
    fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-main)',
    outline: 'none', boxSizing: 'border-box', transition: 'all 0.15s',
    boxShadow: focusedInput === field ? '0 0 0 1px var(--accent-primary)' : 'none'
  });

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 60px', fontFamily: 'var(--font-sans)', background: 'var(--bg-main)', minHeight: '100vh', animation: 'fadeIn 0.2s ease-out' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;400i&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />

      {/* Top nav - hidden on print */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }} className="print:hidden">
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Invoice Builder</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Bill Preview</h1>
        </div>
        <button
          onClick={() => navigate('/billing')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13, color: 'var(--text-muted)', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-main)'; e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Back
        </button>
      </div>

      {/* Invoice Card - POS Thermal Receipt Style */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '340px', background: '#FFFFFF', padding: '24px 20px', borderRadius: '8px', boxShadow: 'var(--shadow-md)', color: '#000', fontFamily: "'Courier New', Courier, monospace", fontSize: '13px', lineHeight: 1.4 }}>
          {/* Receipt Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {settings.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height: 48, marginBottom: 8, filter: 'grayscale(100%)' }} />}
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>{settings.company_name || 'STORE NAME'}</h2>
            {settings.address && <p style={{ margin: '0 0 2px', whiteSpace: 'pre-wrap', fontSize: '11px' }}>{settings.address}</p>}
            {settings.phone && <p style={{ margin: '0 0 2px', fontSize: '11px' }}>Ph: {settings.phone}</p>}
            {settings.gst_number && <p style={{ margin: '0 0 2px', fontSize: '11px' }}>GST: {settings.gst_number}</p>}
          </div>

          <div style={{ borderBottom: '1px dashed #000', marginBottom: 12 }} />

          {/* Receipt Info */}
          <div style={{ marginBottom: 12, fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
              <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {billGenerated && (
              <div style={{ marginBottom: 4 }}>Receipt No: INV-{String(billId).padStart(5, '0')}</div>
            )}
            
            {!billGenerated ? (
              <div style={{ marginTop: 8, padding: '8px', border: '1px dotted #ccc' }} className="print:hidden">
                <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: 11 }}>Customer Details (Optional)</p>
                <input type="text" style={{ width: '100%', padding: '4px', marginBottom: 4, fontSize: 12, border: '1px solid #ccc' }} placeholder="Name" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                <input type="text" style={{ width: '100%', padding: '4px', fontSize: 12, border: '1px solid #ccc' }} placeholder="Phone" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
              </div>
            ) : (
              customerInfo.name && (
                <div style={{ marginTop: 4 }}>
                  <div>Customer: {customerInfo.name}</div>
                  {customerInfo.phone && <div>Ph: {customerInfo.phone}</div>}
                </div>
              )
            )}
          </div>

          <div style={{ borderBottom: '1px dashed #000', marginBottom: 12 }} />

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingBottom: 6, borderBottom: '1px dashed #000', fontWeight: 'bold' }}>ITEM</th>
                <th style={{ textAlign: 'center', paddingBottom: 6, borderBottom: '1px dashed #000', fontWeight: 'bold' }}>QTY</th>
                <th style={{ textAlign: 'right', paddingBottom: 6, borderBottom: '1px dashed #000', fontWeight: 'bold' }}>AMT</th>
              </tr>
            </thead>
            <tbody>
              {displayCart.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '8px 0', verticalAlign: 'top', paddingRight: '4px' }}>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#444' }}>@ ₹{Number(item.price).toFixed(2)}</div>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'center', verticalAlign: 'top' }}>{item.qty}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top' }}>₹{(Number(item.price) * item.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000', paddingTop: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', marginBottom: 8 }}>
              <span>TOTAL</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            
            {paymentStatus !== 'Paid' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Paid Amount</span>
                  <span>₹{paymentStatus === 'Pending' ? '0.00' : (Number(paidAmount) || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                  <span>Balance Due</span>
                  <span>₹{paymentStatus === 'Pending' ? total.toFixed(2) : Math.max(0, total - (Number(paidAmount) || 0)).toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
              <span>Status</span>
              <span>{paymentStatus.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', paddingTop: 16, textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 'bold', fontSize: '14px' }}>THANK YOU!</p>
            <p style={{ margin: 0, fontSize: '11px' }}>Please visit again</p>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      {!billGenerated && (
        <div style={{ marginTop: 24, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px 32px', boxShadow: 'var(--shadow-sm)' }} className="print:hidden">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Payment Status</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['Paid', 'Partial', 'Pending'].map(status => (
              <button
                key={status}
                onClick={() => { setPaymentStatus(status); if (status !== 'Partial') setPaidAmount(''); }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                  border: `1px solid ${paymentStatus === status ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: paymentStatus === status ? 'var(--accent-primary)' : 'var(--bg-main)',
                  color: paymentStatus === status ? 'var(--text-inverse)' : 'var(--text-main)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {status}
              </button>
            ))}
          </div>
          
          {paymentStatus === 'Partial' && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, animation: 'fadeIn 0.2s' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Amount Paid (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={e => {
                    const val = e.target.value;
                    if (Number(val) > total) {
                      toast.error(`Cannot exceed total amount of ₹${total.toFixed(2)}`);
                      setPaidAmount(total);
                    } else {
                      setPaidAmount(val);
                    }
                  }}
                  placeholder="0.00"
                  max={total}
                  style={{
                    padding: '10px 14px', width: 200,
                    border: '1px solid var(--accent-primary)',
                    borderRadius: '6px', background: '#FFFFFF',
                    fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Remaining Amount</label>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, color: '#EF4444', margin: 0 }}>
                  ₹{Math.max(0, total - (Number(paidAmount) || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }} className="print:hidden">
        {!billGenerated ? (
          <button
            onClick={generateBill} disabled={isProcessing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px',
              background: isProcessing ? 'var(--border-color)' : 'var(--accent-primary)', color: isProcessing ? 'var(--text-light)' : 'var(--text-inverse)', border: 'none',
              borderRadius: '6px', cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.background = 'var(--accent-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
            onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
          >
            <CheckCircle size={16} strokeWidth={2} />
            {isProcessing ? 'Processing...' : 'Generate & Save Bill'}
          </button>
        ) : (
          <>
            <button
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 24px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <Printer size={16} strokeWidth={1.8} /> Print Invoice
            </button>
            <button
              onClick={() => {
                const text = `Invoice from ${settings.company_name || 'Our Company'}\nCustomer: ${customerInfo.name}\nTotal: ₹${total.toFixed(2)}\nThank you!`;
                window.open(`https://wa.me/${customerInfo.phone}?text=${encodeURIComponent(text)}`, '_blank');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 24px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <Send size={16} strokeWidth={1.8} /> Send via WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BillPreview;