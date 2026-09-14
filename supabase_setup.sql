-- Create Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50),
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Bills Table
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Bill Items Table (Logs the products in each bill)
CREATE TABLE bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- Create Settings Table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    gst VARCHAR(50),
    logo_url TEXT
);-- Migration script to adapt your existing database schema to the React App's requirements

-- 1. Update the 'settings' table
ALTER TABLE public.settings 
  RENAME COLUMN gst TO gst_number;

ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Update the 'bills' table
ALTER TABLE public.bills 
  RENAME COLUMN phone TO customer_phone;
  
ALTER TABLE public.bills 
  RENAME COLUMN total TO total_amount;
  
ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- 3. Update the 'bill_items' table
ALTER TABLE public.bill_items 
  RENAME COLUMN price TO price_at_time;

-- 4. Create the 'decrement_stock' function required for the checkout process
-- Note: Since your products table uses an INTEGER id (SERIAL), the row_id parameter must be an INTEGER.
CREATE OR REPLACE FUNCTION public.decrement_stock(row_id INTEGER, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - amount
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Disable Row Level Security (RLS) if you are getting 406 Not Acceptable errors.
-- Supabase enables RLS by default on new projects, which blocks all reads/writes unless policies are set.
-- Since this seems to be a simple internal dashboard, we can disable RLS for now:
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items DISABLE ROW LEVEL SECURITY;


-- Add 'unit' column to 'products' table if it doesn't already exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'units';
