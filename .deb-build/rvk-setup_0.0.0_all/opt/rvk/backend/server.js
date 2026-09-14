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
  const { customerName, customerContact, subtotal, taxAmount, discountAmount, totalAmount, paymentMethod, items } = req.body;
  try {
    // 1. Insert bill
    const { data: bill, error: billError } = await supabase.from('bills').insert([{
      customer_name: customerName,
      customer_contact: customerContact,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
    }]).select();
    
    if (billError) throw billError;
    const billId = bill[0].id;

    // 2. Insert items
    if (items && items.length > 0) {
      const billItems = items.map(item => ({
        bill_id: billId,
        product_id: item.id,
        quantity: item.cartQuantity,
        price: item.price
      }));
      const { error: itemsError } = await supabase.from('bill_items').insert(billItems);
      if (itemsError) throw itemsError;
    }

    res.json(bill[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bills').select('*, bill_items(*)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bills').select('*, bill_items(!inner(*))').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
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
