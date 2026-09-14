-- Add 'entry_date' column to 'products' table if it doesn't already exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS entry_date DATE;
