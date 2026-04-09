-- ============================================================
-- Migration: Friends Groups + Country Leaderboard
-- ============================================================

-- 1. Add country column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

-- 2. Create friend_groups table
CREATE TABLE IF NOT EXISTS public.friend_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '🏆',
  join_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Create friend_group_members table
CREATE TABLE IF NOT EXISTS public.friend_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 4. Enable RLS
ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for friend_groups
-- Anyone authenticated can view groups they belong to
CREATE POLICY "Users can view groups they belong to"
  ON public.friend_groups FOR SELECT
  USING (
    id IN (SELECT group_id FROM public.friend_group_members WHERE user_id = auth.uid())
  );

-- Anyone authenticated can create a group
CREATE POLICY "Authenticated users can create groups"
  ON public.friend_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update group
CREATE POLICY "Group creator can update group"
  ON public.friend_groups FOR UPDATE
  USING (auth.uid() = created_by);

-- Only creator can delete group
CREATE POLICY "Group creator can delete group"
  ON public.friend_groups FOR DELETE
  USING (auth.uid() = created_by);

-- 6. RLS Policies for friend_group_members
-- Members can see other members of groups they're in
CREATE POLICY "Members can view group members"
  ON public.friend_group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM public.friend_group_members WHERE user_id = auth.uid())
  );

-- Any authenticated user can join a group (insert themselves)
CREATE POLICY "Users can join groups"
  ON public.friend_group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves (leave group)
CREATE POLICY "Users can leave groups"
  ON public.friend_group_members FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Function to look up a group by join code (public, no RLS restriction needed)
CREATE OR REPLACE FUNCTION public.lookup_group_by_code(code text)
RETURNS TABLE (
  group_id uuid,
  group_name text,
  group_emoji text,
  member_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    fg.id AS group_id,
    fg.name AS group_name,
    fg.emoji AS group_emoji,
    (SELECT COUNT(*) FROM public.friend_group_members WHERE group_id = fg.id) AS member_count
  FROM public.friend_groups fg
  WHERE fg.join_code = code
  LIMIT 1;
$$;

-- 8. RPC: Get group leaderboard (today's steps for a specific group)
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(target_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  avatar_id text,
  avatar_initials text,
  avatar_url text,
  steps bigint,
  current_streak bigint,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id AS user_id,
    p.display_name,
    p.username,
    p.avatar_id,
    p.avatar_initials,
    p.avatar_url,
    COALESCE(ds.steps, 0)::bigint AS steps,
    COALESCE(s.current_streak, 0)::bigint AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC)::bigint AS rank
  FROM public.friend_group_members fgm
  JOIN public.profiles p ON p.id = fgm.user_id
  LEFT JOIN public.daily_steps ds ON ds.user_id = p.id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON s.user_id = p.id
  WHERE fgm.group_id = target_group_id
  ORDER BY steps DESC;
$$;

-- 9. RPC: Get country leaderboard (today's steps for users in same country)
CREATE OR REPLACE FUNCTION public.get_country_leaderboard(target_country text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  avatar_id text,
  avatar_initials text,
  avatar_url text,
  steps bigint,
  current_streak bigint,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id AS user_id,
    p.display_name,
    p.username,
    p.avatar_id,
    p.avatar_initials,
    p.avatar_url,
    COALESCE(ds.steps, 0)::bigint AS steps,
    COALESCE(s.current_streak, 0)::bigint AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC)::bigint AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON ds.user_id = p.id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON s.user_id = p.id
  WHERE p.country = target_country
    AND p.show_on_leaderboard IS NOT FALSE
  ORDER BY steps DESC;
$$;

-- 10. Index for faster country lookups
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_friend_groups_join_code ON public.friend_groups(join_code);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_user_id ON public.friend_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_group_id ON public.friend_group_members(group_id);
