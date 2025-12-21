import { motion } from "framer-motion";
import { User, Share2, Settings, MoreHorizontal, Play, AlertCircle, RefreshCw, PersonStanding, Headphones, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { PullToRefresh } from "@/components/PullToRefresh";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DayView } from "@/components/dashboard/DayView";
import { WeekView } from "@/components/dashboard/WeekView";
import { MonthView } from "@/components/dashboard/MonthView";
import { useHealth } from "@/hooks/useHealth";
import { useStreak } from "@/hooks/useStreak";
import { useAudiobook } from "@/hooks/useAudiobook";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { haptics } from '@/utils/haptics';
import { Progress } from "@/components/ui/progress";

type TabType = "day" | "week" | "month";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { steps, distance, calories, dataSource, syncToDatabase } = useHealth();
  const { streak, updateStreakOnTargetHit } = useStreak();
  const { isPlaying, currentChapter, currentTime, duration, togglePlay, formatTime, isLoading: audiobookLoading } = useAudiobook();
  
  const [activeTab, setActiveTab] = useState<TabType>("day");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10000);
  
  // Data states
  const [weeklyTrend, setWeeklyTrend] = useState<{ label: string; value: number }[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; steps: number; isToday: boolean; hitGoal: boolean }[]>([]);
  const [weekStats, setWeekStats] = useState({ totalSteps: 0, avgSteps: 0, prevWeekAvg: 0, calories: 0, distance: 0, activeMinutes: 0 });
  const [monthlyTrend, setMonthlyTrend] = useState<{ label: string; value: number }[]>([]);
  const [calendarData, setCalendarData] = useState<{ date: number; steps: number; hitGoal: boolean; isToday: boolean; isFuture: boolean }[]>([]);
  const [monthStats, setMonthStats] = useState({ totalSteps: 0, avgSteps: 0, prevMonthAvg: 0, daysHitGoal: 0, calories: 0, distance: 0, activeMinutes: 0 });
  const [yearlyTrend, setYearlyTrend] = useState<{ label: string; value: number }[]>([]);

  // Fetch user's daily goal
  useEffect(() => {
    const fetchGoal = async () => {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('daily_step_goal').eq('id', user.id).single();
        if (data?.daily_step_goal) setDailyGoal(data.daily_step_goal);
      } catch (error) {
        console.error('[Dashboard] Error fetching goal:', error);
      }
    };
    fetchGoal();
  }, [user]);

  // Fetch weekly trend data (last 7 days)
  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user) return;
      try {
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        
        const { data } = await supabase
          .from('daily_steps')
          .select('date, steps, distance_km, calories')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', today.toISOString().split('T')[0]);
        
        const weekDataArr: typeof weekData = [];
        const trendArr: typeof weeklyTrend = [];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const record = data?.find(d => d.date === dateStr);
          const stepsVal = record?.steps || 0;
          
          weekDataArr.push({
            day: days[date.getDay()],
            steps: stepsVal,
            isToday: i === 6,
            hitGoal: stepsVal >= dailyGoal
          });
          
          trendArr.push({ label: days[date.getDay()], value: stepsVal });
        }
        
        setWeekData(weekDataArr);
        setWeeklyTrend(trendArr);
        
        // Calculate week stats
        const totalSteps = weekDataArr.reduce((sum, d) => sum + d.steps, 0);
        const avgSteps = Math.round(totalSteps / 7);
        const totalCalories = data?.reduce((sum, d) => sum + (d.calories || 0), 0) || 0;
        const totalDistance = data?.reduce((sum, d) => sum + (d.distance_km || 0), 0) || 0;
        
        setWeekStats({
          totalSteps,
          avgSteps,
          prevWeekAvg: avgSteps, // TODO: fetch previous week
          calories: totalCalories,
          distance: totalDistance,
          activeMinutes: Math.round(totalSteps / 120)
        });
      } catch (error) {
        console.error('[Dashboard] Error fetching weekly data:', error);
      }
    };
    
    fetchWeeklyData();
    const interval = setInterval(fetchWeeklyData, 60000);
    return () => clearInterval(interval);
  }, [user, dailyGoal, steps]);

  // Fetch monthly data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      if (!user) return;
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const startOfMonth = new Date(year, month, 1);
        
        const { data } = await supabase
          .from('daily_steps')
          .select('date, steps, distance_km, calories')
          .eq('user_id', user.id)
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', today.toISOString().split('T')[0]);
        
        // Build calendar data
        const calData: typeof calendarData = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          const record = data?.find(d => d.date === dateStr);
          const stepsVal = record?.steps || 0;
          
          calData.push({
            date: day,
            steps: stepsVal,
            hitGoal: stepsVal >= dailyGoal,
            isToday: day === today.getDate(),
            isFuture: day > today.getDate()
          });
        }
        
        setCalendarData(calData);
        
        // Calculate month stats
        const totalSteps = data?.reduce((sum, d) => sum + (d.steps || 0), 0) || 0;
        const daysWithData = data?.length || 1;
        const avgSteps = Math.round(totalSteps / daysWithData);
        const daysHitGoal = calData.filter(d => d.hitGoal).length;
        const totalCalories = data?.reduce((sum, d) => sum + (d.calories || 0), 0) || 0;
        const totalDistance = data?.reduce((sum, d) => sum + (d.distance_km || 0), 0) || 0;
        
        setMonthStats({
          totalSteps,
          avgSteps,
          prevMonthAvg: avgSteps,
          daysHitGoal,
          calories: totalCalories,
          distance: totalDistance,
          activeMinutes: Math.round(totalSteps / 120)
        });
        
        // Monthly trend (last 2 months)
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const trendData: { label: string; value: number }[] = [];
        for (let i = 1; i >= 0; i--) {
          const m = new Date(year, month - i, 1);
          trendData.push({ label: monthNames[m.getMonth()], value: i === 0 ? totalSteps : 0 });
        }
        setMonthlyTrend(trendData);
        
        // Yearly trend (by month)
        const yearTrend: { label: string; value: number }[] = monthNames.slice(0, month + 1).map((m, i) => ({
          label: m,
          value: i === month ? totalSteps : 0
        }));
        setYearlyTrend(yearTrend);
      } catch (error) {
        console.error('[Dashboard] Error fetching monthly data:', error);
      }
    };
    
    fetchMonthlyData();
  }, [user, dailyGoal, steps]);

  // Update streak when target is hit
  useEffect(() => {
    if (steps >= dailyGoal) {
      updateStreakOnTargetHit();
    }
  }, [steps, dailyGoal, updateStreakOnTargetHit]);

  // Check onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      try {
        const onboardingDone = localStorage.getItem('onboarding_completed');
        if (onboardingDone === 'true') return;
        
        const { data } = await supabase.from('profiles').select('profile_completed').eq('id', user.id).single();
        if (!data?.profile_completed) {
          setTimeout(() => setShowOnboarding(true), 2000);
        }
      } catch (error) {
        console.error('[Dashboard] Error checking onboarding:', error);
      }
    };
    checkOnboarding();
  }, [user]);

  const handleRefresh = useCallback(async () => {
    try {
      await syncToDatabase();
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  }, [syncToDatabase]);

  const displayDistance = distance > 0 ? distance : (steps * 0.762) / 1000;
  const activeMinutes = Math.floor(steps / 120);
  const today = new Date();

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav relative">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at top center, hsl(186, 100%, 50%, 0.05), transparent 60%)'
      }} />

      <PullToRefresh onRefresh={handleRefresh} className="flex-1 flex flex-col overflow-hidden">
        <RubberBandScroll className="flex-1 overflow-y-auto">
          {/* Header */}
          <motion.header
        className="flex items-center justify-between px-4 pb-2 header-safe relative z-content"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={() => { haptics.light(); navigate('/profile'); }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth"
        >
          <Settings className="h-5 w-5" />
        </button>
        
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <button 
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </motion.header>

      {/* Permission Alert */}
      {dataSource === 'unavailable' && (
        <motion.div className="mx-4 mb-4 relative z-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Step Tracking Unavailable</p>
              <p className="text-xs text-muted-foreground">Enable Physical Activity permission in settings.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="px-4 relative z-content">
        {activeTab === "day" && (
          <DayView
            steps={steps}
            goal={dailyGoal}
            calories={calories}
            distance={displayDistance}
            activeMinutes={activeMinutes}
            streak={streak.currentStreak}
            weeklyTrend={weeklyTrend}
          />
        )}
        
        {activeTab === "week" && (
          <WeekView
            totalSteps={weekStats.totalSteps}
            avgSteps={weekStats.avgSteps}
            prevWeekAvg={weekStats.prevWeekAvg}
            goal={dailyGoal}
            weekData={weekData}
            calories={weekStats.calories}
            distance={weekStats.distance}
            activeMinutes={weekStats.activeMinutes}
            streak={streak.currentStreak}
            monthlyTrend={monthlyTrend}
          />
        )}
        
        {activeTab === "month" && (
          <MonthView
            year={today.getFullYear()}
            month={today.getMonth()}
            totalSteps={monthStats.totalSteps}
            avgSteps={monthStats.avgSteps}
            prevMonthAvg={monthStats.prevMonthAvg}
            goal={dailyGoal}
            daysHitGoal={monthStats.daysHitGoal}
            calendarData={calendarData}
            calories={monthStats.calories}
            distance={monthStats.distance}
            activeMinutes={monthStats.activeMinutes}
            streak={streak.currentStreak}
            yearlyTrend={yearlyTrend}
          />
        )}

        {/* Audiobook Mini Player */}
        <motion.div
          className="pt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div 
            className="tactical-card cursor-pointer"
            onClick={() => navigate('/audiobook')}
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 flex-shrink-0">
                <Headphones className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {currentChapter ? 'Now Playing' : 'Audiobook'}
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentChapter?.title || 'Reset Body & Diet'}
                </p>
                {duration > 0 && (
                  <div className="mt-1.5">
                    <Progress value={(currentTime / duration) * 100} className="h-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); haptics.medium(); togglePlay(); }}
                disabled={audiobookLoading}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth flex-shrink-0"
              >
                {audiobookLoading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>
            </div>
          </div>
          </motion.div>
        </main>
        </RubberBandScroll>
      </PullToRefresh>

      {/* Action Button */}
      <div className="fixed left-4 right-4 z-fixed fixed-above-nav" style={{ marginBottom: '1rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Button 
            variant="tactical" 
            size="full"
            onClick={() => { haptics.medium(); navigate('/active'); }}
            className="h-14 text-sm font-bold uppercase tracking-widest shadow-lg press-scale"
            style={{ boxShadow: '0 8px 24px hsl(186, 100%, 50%, 0.35)' }}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Active Session
          </Button>
        </motion.div>
      </div>

      <BottomNav />

      <OnboardingPrompt 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)}
        onSkip={() => localStorage.setItem('onboarding_completed', 'true')}
      />
    </div>
  );
};

export default Dashboard;