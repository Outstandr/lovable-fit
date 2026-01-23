-- Add anomaly tracking column to daily_steps
ALTER TABLE public.daily_steps 
ADD COLUMN IF NOT EXISTS anomaly_detected boolean DEFAULT false;