import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSteps } from '@/contexts/StepContext';
import { toast } from 'sonner';

export interface ProtocolTask {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  autoCheck?: boolean;
  dbField?: 'steps_completed' | 'no_alcohol';
}

export const useProtocolTasks = () => {
  const { user } = useAuth();
  const { steps } = useSteps();
  const [tasks, setTasks] = useState<ProtocolTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(10000);

  // Fetch daily goal
  useEffect(() => {
    if (!user?.id) return;

    const fetchGoal = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('daily_step_goal')
        .eq('id', user.id)
        .single();
      
      if (data?.daily_step_goal) {
        setDailyGoal(data.daily_step_goal);
      }
    };

    fetchGoal();
  }, [user?.id]);

  // Fetch today's protocol tasks from database
  useEffect(() => {
    if (!user?.id) return;

    const fetchTasks = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('protocol_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching protocol tasks:', error);
        return;
      }

      // If no record exists, create one
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('protocol_tasks')
          .insert({
            user_id: user.id,
            date: today,
            steps_completed: false,
            no_alcohol: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating protocol tasks:', insertError);
          return;
        }

        updateTasksFromDB(newData);
      } else {
        updateTasksFromDB(data);
      }

      setLoading(false);
    };

    fetchTasks();
  }, [user?.id]);

  // Auto-check 10K steps task when goal is reached
  useEffect(() => {
    if (!user?.id || loading) return;
    
    const stepsCompleted = steps >= dailyGoal;
    const stepsTask = tasks.find(t => t.id === 'steps');
    
    if (stepsTask && stepsCompleted && !stepsTask.completed) {
      updateTaskInDB('steps_completed', true);
    }
  }, [steps, dailyGoal, user?.id, tasks, loading]);

  const updateTasksFromDB = (data: any) => {
    setTasks([
      {
        id: 'steps',
        label: '10,000 Steps',
        description: 'Complete your daily step goal',
        completed: data.steps_completed || false,
        autoCheck: true,
        dbField: 'steps_completed',
      },
      {
        id: 'noalcohol',
        label: 'No Alcohol',
        description: 'Stay disciplined - no alcohol today',
        completed: data.no_alcohol || false,
        dbField: 'no_alcohol',
      },
    ]);
  };

  const updateTaskInDB = async (field: 'steps_completed' | 'no_alcohol', value: boolean) => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('protocol_tasks')
      .update({ [field]: value })
      .eq('user_id', user.id)
      .eq('date', today);

    if (error) {
      console.error('Error updating protocol task:', error);
      toast.error('Failed to update task');
      return;
    }

    // Update local state
    setTasks(prev => prev.map(task => 
      task.dbField === field ? { ...task, completed: value } : task
    ));

    if (value) {
      toast.success('Task completed!');
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.autoCheck || !task.dbField) return;

    await updateTaskInDB(task.dbField, !task.completed);
  };

  return { tasks, loading, toggleTask };
};
