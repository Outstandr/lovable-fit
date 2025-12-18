-- =====================================================
-- REAL-TIME LEADERBOARD RPC FUNCTIONS FOR HOTSTEPPER
-- =====================================================

-- 1. Create PostgreSQL RPC function for TODAY'S leaderboard
CREATE OR REPLACE FUNCTION public.get_today_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_initials TEXT,
  steps INTEGER,
  distance_km NUMERIC,
  calories INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'User') AS display_name,
    COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    COALESCE(ds.steps, 0) AS steps,
    COALESCE(ds.distance_km, 0) AS distance_km,
    COALESCE(ds.calories, 0) AS calories,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC, ds.updated_at ASC) AS rank
  FROM 
    public.profiles p
  LEFT JOIN 
    public.daily_steps ds ON p.id = ds.user_id AND ds.date = CURRENT_DATE
  ORDER BY 
    steps DESC, ds.updated_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Create PostgreSQL RPC function for MONTHLY leaderboard
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_initials TEXT,
  total_steps BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'User') AS display_name,
    COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM 
    public.profiles p
  LEFT JOIN 
    public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('month', CURRENT_DATE)
      AND ds.date <= CURRENT_DATE
  GROUP BY p.id, p.display_name, p.avatar_initials
  ORDER BY total_steps DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.get_today_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_leaderboard() TO authenticated;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_steps_date_steps ON public.daily_steps(date, steps DESC);

-- 5. Comments
COMMENT ON FUNCTION public.get_today_leaderboard IS 'Returns today''s leaderboard with user rankings based on steps';
COMMENT ON FUNCTION public.get_monthly_leaderboard IS 'Returns monthly leaderboard with user rankings based on total steps';