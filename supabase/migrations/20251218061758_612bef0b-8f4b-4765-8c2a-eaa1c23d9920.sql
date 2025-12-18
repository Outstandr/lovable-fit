-- Fix security warnings: Set search_path for functions
CREATE OR REPLACE FUNCTION public.get_today_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_initials TEXT,
  steps INTEGER,
  distance_km NUMERIC,
  calories INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_initials TEXT,
  total_steps BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
$$;