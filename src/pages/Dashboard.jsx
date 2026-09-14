import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { normalizeBillProducts, parseBillProducts } from '../services/billProducts';
import { Package, TrendingUp, AlertTriangle, ArrowUpRight, Bell, ReceiptText, Printer } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, accent, subtext }) => (
  <div
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '28px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: accent }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '2px',
          background: accent + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
        }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <ArrowUpRight size={16} strokeWidth={1.5} color="var(--text-light)" />
    </div>
    <div>
      <p style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: '40px', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{subtext}</p>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    recentSalesCount: 0,
    monthlySales: 0,
    totalSales: 0,
    totalPaid: 0,
    totalPending: 0,
  });
  const [recentBills, setRecentBills] = useState([]);
  const [settings, setSettings] = useState({});
  const [printingBillId, setPrintingBillId] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchRecentBills();
    fetchSettings();

    const refreshInterval = setInterval(() => {
      fetchRecentBills();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const [productsResponse, lowStockResponse, salesCountResponse, allBillsResponse, monthlyBillsResponse] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock', 10),
        supabase.from('bills').select('*', { count: 'exact', head: true }),
        supabase.from('bills').select('total_amount, paid_amount, remaining_amount'),
        supabase.from('bills').select('total_amount').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
      ]);

      const totalProducts = productsResponse.count || 0;
      const lowStock = lowStockResponse.count || 0;
      const recentSalesCount = salesCountResponse.count || 0;

      const allBills = allBillsResponse.data || [];
      const monthlyBills = monthlyBillsResponse.data || [];

      const totalSales = allBills.reduce((sum, bill) => sum + (Number(bill.total_amount) || 0), 0);
      const totalPaid = allBills.reduce((sum, bill) => sum + (Number(bill.paid_amount) || 0), 0);
      const totalPending = allBills.reduce((sum, bill) => sum + Math.max(0, (Number(bill.total_amount) || 0) - (Number(bill.paid_amount) || 0)), 0);
      const monthlySales = monthlyBills.reduce((sum, bill) => sum + (Number(bill.total_amount) || 0), 0);

      setStats({
        totalProducts,
        lowStock,
        recentSalesCount,
        monthlySales,
        totalSales,
        totalPaid,
        totalPending,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRecentBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentBills(data || []);
    } catch (error) {
      console.error(error);
      setRecentBills([]);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').limit(1).single();
      if (data) setSettings(data);
    } catch (error) {
      console.error(error);
    }
  };

  const formatBillTime = (createdAt) => {
    if (!createdAt) return 'Unknown time';
    return new Date(createdAt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const handlePrintBill = async (billId) => {
    setPrintingBillId(billId);
    try {
      const { data: initialBill, error: billError } = await supabase.from('bills').select('*').eq('id', billId).single();

      if (billError) throw billError;

      let bill = initialBill;
      let items = parseBillProducts(initialBill.products);

      if (items.length === 0) {
        bill = await normalizeBillProducts(billId);
        items = parseBillProducts(bill.products);
      }

      const rows = items.map((item, index) => {
        const itemName = item.product_name || item.name || `Item ${index + 1}`;
        const qty = Number(item.quantity || 0);
        const price = Number(item.unit_price ?? (item.price || 0));
        const lineTotal = qty * price;
        return `
          <tr>
            <td style="padding: 8px 0; vertical-align: top; padding-right: 4px;">
              <div style="font-weight: bold;">${escapeHtml(itemName)}</div>
              <div style="font-size: 11px; color: #444;">@ ₹${price.toFixed(2)}</div>
            </td>
            <td style="padding: 8px 0; text-align: center; vertical-align: top;">${qty}</td>
            <td style="padding: 8px 0; text-align: right; vertical-align: top;">₹${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const total = Number(bill.total_amount || 0).toFixed(2);
      const billDate = bill.created_at ? new Date(bill.created_at) : new Date();
      const formattedDate = billDate.toLocaleDateString('en-IN');
      const formattedTime = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const printWindow = window.open('', '_blank', 'width=820,height=920');
      if (!printWindow) return;

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Bill #${bill.id}</title>
            <style>
              @page { margin: 8mm; }
              body { margin: 0; padding: 24px; font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; font-size: 13px; line-height: 1.4; }
              .receipt { width: 340px; max-width: 100%; margin: 0 auto; padding: 24px 20px; background: #fff; color: #000; }
              .center { text-align: center; }
              .divider { border-bottom: 1px dashed #000; margin: 12px 0; }
              .row { display: flex; justify-content: space-between; gap: 12px; }
              .meta { font-size: 12px; margin-bottom: 12px; }
              .title { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; }
              .company { margin: 0 0 4px; font-size: 18px; font-weight: bold; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; }
              thead th { text-align: left; padding-bottom: 6px; border-bottom: 1px dashed #000; font-weight: bold; font-size: 12px; }
              .total-block { border-top: 1px dashed #000; padding-top: 12px; margin-top: 12px; }
              .total-line { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-bottom: 8px; }
              .footer { border-top: 1px dashed #000; padding-top: 16px; text-align: center; margin-top: 16px; }
              img { max-height: 48px; margin-bottom: 8px; filter: grayscale(100%); }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="center">
                ${settings.logo_url ? `<img src="${escapeHtml(settings.logo_url)}" alt="Logo" />` : ''}
                <p class="company">${escapeHtml(settings.company_name || 'STORE NAME')}</p>
                ${settings.address ? `<p style="margin: 0 0 2px; white-space: pre-wrap; font-size: 11px;">${escapeHtml(settings.address)}</p>` : ''}
                ${settings.phone ? `<p style="margin: 0 0 2px; font-size: 11px;">Ph: ${escapeHtml(settings.phone)}</p>` : ''}
                ${settings.gst_number ? `<p style="margin: 0 0 2px; font-size: 11px;">GST: ${escapeHtml(settings.gst_number)}</p>` : ''}
              </div>

              <div class="divider"></div>

              <div class="meta">
                <div class="row"><span>Date: ${escapeHtml(formattedDate)}</span><span>${escapeHtml(formattedTime)}</span></div>
                <div style="margin-top: 4px;">Receipt No: INV-${String(bill.id).padStart(5, '0')}</div>
                <div style="margin-top: 4px;">Customer: ${escapeHtml(bill.customer_name || 'Walk-in Customer')}</div>
                ${bill.customer_phone ? `<div>Ph: ${escapeHtml(bill.customer_phone)}</div>` : ''}
                <div>Status: ${escapeHtml(bill.payment_status || 'Paid')}</div>
              </div>

              <div class="divider"></div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 60%;">ITEM</th>
                    <th style="width: 15%; text-align: center;">QTY</th>
                    <th style="width: 25%; text-align: right;">AMT</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || '<tr><td colspan="3" style="padding: 8px 0;">No items found</td></tr>'}
                </tbody>
              </table>

              <div class="total-block">
                <div class="total-line"><span>TOTAL</span><span>₹${total}</span></div>
                ${bill.payment_status !== 'Paid' ? `
                  <div class="meta" style="margin-bottom: 0;">
                    <div class="row"><span>Paid Amount</span><span>₹${Number(bill.paid_amount || 0).toFixed(2)}</span></div>
                    <div class="row" style="font-weight: bold;"><span>Balance Due</span><span>₹${Number(bill.remaining_amount || 0).toFixed(2)}</span></div>
                  </div>
                ` : ''}
              </div>

              <div class="footer">
                <p style="margin: 0 0 4px; font-weight: bold; font-size: 14px;">THANK YOU!</p>
                <p style="margin: 0; font-size: 11px;">Please visit again</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    } catch (error) {
      console.error('Failed to print bill', error);
      window.alert('Failed to print this bill. Please check bill data and try again.');
    } finally {
      setPrintingBillId(null);
    }
  };

  return (
    <div style={{ padding: '40px 48px', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'var(--font-sans)' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, gap: 24, animation: 'fadeIn 0.4s ease-out' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
            Dashboard
          </h1>
        </div>

        {recentBills.length > 0 && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px 28px',
            minWidth: '320px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#4A7FA5' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Latest Bill
              </p>
              <button
                onClick={() => fetchRecentBills()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ↻ Refresh
              </button>
            </div>
            <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>
              INV-{String(recentBills[0].id).padStart(5, '0')}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-light)' }}>
              {recentBills[0].customer_name || 'Walk-in Customer'}
            </p>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Amount</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>₹{Number(recentBills[0].total_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: Math.max(0, Number(recentBills[0].total_amount) - Number(recentBills[0].paid_amount || 0)) === 0 ? '#4A8C5C20' : Number(recentBills[0].paid_amount || 0) > 0 ? '#F59E0B20' : '#C0572A20',
                  color: Math.max(0, Number(recentBills[0].total_amount) - Number(recentBills[0].paid_amount || 0)) === 0 ? '#2F855A' : Number(recentBills[0].paid_amount || 0) > 0 ? '#D97706' : '#C0572A',
                }}>
                  {Math.max(0, Number(recentBills[0].total_amount) - Number(recentBills[0].paid_amount || 0)) === 0 ? 'Paid' : Number(recentBills[0].paid_amount || 0) > 0 ? 'Partial' : 'Pending'}
                </span>
              </div>
              {Number(recentBills[0].paid_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paid</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2F855A' }}>₹{Number(recentBills[0].paid_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {Math.max(0, Number(recentBills[0].total_amount) - Number(recentBills[0].paid_amount || 0)) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#C0572A' }}>₹{Math.max(0, Number(recentBills[0].total_amount) - Number(recentBills[0].paid_amount || 0)).toFixed(2)}</span>
                </div>
              )}
            </div>
            <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-light)' }}>
              {formatBillTime(recentBills[0].created_at)}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, animation: 'slideUp 0.5s ease-out' }}>
        <StatCard icon={TrendingUp} label="Monthly Sales" value={`₹${stats.monthlySales.toFixed(2)}`} accent="#4A8C5C" subtext="Current month total" />
        <StatCard icon={Package} label="Total Sales" value={`₹${stats.totalSales.toFixed(2)}`} accent="#4A7FA5" subtext="All time total" />
        <StatCard icon={ReceiptText} label="Paid Amount" value={`₹${stats.totalPaid.toFixed(2)}`} accent="#2F855A" subtext="Collected payments" />
        <StatCard icon={AlertTriangle} label="Pending Amount" value={`₹${stats.totalPending.toFixed(2)}`} accent="#C0572A" subtext="Remaining dues" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 20, animation: 'slideUp 0.5s ease-out' }}>
        <StatCard icon={Package} label="Total Products" value={stats.totalProducts} accent="#4A7FA5" subtext="Items in catalogue" />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={stats.lowStock} accent="#C0572A" subtext="Below threshold of 10" />
        <StatCard icon={TrendingUp} label="Total Invoices" value={stats.recentSalesCount} accent="#4A8C5C" subtext="All time invoices" />
      </div>

      <div style={{ marginTop: 28, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.55s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} color="var(--text-muted)" />
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Recent Bill Notifications
            </p>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-light)' }}>
            {recentBills.length} latest
          </span>
        </div>

        {recentBills.length === 0 ? (
          <div style={{ padding: '22px 20px', color: 'var(--text-light)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            No recent bills found.
          </div>
        ) : (
          <div>
            {recentBills.map((bill) => (
              <div key={bill.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '2px', background: '#4A7FA518', color: '#4A7FA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReceiptText size={15} />
                  </div>
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14, fontWeight: 500 }}>
                      Bill #{bill.id} added for {bill.customer_name || 'Walk-in Customer'}
                    </p>
                    <p style={{ margin: '3px 0 0', color: 'var(--text-light)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {formatBillTime(bill.created_at)}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => handlePrintBill(bill.id)}
                    disabled={printingBillId === bill.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid var(--border-color)',
                      background: '#fff',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      padding: '6px 10px',
                      cursor: printingBillId === bill.id ? 'not-allowed' : 'pointer',
                      opacity: printingBillId === bill.id ? 0.7 : 1,
                    }}
                  >
                    <Printer size={13} /> {printingBillId === bill.id ? 'Printing...' : 'Print'}
                  </button>

                  <div>
                  <p style={{ margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    Rs. {Number(bill.total_amount || 0).toFixed(2)}
                  </p>
                  <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: Math.max(0, Number(bill.total_amount) - Number(bill.paid_amount || 0)) > 0 ? '#C0572A' : '#4A8C5C' }}>
                    {Math.max(0, Number(bill.total_amount) - Number(bill.paid_amount || 0)) === 0 ? 'Paid' : Number(bill.paid_amount || 0) > 0 ? 'Partial' : 'Pending'}
                  </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 40, padding: '24px 32px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', animation: 'fadeIn 0.6s ease-out' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-light)', textTransform: 'uppercase' }}>
          System Status
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A8C5C', boxShadow: '0 0 0 3px #4A8C5C30' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>All systems operational</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;