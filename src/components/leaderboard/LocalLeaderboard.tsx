import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Loader2, Footprints, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AVATARS } from '@/components/profile/AvatarSelector';
import { getCountryByCode, detectCountryFromTimezone } from '@/utils/countryDetection';

interface LeaderboardEntry {
  rank: number;
  name: string;
  username: string | null;
  steps: number;
  avatarInitials: string;
  avatarUrl: string | null;
  userId: string;
  isCurrentUser: boolean;
  streak: number;
  qualified: boolean;
}

const AvatarDisplay = ({ entry, size = "md", style }: { entry: LeaderboardEntry, size?: "sm" | "md" | "lg" | "xl", style?: any }) => {
  const sizeClasses = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-xl", lg: "h-16 w-16 text-lg", xl: "h-20 w-20 text-xl" };
  const borderClass = style?.border || "border-border";
  return (
    <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center border-2 ${borderClass} overflow-hidden ${entry.isCurrentUser ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt={entry.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className={`font-bold ${style?.text || 'text-foreground'}`}>{entry.avatarInitials}</span>
      )}
    </div>
  );
};

const StreakBadge = ({ streak }: { streak: number }) => {
  if (streak === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/25 to-red-500/25 text-orange-400 text-[10px] font-bold border border-orange-500/20">
      <Flame className="h-3 w-3" />{streak}
    </span>
  );
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "bg-gradient-to-r from-yellow-500/15 to-amber-500/10", border: "border-yellow-500/40", text: "text-yellow-400", glow: "shadow-[0_0_15px_rgba(234,179,8,0.15)]" };
  if (rank === 2) return { bg: "bg-gradient-to-r from-gray-400/15 to-slate-400/10", border: "border-gray-400/40", text: "text-gray-300", glow: "" };
  if (rank === 3) return { bg: "bg-gradient-to-r from-amber-600/15 to-orange-600/10", border: "border-amber-600/40", text: "text-amber-500", glow: "" };
  return { bg: "bg-secondary/40", border: "border-border/50", text: "text-muted-foreground", glow: "" };
};

export const LocalLeaderboard = () => {
  const { user } = useAuth();
  const [country, setCountry] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's country from profile; if not set, auto-detect and save
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      if (data?.country) {
        setCountry(data.country);
      } else {
        const detected = detectCountryFromTimezone();
        if (detected) {
          await supabase
            .from('profiles')
            .update({ country: detected } as any)
            .eq('id', user.id);
          setCountry(detected);
        } else {
          setLoading(false);
        }
      }
    })();
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    if (!country) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_country_leaderboard', { target_country: country });
      if (error) throw error;

      const entries: LeaderboardEntry[] = (data || []).map((row: any) => {
        const avatarAsset = AVATARS.find(a => a.id === row.avatar_id);
        const steps = row.steps || 0;
        return {
          rank: Number(row.rank),
          name: row.display_name || 'Unknown',
          username: row.username ? `@${row.username}` : null,
          steps,
          avatarInitials: row.avatar_initials || 'NA',
          avatarUrl: row.avatar_url || (avatarAsset ? avatarAsset.url : null),
          userId: row.user_id,
          isCurrentUser: row.user_id === user?.id,
          streak: row.current_streak || 0,
          qualified: row.qualified !== undefined ? row.qualified : steps >= 10000,
        };
      });
      setLeaderboard(entries);
    } catch (err) {
      console.error('[LocalLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [country, user]);

  useEffect(() => { if (country) fetchLeaderboard(); }, [country, fetchLeaderboard]);

  const countryInfo = country ? getCountryByCode(country) : null;
  const qualifiedUsers = leaderboard.filter(e => e.qualified);
  const unqualifiedUsers = leaderboard.filter(e => !e.qualified);
  const top3 = qualifiedUsers.slice(0, 3);
  const rest = qualifiedUsers.slice(3);
  const currentUser = leaderboard.find(e => e.isCurrentUser);

  if (!country) {
    return (
      <div className="flex flex-col items-center py-12 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-cyan-500/10 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,200,255,0.1)]">
          <MapPin className="h-10 w-10 text-primary/50" />
        </div>
        <p className="text-lg font-bold">Country Not Detected</p>
        <p className="text-sm text-muted-foreground mt-1">
          Go to Profile → Edit Identity to set your country for the local leaderboard.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="px-4 pb-4">
      {/* Country Header */}
      <motion.div
        className="flex items-center gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-cyan-500/5 to-secondary/40 border border-primary/15 backdrop-blur-sm shadow-[0_0_20px_rgba(0,200,255,0.06)]"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-4xl drop-shadow-lg">{countryInfo?.flag}</span>
        <div>
          <p className="text-base font-bold">{countryInfo?.name}</p>
          <p className="text-xs text-muted-foreground">{leaderboard.length} {leaderboard.length === 1 ? 'stepper' : 'steppers'} • Today</p>
        </div>
      </motion.div>

      {leaderboard.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Footprints className="h-12 w-12 text-primary/40 mb-3" />
          <p className="text-muted-foreground">No one in {countryInfo?.name} has logged steps today yet!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 3 && (
            <motion.div className="flex items-end justify-center gap-2 pt-4 pb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* 2nd */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  <AvatarDisplay entry={top3[1]} size="lg" style={getRankStyle(2)} />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-[10px] font-black text-gray-900">2</div>
                </div>
                <div className="flex flex-col items-center mt-2">
                  <span className="text-xs font-semibold truncate max-w-[70px]">{top3[1].name}</span>
                  <span className="text-xs font-bold text-gray-300">{top3[1].steps.toLocaleString()}</span>
                  <StreakBadge streak={top3[1].streak} />
                </div>
                <div className="mt-2 h-16 w-full rounded-t-xl bg-gradient-to-t from-gray-500/10 to-gray-400/20 border-t border-x border-gray-400/20" />
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]" />
                  <AvatarDisplay entry={top3[0]} size="xl" style={getRankStyle(1)} />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-[10px] font-black text-yellow-900">1</div>
                </div>
                <div className="flex flex-col items-center mt-2">
                  <span className="text-sm font-bold truncate max-w-[80px]">{top3[0].name}</span>
                  <span className="text-sm font-black text-yellow-400">{top3[0].steps.toLocaleString()}</span>
                  <StreakBadge streak={top3[0].streak} />
                </div>
                <div className="mt-2 h-24 w-full rounded-t-xl bg-gradient-to-t from-yellow-500/5 to-yellow-500/20 border-t border-x border-yellow-500/20 shadow-[0_-5px_15px_rgba(234,179,8,0.05)]" />
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  <AvatarDisplay entry={top3[2]} size="lg" style={getRankStyle(3)} />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-[10px] font-black text-amber-900">3</div>
                </div>
                <div className="flex flex-col items-center mt-2">
                  <span className="text-xs font-semibold truncate max-w-[70px]">{top3[2].name}</span>
                  <span className="text-xs font-bold text-amber-500">{top3[2].steps.toLocaleString()}</span>
                  <StreakBadge streak={top3[2].streak} />
                </div>
                <div className="mt-2 h-12 w-full rounded-t-xl bg-gradient-to-t from-amber-600/5 to-amber-600/15 border-t border-x border-amber-600/20" />
              </div>
            </motion.div>
          )}

          {/* Full list — qualified users (4th+) */}
          <div className="space-y-2 mt-3">
            {rest.map((entry, i) => {
              const style = getRankStyle(entry.rank);
              return (
                <motion.div
                  key={entry.userId}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 backdrop-blur-sm ${entry.isCurrentUser ? 'bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 shadow-[0_0_15px_rgba(0,200,255,0.08)]' : style.bg + ' border ' + style.border} ${style.glow}`}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 text-base font-black ${entry.isCurrentUser ? 'text-primary' : style.text}`}>#{entry.rank}</span>
                    <AvatarDisplay entry={entry} size="sm" style={style} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{entry.name}</span>
                        <StreakBadge streak={entry.streak} />
                      </div>
                      {entry.username && <p className="text-[10px] text-muted-foreground">{entry.username}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">{entry.steps.toLocaleString()}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Unqualified users (< 10k) — greyed out */}
          {unqualifiedUsers.length > 0 && (
            <div className="space-y-1.5 mt-3">
              {qualifiedUsers.length > 0 && (
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium px-1">Below 10,000 steps</p>
              )}
              {unqualifiedUsers.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 opacity-40 bg-secondary/20 border border-border/20`}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-sm font-medium text-muted-foreground/50">—</span>
                    <AvatarDisplay entry={entry} size="sm" style={{ bg: 'bg-secondary', border: 'border-border/30', text: 'text-muted-foreground' }} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-muted-foreground">{entry.name}</span>
                      {entry.username && <p className="text-[10px] text-muted-foreground/50">{entry.username}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground/50">{entry.steps.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pinned current user if ranked lower */}
          {currentUser && currentUser.qualified && currentUser.rank > 3 && (
            <motion.div
              className="mt-4 p-3 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 shadow-[0_0_20px_rgba(0,200,255,0.1)]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-primary">#{currentUser.rank}</span>
                  <AvatarDisplay entry={currentUser} size="sm" style={getRankStyle(currentUser.rank)} />
                  <div>
                    <span className="text-sm font-bold text-primary">{currentUser.name}</span>
                    <p className="text-[10px] text-muted-foreground">You</p>
                  </div>
                </div>
                <span className="text-lg font-black text-primary">{currentUser.steps.toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
