import { motion } from "framer-motion";
import { Settings, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { StandardHeader } from "@/components/StandardHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DayView } from "@/components/dashboard/DayView";
import { WeekView } from "@/components/dashboard/WeekView";
import { MonthView } from "@/components/dashboard/MonthView";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useSteps } from "@/contexts/StepContext";
import { useStreak } from "@/hooks/useStreak";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useLocalCache } from "@/hooks/useLocalCache";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { haptics } from '@/utils/haptics';


type TabType = "day" | "week" | "month";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { steps, distance, calories, dataSource, syncToDatabase, isInitializing } = useSteps();
  const { streak, updateStreakOnTargetHit } = useStreak();
  const { isOnline } = useOfflineSync();
  const { getCachedWeekData, setCachedWeekData, getCachedMonthData, setCachedMonthData, setLastSyncTime } = useLocalCache();

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

      // Try to load from cache first when offline
      if (!isOnline) {
        const cachedData = getCachedWeekData(user.id);
        if (cachedData) {
          setWeekData(cachedData);
          const trendArr = cachedData.map(d => ({ label: d.day, value: d.steps }));
          setWeeklyTrend(trendArr);
          const totalSteps = cachedData.reduce((sum, d) => sum + d.steps, 0);
          setWeekStats({
            totalSteps,
            avgSteps: Math.round(totalSteps / 7),
            prevWeekAvg: Math.round(totalSteps / 7),
            calories: 0,
            distance: 0,
            activeMinutes: Math.round(totalSteps / 120)
          });
          return;
        }
      }

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

        // Cache the data
        setCachedWeekData(weekDataArr, user.id);
        setLastSyncTime(user.id);

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
        // Try to load from cache on error
        const cachedData = getCachedWeekData(user.id);
        if (cachedData) {
          setWeekData(cachedData);
          const trendArr = cachedData.map(d => ({ label: d.day, value: d.steps }));
          setWeeklyTrend(trendArr);
        }
      }
    };

    fetchWeeklyData();
    const interval = setInterval(fetchWeeklyData, 60000);
    return () => clearInterval(interval);
  }, [user, dailyGoal, isOnline, getCachedWeekData, setCachedWeekData, setLastSyncTime]);

  // Fetch monthly data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      if (!user) return;

      // Try to load from cache first when offline
      if (!isOnline) {
        const cachedData = getCachedMonthData(user.id);
        if (cachedData) {
          setCalendarData(cachedData);
          const totalSteps = cachedData.reduce((sum, d) => sum + d.steps, 0);
          const daysHitGoal = cachedData.filter(d => d.hitGoal).length;
          setMonthStats({
            totalSteps,
            avgSteps: Math.round(totalSteps / Math.max(cachedData.filter(d => !d.isFuture).length, 1)),
            prevMonthAvg: 0,
            daysHitGoal,
            calories: 0,
            distance: 0,
            activeMinutes: Math.round(totalSteps / 120)
          });
          return;
        }
      }

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

        // Cache the data
        setCachedMonthData(calData, user.id);

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
        // Try to load from cache on error
        const cachedData = getCachedMonthData(user.id);
        if (cachedData) {
          setCalendarData(cachedData);
        }
      }
    };

    fetchMonthlyData();
  }, [user, dailyGoal, isOnline, getCachedMonthData, setCachedMonthData]);

  // Reactively update weekData and weeklyTrend with live steps
  useEffect(() => {
    if (weekData.length === 0) return;
    
    setWeekData(prev => prev.map(d => 
      d.isToday ? { ...d, steps: Math.max(steps, d.steps), hitGoal: Math.max(steps, d.steps) >= dailyGoal } : d
    ));
    
    setWeeklyTrend(prev => prev.map((d, i) => 
      i === prev.length - 1 ? { ...d, value: Math.max(steps, d.value) } : d
    ));
  }, [steps, dailyGoal]);

  // Reactively update calendarData with live steps
  useEffect(() => {
    if (calendarData.length === 0) return;
    const todayDate = new Date().getDate();
    
    setCalendarData(prev => prev.map(d => 
      d.date === todayDate && d.isToday ? { ...d, steps: Math.max(steps, d.steps), hitGoal: Math.max(steps, d.steps) >= dailyGoal } : d
    ));
  }, [steps, dailyGoal]);

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


  const displayDistance = distance > 0 ? distance : (steps * 0.762) / 1000;
  const activeMinutes = Math.floor(steps / 120);
  const today = new Date();

  return (
    <div className="min-h-screen flex flex-col page-with-both-fixed relative">
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Fixed Header - Outside scroll container */}
      <StandardHeader
        title="HOTSTEPPER"
        rightAction={
          <button
            onClick={() => { haptics.light(); navigate('/settings'); }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-smooth"
          >
            <Settings className="h-5 w-5" />
          </button>
        }
      />

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at top center, hsl(186, 100%, 50%, 0.05), transparent 60%)'
      }} />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-72">
        <div className="px-4 pb-2 relative z-content">
          {/* Tabs Row */}
          <div className="flex justify-center mt-3 mb-2">
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

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
                isLoading={isInitializing}
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
                isLoading={isInitializing}
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
                isLoading={isInitializing}
              />
            )}
          </main>
      </div>

      {/* Action Button */}
      <div className="fixed left-4 right-4 z-fixed fixed-above-nav" style={{ marginBottom: '1rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            variant="tactical"
            size="full"
            onClick={() => { haptics.medium(); navigate('/active'); }}
            className="h-14 text-sm font-bold uppercase tracking-widest shadow-glow-lg hover:shadow-glow-lg press-scale relative overflow-hidden group"
          >
            {/* Animated background shimmer */}
            <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />

            {/* Button content */}
            <div className="relative z-10 flex items-center justify-center">
              <Play className="mr-2 h-5 w-5" />
              Start Active Session
            </div>
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
