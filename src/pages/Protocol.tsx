import { motion } from "framer-motion";
import { CheckCircle2, Circle, Footprints, BookOpen, Wine, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { useState } from "react";

interface Task {
  id: string;
  label: string;
  description: string;
  icon: typeof Footprints;
  completed: boolean;
  autoCheck?: boolean;
}

const Protocol = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "steps",
      label: "10,000 Steps",
      description: "Complete your daily step goal",
      icon: Footprints,
      completed: false,
      autoCheck: true,
    },
    {
      id: "read",
      label: "Read Chapter",
      description: "Read one chapter of The Manual",
      icon: BookOpen,
      completed: false,
    },
    {
      id: "noalcohol",
      label: "No Alcohol",
      description: "Stay disciplined - no alcohol today",
      icon: Wine,
      completed: true,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id && !task.autoCheck 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <div className="h-screen flex flex-col page-with-bottom-nav">
      {/* Header */}
      <motion.header 
        className="px-4 pb-4 header-safe flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
          Discipline Protocol
        </h1>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          Daily Tasks • {completedCount}/{tasks.length} Complete
        </p>
      </motion.header>

      <RubberBandScroll className="flex-1 overflow-y-auto" contentClassName="pb-24">
        {/* Progress Bar */}
        <motion.div
        className="px-4 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* The Rules */}
      <motion.div 
        className="px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="tactical-card">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            The Rules
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-primary">01</span>
              <div>
                <span className="text-sm font-semibold text-foreground">MOVEMENT</span>
                <p className="text-xs text-muted-foreground">10,000 Steps Daily. Rain or shine. No excuses.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-primary">02</span>
              <div>
                <span className="text-sm font-semibold text-foreground">MINDSET</span>
                <p className="text-xs text-muted-foreground">Read 1 Chapter of The Manual daily.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-primary">03</span>
              <div>
                <span className="text-sm font-semibold text-foreground">ACCOUNTABILITY</span>
                <p className="text-xs text-muted-foreground">Track it live. Face the leaderboard.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Task List */}
      <div className="px-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Today's Checklist
        </h2>
        {tasks.map((task, index) => (
          <motion.button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`w-full tactical-card flex items-center gap-4 text-left transition-all ${
              task.completed ? 'border-accent/30' : ''
            } ${task.autoCheck ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            disabled={task.autoCheck}
          >
            {task.completed ? (
              <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className={`text-sm font-semibold ${task.completed ? 'text-accent' : 'text-foreground'}`}>
                {task.label}
              </span>
              <p className="text-xs text-muted-foreground">{task.description}</p>
              {task.autoCheck && (
                <span className="text-[10px] uppercase tracking-wider text-primary">Auto-tracked</span>
              )}
            </div>
            <task.icon className={`h-5 w-5 ${task.completed ? 'text-accent' : 'text-muted-foreground'}`} />
          </motion.button>
        ))}
      </div>

      {/* Upsell Banner */}
      <motion.div 
        className="px-4 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 p-4 flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-bold text-foreground">Unlock Elite Masterclass</span>
            <p className="text-xs text-muted-foreground">Advanced protocols for peak performance</p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors">
            Learn More
          </button>
        </div>
      </motion.div>
      </RubberBandScroll>

      <BottomNav />
    </div>
  );
};

export default Protocol;
