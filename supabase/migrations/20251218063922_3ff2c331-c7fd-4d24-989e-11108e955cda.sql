-- Add new columns to profiles table for settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_step_goal integer DEFAULT 10000,
ADD COLUMN IF NOT EXISTS unit_preference character varying DEFAULT 'metric',
ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean DEFAULT true;