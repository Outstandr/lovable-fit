-- Add missing columns to access_codes table for customer info from main site
ALTER TABLE public.access_codes
ADD COLUMN customer_email text,
ADD COLUMN customer_name text,
ADD COLUMN product_name text,
ADD COLUMN purchase_id text;