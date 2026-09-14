-- Add 'unit' column to 'products' table if it doesn't already exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'units';
