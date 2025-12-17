-- Add health profile fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add check constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT age_range CHECK (age IS NULL OR (age >= 13 AND age <= 99)),
ADD CONSTRAINT height_range CHECK (height_cm IS NULL OR (height_cm >= 140 AND height_cm <= 220)),
ADD CONSTRAINT weight_range CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 200));