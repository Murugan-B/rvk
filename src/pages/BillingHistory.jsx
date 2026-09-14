import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { normalizeBillProducts, parseBillProducts } from '../services/billProducts';
import { Search, FileText, Calendar, Eye, Send, Printer, X, Edit2, Check, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as htmlToImage from 'html-to-image';

const BillingHistory = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [settings, setSettings] = useState({});
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearType, setClearType] = useState('all');
  const [clearStartDate, setClearStartDate] = useState('');
  const [clearEndDate, setClearEndDate] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [updatePaymentStatus, setUpdatePaymentStatus] = useState('Paid');
  const [updatePaidAmount, setUpdatePaidAmount] = useState('');
  const billImageRef = useRef(null);

  useEffect(() => { 
    fetchBills(); 
    fetchSettings();

    const refreshInterval = setInterval(() => {
      fetchBills();
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').limit(1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      let fetchQuery = supabase.from('bills').select('id');
      
      if (clearType === 'range') {
        if (!clearStartDate || !clearEndDate) {
          toast.error('Please select both start and end dates');
          setIsClearing(false);
          return;
        }
        const start = new Date(clearStartDate).toISOString();
        const end = new Date(clearEndDate);
        end.setHours(23, 59, 59, 999);
        
        fetchQuery = fetchQuery
          .gte('created_at', start)
          .lte('created_at', end.toISOString());
      }
      
      const { data: billsToClear, error: fetchErr } = await fetchQuery;
      if (fetchErr) throw fetchErr;
      
      if (!billsToClear || billsToClear.length === 0) {
        toast.error('No records found to delete in this criteria');
        setShowClearModal(false);
        setIsClearing(false);
        return;
      }

      // Supabase has a max delete count limit per request based on Postgres limit (around 1000 items),
      // we'll chunk the IDs if needed or assume we'll just send it. Usually, `in('id', ids)` handles normal ranges fine.
      const ids = billsToClear.map(b => b.id);
      
      // Delete parent bills; any legacy child rows will be removed by the database cascade.
      const { error: billsErr } = await supabase.from('bills').delete().in('id', ids);
      if (billsErr) throw billsErr;
      
      toast.success(`Successfully cleared ${ids.length} billing records!`);
      setShowClearModal(false);
      fetchBills();
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear records');
    }
    setIsClearing(false);
  };

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBills(data || []);
    } catch (error) { console.error(error); toast.error('Failed to load billing history'); }
    finally { setLoading(false); }
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch = (bill.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bill.customer_phone || '').includes(searchTerm) ||
      String(bill.id).includes(searchTerm);

    if (!matchesSearch) return false;

    if (dateFilter === 'custom' && selectedDate) {
      const billDate = new Date(bill.created_at);
      const year = billDate.getFullYear();
      const month = String(billDate.getMonth() + 1).padStart(2, '0');
      const day = String(billDate.getDate()).padStart(2, '0');
      const formattedBillDate = `${year}-${month}-${day}`;
      return formattedBillDate === selectedDate;
    }

    if (dateFilter === 'all') return true;

    const billDate = new Date(bill.created_at);
    const now = new Date();

    if (dateFilter === 'today') {
      return billDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return billDate >= weekAgo;
    } else if (dateFilter === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return billDate >= monthAgo;
    }

    return true;
  });

  const openBillDetails = async (bill) => {
    setSelectedBill(bill);
    setLoadingItems(true);
    try {
      let billProducts = parseBillProducts(bill.products);

      if (billProducts.length === 0) {
        const normalizedBill = await normalizeBillProducts(bill.id);
        billProducts = parseBillProducts(normalizedBill.products);
        setSelectedBill(normalizedBill);
        setBills((prev) => prev.map((entry) => (entry.id === normalizedBill.id ? normalizedBill : entry)));
      }

      setBillItems(billProducts);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load bill items');
    } finally {
      setLoadingItems(false);
    }
  };

  const getItemPrice = (item) => Number(item.unit_price ?? item.price_at_time ?? item.price ?? 0);

  const getItemName = (item) => item.product_name || item.name || item.products?.name || `Item ${item.product_id || ''}`.trim() || 'Unknown Item';

  const handleWhatsApp = async (bill) => {
    try {
      if (billImageRef.current) {
        const dataUrl = await htmlToImage.toPng(billImageRef.current, { backgroundColor: '#ffffff' });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `Invoice_${bill.id}.png`, { type: 'image/png' });
        
        let shared = false;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Invoice INV-${String(bill.id).padStart(5, '0')}`,
              text: `Invoice from ${settings.company_name || 'Our Company'}\nCustomer: ${bill.customer_name}\nTotal Amount: ₹${Number(bill.total_amount).toFixed(2)}\nThank you for your business!`
            });
            shared = true;
          } catch (shareError) {
            console.error('Share API error:', shareError);
          }
        }
        
        if (!shared) {
          // Fallback to Clipboard API
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success('Bill image copied! Opening WhatsApp to paste...');
            const text = `Invoice from ${settings.company_name || 'Our Company'}\nCustomer: ${bill.customer_name}\nTotal Amount: ₹${Number(bill.total_amount).toFixed(2)}\n*Please paste the image here.*\nThank you for your business!`;
            const url = `https://wa.me/${bill.customer_phone || ''}?text=${encodeURIComponent(text)}`;
            setTimeout(() => window.open(url, '_blank'), 1500);
          } catch (clipErr) {
             const text = `Invoice from ${settings.company_name || 'Our Company'}\nCustomer: ${bill.customer_name}\nTotal Amount: ₹${Number(bill.total_amount).toFixed(2)}\nThank you for your business!`;
             const url = `https://wa.me/${bill.customer_phone || ''}?text=${encodeURIComponent(text)}`;
             window.open(url, '_blank');
          }
        }
      } else {
        const text = `Invoice from ${settings.company_name || 'Our Company'}\nCustomer: ${bill.customer_name}\nTotal Amount: ₹${Number(bill.total_amount).toFixed(2)}\nThank you for your business!`;
        const url = `https://wa.me/${bill.customer_phone || ''}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error('Error sharing invoice:', e);
      toast.error('Failed to generate image to share');
      const text = `Invoice from ${settings.company_name || 'Our Company'}\nCustomer: ${bill.customer_name}\nTotal Amount: ₹${Number(bill.total_amount).toFixed(2)}\nThank you for your business!`;
      const url = `https://wa.me/${bill.customer_phone || ''}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdatePhone = async () => {
    if (!editPhoneValue) {
      toast.error('Phone number cannot be empty');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('bills')
        .update({ customer_phone: editPhoneValue })
        .eq('id', selectedBill.id);
        
      if (error) throw error;
      
      setSelectedBill({ ...selectedBill, customer_phone: editPhoneValue });
      setBills(bills.map(b => b.id === selectedBill.id ? { ...b, customer_phone: editPhoneValue } : b));
      setIsEditingPhone(false);
      toast.success('Phone number updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update phone number');
    }
  };

  const handleSavePaymentUpdate = async () => {
    try {
      let finalPaidAmount = Number(selectedBill.paid_amount) || 0;
      let newStatus = updatePaymentStatus;
      
      if (updatePaymentStatus === 'Paid') {
        finalPaidAmount = Number(selectedBill.total_amount);
      } else if (updatePaymentStatus === 'Pending') {
        finalPaidAmount = 0;
      } else {
        const amountToPay = Number(updatePaidAmount) || 0;
        if (amountToPay <= 0) {
          toast.error('Please enter a valid amount to pay');
          return;
        }
        if (amountToPay > Number(selectedBill.remaining_amount)) {
          toast.error(`Amount cannot exceed the remaining balance of ₹${Number(selectedBill.remaining_amount).toFixed(2)}`);
          return;
        }
        finalPaidAmount += amountToPay;
        if (finalPaidAmount >= Number(selectedBill.total_amount)) {
          finalPaidAmount = Number(selectedBill.total_amount);
          newStatus = 'Paid';
        }
      }

      const remainingAmount = Number(selectedBill.total_amount) - finalPaidAmount;

      const { error } = await supabase
        .from('bills')
        .update({ 
          payment_status: newStatus, 
          paid_amount: finalPaidAmount,
          remaining_amount: remainingAmount,
          payment_updated_at: new Date().toISOString()
        })
        .eq('id', selectedBill.id);
        
      if (error) throw error;
      
      const updatedBill = {
        ...selectedBill,
        payment_status: newStatus,
        paid_amount: finalPaidAmount,
        remaining_amount: remainingAmount,
        payment_updated_at: new Date().toISOString()
      };
      
      setSelectedBill(updatedBill);
      setBills(bills.map(b => b.id === updatedBill.id ? updatedBill : b));
      toast.success('Payment status updated successfully');
      setIsUpdatingPayment(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update payment status');
    }
  };

  return (
    <div style={{ padding: '40px 48px', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />

      <div className="print:hidden" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Transaction Records</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 700, color: 'var(--text-main)', margin: 0, lineHeight: 1.1 }}>Billing History</h1>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} strokeWidth={1.8} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--accent-primary)' : 'var(--text-light)', transition: 'color 0.15s' }} />
            <input
              type="text"
              placeholder="Search name, phone or ID..."
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
          
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              if (e.target.value !== 'custom') setSelectedDate('');
            }}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px', background: 'var(--bg-surface)',
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-main)',
              outline: 'none', cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="weekly">Past 7 Days</option>
            <option value="monthly">Past 30 Days</option>
            <option value="custom">Custom Date</option>
          </select>

          {dateFilter === 'custom' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px', background: 'var(--bg-surface)',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-main)',
                outline: 'none', cursor: 'pointer', transition: 'all 0.15s'
              }}
            />
          )}

            <button 
              onClick={() => setShowClearModal(true)}
              style={{ padding: '10px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'var(--font-sans)', fontSize: 13, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              title="Clear Billing History"
            >
              <Trash2 size={14} /> Clear Records
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', flex: 1, boxShadow: 'var(--shadow-sm)', animation: 'slideUp 0.4s ease-out' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Invoice</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phone</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Amount</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-light)' }}>Loading records...</td></tr>
            ) : filteredBills.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '80px 20px', textAlign: 'center' }}>
                  <FileText size={36} style={{ color: 'var(--text-light)', display: 'block', margin: '0 auto 12px' }} strokeWidth={1.2} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-light)', letterSpacing: '0.05em' }}>
                    {searchTerm ? `No records matching "${searchTerm}"` : 'No billing records yet'}
                  </p>
                </td>
              </tr>
            ) : filteredBills.map((bill) => (
              <tr
                key={bill.id}
                onMouseEnter={() => setHoveredRow(bill.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{ borderBottom: '1px solid var(--border-color)', background: hoveredRow === bill.id ? 'var(--bg-surface-hover)' : 'transparent', transition: 'background 0.2s' }}
              >
                <td style={{ padding: '15px 20px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-primary)', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', padding: '3px 9px', borderRadius: '4px' }}>
                    INV-{String(bill.id).padStart(5, '0')}
                  </span>
                </td>
                <td style={{ padding: '15px 20px', fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-main)', fontSize: 14 }}>{bill.customer_name || 'N/A'}</td>
                <td style={{ padding: '15px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{bill.customer_phone || '—'}</td>
                <td style={{ padding: '15px 20px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#4A7FA5', fontWeight: 500 }}>
                    ₹{Number(bill.total_amount).toFixed(2)}
                  </span>
                </td>
                <td style={{ padding: '15px 20px' }}>
                  {!bill.payment_status || bill.payment_status === 'Paid' ? (
                    <span style={{ color: '#10B981', fontSize: 12, fontWeight: 600, background: '#D1FAE5', padding: '3px 8px', borderRadius: '4px' }}>Paid</span>
                  ) : bill.payment_status === 'Pending' ? (
                    <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 600, background: '#FEE2E2', padding: '3px 8px', borderRadius: '4px' }}>Pending</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600, background: '#FEF3C7', padding: '3px 8px', borderRadius: '4px' }}>Partial</span>
                      <span style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Left: ₹{Number(bill.remaining_amount).toFixed(2)}</span>
                    </div>
                  )}
                </td>
                <td style={{ padding: '15px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Calendar size={13} strokeWidth={1.8} color="var(--text-light)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(bill.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                    {bill.payment_updated_at && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: 4, padding: '1px 4px' }}>UPDATED</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(bill.payment_updated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                  <button 
                    onClick={() => openBillDetails(bill)}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Eye size={14} /> View
                  </button>
                  {bill.customer_phone && (
                    <button 
                      onClick={() => handleWhatsApp(bill)}
                      style={{ background: '#10B981', border: 'none', borderRadius: '6px', padding: '7px 8px', display: 'inline-flex', alignItems: 'center', marginLeft: 8, color: '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      title="Send WhatsApp"
                    >
                      <Send size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredBills.length > 0 && (
        <p style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-light)', letterSpacing: '0.06em' }}>
          {filteredBills.length} record{filteredBills.length !== 1 ? 's' : ''}{searchTerm ? ` matching "${searchTerm}"` : ' total'}
        </p>
      )}
      </div>

      {selectedBill && (
        <div className="modal-overlay print:!static print:!bg-transparent print:!p-0" style={{ zIndex: 1000 }}>
          <div className="modal-content print:!static print:!shadow-none print:!border-none print:!m-0 print:!max-w-none print:!max-h-none print:!overflow-visible" style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            {/* Modal Accent */}
            <div className="print:hidden" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent-primary)', zIndex: 1 }} />
            
            {/* Modal Header */}
            <div className="print:hidden" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Invoice Details</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>INV-{String(selectedBill.id).padStart(5, '0')}</h2>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handlePrint}
                  style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)', border: 'none', padding: '10px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => { setSelectedBill(null); setIsUpdatingPayment(false); }}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Content Area (On-Screen A4 Layout) */}
            <div className="print:hidden" style={{ padding: '32px', overflowY: 'auto', flex: 1, background: '#FFFFFF' }}>
              {/* Invoice Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 28, marginBottom: 28, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {settings.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height: 56, borderRadius: '6px' }} />}
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px' }}>{settings.company_name || 'Company Name'}</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: '0 0 2px' }}>{settings.address || 'Company Address'}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                      {settings.phone || 'N/A'} {settings.gst_number && `· GST: ${settings.gst_number}`}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 6 }}>Invoice</p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    INV-{String(selectedBill.id).padStart(5, '0')}
                  </p>
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 24, borderBottom: '1px dashed var(--border-color)' }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Bill To</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{selectedBill.customer_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {isEditingPhone ? (
                      <>
                        <input
                          type="text"
                          value={editPhoneValue}
                          onChange={(e) => setEditPhoneValue(e.target.value)}
                          style={{ fontSize: 14, color: 'var(--text-main)', padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: '#FFFFFF', width: '130px' }}
                          autoFocus
                        />
                        <button onClick={handleUpdatePhone} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Check size={14} />
                        </button>
                        <button onClick={() => setIsEditingPhone(false)} style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{selectedBill.customer_phone}</p>
                        <button
                          onClick={() => {
                            setEditPhoneValue(selectedBill.customer_phone || '');
                            setIsEditingPhone(true);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#4A7FA5', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px 6px', fontSize: 11, fontWeight: 500, textDecoration: 'underline' }}
                          title="Edit Phone Number"
                        >
                          Add / Edit Ph Number
                        </button>
                      </>
                    )}
                  </div>
                  {selectedBill.customer_address && <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 250, whiteSpace: 'pre-wrap' }}>{selectedBill.customer_address}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Date</p>
                  <p style={{ fontSize: 14, color: 'var(--text-main)' }}>
                    {new Date(selectedBill.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                    {new Date(selectedBill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                  
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Status</p>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {!selectedBill.payment_status || selectedBill.payment_status === 'Paid' ? (
                      <span style={{ color: '#10B981', fontSize: 14, fontWeight: 600 }}>Paid</span>
                    ) : selectedBill.payment_status === 'Pending' ? (
                      <span style={{ color: '#EF4444', fontSize: 14, fontWeight: 600 }}>Pending</span>
                    ) : (
                      <>
                        <span style={{ color: '#F59E0B', fontSize: 14, fontWeight: 600 }}>Partial (Paid: ₹{Number(selectedBill.paid_amount || 0).toFixed(2)})</span>
                        <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>Remaining: ₹{Number(selectedBill.remaining_amount || 0).toFixed(2)}</span>
                      </>
                    )}
                    {selectedBill.payment_updated_at && (
                      <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Updated: {new Date(selectedBill.payment_updated_at).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table (On-Screen) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 0', textAlign: 'left', fontSize: 12, color: 'var(--text-main)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Description</th>
                    <th style={{ padding: '12px 0', textAlign: 'right', fontSize: 12, color: 'var(--text-main)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                    <th style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-main)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Qty</th>
                    <th style={{ padding: '12px 0', textAlign: 'right', fontSize: 12, color: 'var(--text-main)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItems ? (
                    <tr><td colSpan="4" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>Loading line items...</td></tr>
                  ) : billItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 0', fontSize: 14, color: 'var(--text-main)' }}>{getItemName(item)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontSize: 14, color: 'var(--text-muted)' }}>₹{getItemPrice(item).toFixed(2)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'center', fontSize: 14, color: 'var(--text-main)' }}>{item.quantity} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.products?.unit || ''}</span></td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontSize: 14, color: 'var(--text-main)', fontWeight: 500 }}>₹{(getItemPrice(item) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid var(--border-color)', paddingTop: '20px', marginBottom: '32px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Amount</p>
                  <p style={{ fontSize: 28, fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--accent-primary)' }}>₹{Number(selectedBill.total_amount).toFixed(2)}</p>
                </div>
              </div>

            </div>

            {/* POS Thermal Receipt (Off-screen for htmlToImage and Print) */}
            <div className="offscreen-receipt">
              <div ref={billImageRef} style={{ width: '100%', maxWidth: '340px', background: '#FFFFFF', color: '#000', fontFamily: "'Courier New', Courier, monospace", fontSize: '13px', lineHeight: 1.4, padding: '24px 20px' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  {settings.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height: 48, marginBottom: 8, filter: 'grayscale(100%)' }} />}
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>{settings.company_name || 'STORE NAME'}</h2>
                  {settings.address && <p style={{ margin: '0 0 2px', whiteSpace: 'pre-wrap', fontSize: '11px' }}>{settings.address}</p>}
                  {settings.phone && <p style={{ margin: '0 0 2px', fontSize: '11px' }}>Ph: {settings.phone}</p>}
                  {settings.gst_number && <p style={{ margin: '0 0 2px', fontSize: '11px' }}>GST: {settings.gst_number}</p>}
                </div>

                <div style={{ borderBottom: '1px dashed #000', marginBottom: 12 }} />

                <div style={{ marginBottom: 12, fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Date: {new Date(selectedBill.created_at).toLocaleDateString('en-IN')}</span>
                    <span>{new Date(selectedBill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ marginBottom: 4 }}>Receipt No: INV-{String(selectedBill.id).padStart(5, '0')}</div>
                  
                  {selectedBill.customer_name && (
                    <div style={{ marginTop: 4 }}>
                      <div>Customer: {selectedBill.customer_name}</div>
                      {selectedBill.customer_phone && <div>Ph: {selectedBill.customer_phone}</div>}
                    </div>
                  )}
                </div>

                <div style={{ borderBottom: '1px dashed #000', marginBottom: 12 }} />

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingBottom: 6, borderBottom: '1px dashed #000', fontWeight: 'bold' }}>ITEM</th>
                      <th style={{ textAlign: 'center', paddingBottom: 6, borderBottom: '1px dashed #000', fontWeight: 'bold' }}>QTY</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6, borderBottom: '1px dashed #000', fontWeight: 'bold' }}>AMT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px 0', verticalAlign: 'top', paddingRight: '4px' }}>
                          <div style={{ fontWeight: 'bold' }}>{getItemName(item)}</div>
                          <div style={{ fontSize: '11px', color: '#444' }}>@ ₹{getItemPrice(item).toFixed(2)}</div>
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top' }}>₹{(getItemPrice(item) * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', paddingTop: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', marginBottom: 8 }}>
                    <span>TOTAL</span>
                    <span>₹{Number(selectedBill.total_amount).toFixed(2)}</span>
                  </div>
                  
                  {selectedBill.payment_status !== 'Paid' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                        <span>Paid Amount</span>
                        <span>₹{Number(selectedBill.paid_amount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                        <span>Balance Due</span>
                        <span>₹{Number(selectedBill.remaining_amount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
                    <span>Status</span>
                    <span>{selectedBill.payment_status?.toUpperCase()}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #000', paddingTop: 16, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 'bold', fontSize: '14px' }}>THANK YOU!</p>
                  <p style={{ margin: 0, fontSize: '11px' }}>Please visit again</p>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="print:hidden" style={{ padding: '20px 32px', background: 'var(--bg-surface-hover)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                {selectedBill.payment_status && selectedBill.payment_status !== 'Paid' && !isUpdatingPayment && (
                  <button 
                    onClick={() => {
                      setUpdatePaymentStatus('Paid');
                      setUpdatePaidAmount('');
                      setIsUpdatingPayment(true);
                    }}
                    style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    Update Payment
                  </button>
                )}

                {isUpdatingPayment && (
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.2s ease-out', maxWidth: '350px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Update Payment Status</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: updatePaymentStatus === 'Partial' ? 12 : 16 }}>
                      {['Paid', 'Partial'].map(status => (
                        <button
                          key={status}
                          onClick={() => { setUpdatePaymentStatus(status); if (status !== 'Partial') setUpdatePaidAmount(''); }}
                          style={{
                            padding: '6px 14px', borderRadius: '4px', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500,
                            border: `1px solid ${updatePaymentStatus === status ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            background: updatePaymentStatus === status ? 'var(--accent-primary)' : 'var(--bg-main)',
                            color: updatePaymentStatus === status ? '#fff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    {updatePaymentStatus === 'Partial' && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Amount to Pay Now (₹)</label>
                        <input
                          type="number"
                          value={updatePaidAmount}
                          onChange={e => setUpdatePaidAmount(e.target.value)}
                          placeholder={`Max: ₹${Number(selectedBill.remaining_amount).toFixed(2)}`}
                          max={Number(selectedBill.remaining_amount)}
                          style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '200px', fontSize: 13, outline: 'none' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleSavePaymentUpdate} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Save Update</button>
                      <button onClick={() => setIsUpdatingPayment(false)} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '4px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', alignSelf: 'flex-start' }}>
                <button 
                  onClick={() => handleWhatsApp(selectedBill)}
                  style={{ background: '#10B981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Send size={18} /> Resend via WhatsApp
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 450, padding: 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#EF4444' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#FEF2F2', padding: 12, borderRadius: '50%' }}>
                <AlertTriangle size={24} color="#EF4444" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Clear History</h2>
            </div>
            
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete billing records? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-main)' }}>
                <input 
                  type="radio" 
                  name="clearType" 
                  value="all" 
                  checked={clearType === 'all'} 
                  onChange={(e) => setClearType(e.target.value)} 
                  style={{ accentColor: '#EF4444' }}
                />
                Clear All Billing History
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-main)' }}>
                <input 
                  type="radio" 
                  name="clearType" 
                  value="range" 
                  checked={clearType === 'range'} 
                  onChange={(e) => setClearType(e.target.value)}
                  style={{ accentColor: '#EF4444' }} 
                />
                Clear Specific Date Range
              </label>

              {clearType === 'range' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8, paddingLeft: 28 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-light)', marginBottom: 6 }}>Start Date</label>
                    <input 
                      type="date" 
                      value={clearStartDate}
                      onChange={(e) => setClearStartDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-light)', marginBottom: 6 }}>End Date</label>
                    <input 
                      type="date" 
                      value={clearEndDate}
                      onChange={(e) => setClearEndDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'auto' }}>
              <button 
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '6px', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Cancel
              </button>
              <button 
                onClick={handleClearHistory}
                disabled={isClearing}
                style={{ background: '#EF4444', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: 14, fontWeight: 500, cursor: isClearing ? 'not-allowed' : 'pointer', opacity: isClearing ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={e => { if (!isClearing) { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { if (!isClearing) { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >
                {isClearing ? 'Clearing...' : 'Confirm Delete'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingHistory;