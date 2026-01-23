-- Add new contact columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_source text DEFAULT 'email';

-- Update handle_new_user function to handle new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    first_name,
    last_name,
    avatar_initials,
    registration_source
  )
  VALUES (
    NEW.id,
    UPPER(
      TRIM(
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', '') || ' ' ||
        LEFT(COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''), 1)
      )
    ),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    UPPER(
      LEFT(COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'U'), 1) ||
      LEFT(COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'N'), 1)
    ),
    COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize streak
  INSERT INTO public.streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0);
  
  RETURN NEW;
END;
$$;

-- Drop the access code function (no longer needed)
DROP FUNCTION IF EXISTS public.check_access_code(text);