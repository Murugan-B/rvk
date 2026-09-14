-- Add payment tracking columns to the bills table
ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMP WITH TIME ZONE;
