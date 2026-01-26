import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { RubberBandScroll } from '@/components/ui/RubberBandScroll';
import SessionCard from '@/components/SessionCard';
import { EmptyState } from '@/components/ui/EmptyState';

const SessionHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setSessions(data || []);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [user?.id]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <motion.header 
        className="px-4 pb-4 header-safe flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
            Session History
          </h1>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {sessions.length} Total Sessions
          </p>
        </div>
      </motion.header>

      <RubberBandScroll className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="tactical-card h-32 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No Sessions Yet"
            description="Start a GPS-tracked session to see your workout history here."
          />
        ) : (
          <div className="space-y-4 pb-6">
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </RubberBandScroll>
    </div>
  );
};

export default SessionHistory;
