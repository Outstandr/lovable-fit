-- ============================================
-- SECURITY FIX: Restrict profiles table access
-- ============================================

-- Drop the overly permissive policy (allows unauthenticated access)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restricted policy: only authenticated users can read profiles
-- This still allows leaderboard functionality but requires login
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ============================================
-- SECURITY FIX: Restrict access_codes table
-- ============================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can check if code exists" ON public.access_codes;

-- Create a secure function for code validation (no direct table access)
CREATE OR REPLACE FUNCTION public.check_access_code(code_input text)
RETURNS TABLE (
  id uuid,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.id, (ac.is_used = false) as is_valid
  FROM access_codes ac
  WHERE ac.code = code_input
  LIMIT 1;
END;
$$;

-- Revoke public access and grant only to needed roles
REVOKE ALL ON FUNCTION public.check_access_code FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_access_code TO anon, authenticated;

-- ============================================
-- SECURITY FIX: Restrict access_codes UPDATE policy
-- ============================================

-- Drop current permissive policy
DROP POLICY IF EXISTS "Authenticated users can use codes" ON public.access_codes;

-- Create restrictive policy requiring user to claim code properly
CREATE POLICY "Users can claim unused codes" 
ON public.access_codes FOR UPDATE 
USING (is_used = false)
WITH CHECK (
  is_used = true 
  AND used_by = auth.uid() 
  AND used_at IS NOT NULL
);