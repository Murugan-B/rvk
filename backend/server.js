require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });
const distPath = path.join(__dirname, '..', 'dist');
const indexFile = path.join(distPath, 'index.html');

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const { data: bills, error: billsError } = await supabase.from('bills').select('total_amount');
    if (billsError) throw billsError;
    const totalSales = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

    const { data: products, error: productsError } = await supabase.from('products').select('*');
    if (productsError) throw productsError;
    const totalItems = products.length;
    const lowStock = products.filter(p => p.stock < 10).length;

    res.json({ totalSales, totalItems, lowStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').insert([req.body]).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('store_settings').select('*').single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { data: existing } = await supabase.from('store_settings').select('id').single();
    let result;
    if (existing) {
      result = await supabase.from('store_settings').update(req.body).eq('id', existing.id, { returning: true }).select('*');
    } else {
      result = await supabase.from('store_settings').insert([req.body]).select('*');
    }
    res.json(result.data ? result.data[0] : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings - File Upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    
    // Fetch a reliable current timestamp to bypass local clock drift issues in signed requests
    let currentUnixTime = Math.round(Date.now() / 1000);
    try {
      const response = await fetch('https://api.github.com', { method: 'HEAD' });
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        currentUnixTime = Math.round(new Date(dateHeader).getTime() / 1000);
      }
    } catch (e) {
      console.log('Failed to fetch external time, using local');
    }
    
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'pos_system',
      timestamp: currentUnixTime
    });
    
    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Billing
app.post('/api/bills', async (req, res) => {
  const { customerName, customerContact, subtotal, taxAmount, discountAmount, totalAmount, paymentMethod, paymentStatus, paidAmount, pendingAmount, items, products } = req.body;
  try {
    const normalizedProducts = Array.isArray(products) && products.length > 0
      ? products
      : Array.isArray(items)
        ? items.map(item => ({
            sku: item.sku ?? item.id,
            product_name: item.name,
            quantity: item.cartQuantity ?? item.quantity ?? 0,
            unit_price: Number(item.price) || 0,
          }))
        : [];

    // 1. Insert bill
    const { data: bill, error: billError } = await supabase.from('bills').insert([{
      customer_name: customerName,
      customer_contact: customerContact,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: paymentStatus,
      payment_status: paymentStatus,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      remaining_amount: pendingAmount,
      products: normalizedProducts,
    }]).select();
    
    if (billError) throw billError;

    res.json(bill[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bills').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bills/:id/normalize', async (req, res) => {
  try {
    const { data: bill, error: billError } = await supabase.from('bills').select('*').eq('id', req.params.id).single();
    if (billError) throw billError;

    const existingProducts = Array.isArray(bill.products)
      ? bill.products
      : typeof bill.products === 'string'
        ? JSON.parse(bill.products || '[]')
        : [];

    if (existingProducts.length > 0) {
      return res.json(bill);
    }

    const { data: billItems, error: itemsError } = await supabase
      .from('bill_items')
      .select('product_id, quantity, price_at_time, products(name)')
      .eq('bill_id', req.params.id);

    if (itemsError) throw itemsError;

    const normalizedProducts = (billItems || []).map((item) => ({
      sku: String(item.product_id),
      product_name: item.products?.name || `Item ${item.product_id}`,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.price_at_time || 0),
    }));

    if (normalizedProducts.length === 0) {
      return res.json(bill);
    }

    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update({ products: normalizedProducts })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json(updatedBill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (!fs.existsSync(indexFile)) {
  console.warn(`Frontend build not found at ${indexFile}. Run npm run build before npm run start.`);
}

app.use('/assets', express.static(path.join(distPath, 'assets')));

const sendApp = (req, res) => {
  res.sendFile(indexFile);
};

const spaRoutes = ['/', '/login', '/inventory', '/billing', '/billing-history', '/bill-preview', '/settings'];
spaRoutes.forEach((routePath) => {
  app.get(routePath, sendApp);
  app.head(routePath, sendApp);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
