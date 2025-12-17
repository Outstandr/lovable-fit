import { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '@/services/audioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Placeholder audio for testing
const PLACEHOLDER_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  audioUrl: string;
  duration: number; // in seconds
}

// Mock chapters for Phase 1
const mockChapters: Chapter[] = [
  { id: 1, title: "Chapter 1", subtitle: "Introduction", audioUrl: PLACEHOLDER_AUDIO, duration: 600 },
  { id: 2, title: "Chapter 2", subtitle: "The Foundation", audioUrl: PLACEHOLDER_AUDIO, duration: 900 },
  { id: 3, title: "Chapter 3", subtitle: "Day 2: The Power of Momentum", audioUrl: PLACEHOLDER_AUDIO, duration: 990 },
  { id: 4, title: "Chapter 4", subtitle: "Building Habits", audioUrl: PLACEHOLDER_AUDIO, duration: 840 },
  { id: 5, title: "Chapter 5", subtitle: "The Mental Game", audioUrl: PLACEHOLDER_AUDIO, duration: 720 },
];

interface AudiobookState {
  isPlaying: boolean;
  currentChapter: Chapter | null;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  allChaptersComplete: boolean;
  chapterProgress: Map<number, number>; // chapterId -> lastPosition
}

export const useAudiobook = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AudiobookState>({
    isPlaying: false,
    currentChapter: null,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
    allChaptersComplete: false,
    chapterProgress: new Map(),
  });
  
  const hasTriggeredCompletion = useRef<Set<number>>(new Set());

  // Load saved progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('audiobook_progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        const progressMap = new Map<number, number>(Object.entries(parsed).map(([k, v]) => [parseInt(k), v as number]));
        setState(prev => ({ ...prev, chapterProgress: progressMap }));
      } catch (e) {
        console.error('[useAudiobook] Failed to parse saved progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    const progressObj = Object.fromEntries(state.chapterProgress);
    localStorage.setItem('audiobook_progress', JSON.stringify(progressObj));
  }, [state.chapterProgress]);

  // Setup audio event listeners
  useEffect(() => {
    const handleTimeUpdate = ({ currentTime, duration }: { currentTime: number; duration: number }) => {
      setState(prev => ({ ...prev, currentTime, duration }));
      
      // Check for 90% completion
      if (state.currentChapter && duration > 0) {
        const percentComplete = (currentTime / duration) * 100;
        if (percentComplete >= 90 && !hasTriggeredCompletion.current.has(state.currentChapter.id)) {
          hasTriggeredCompletion.current.add(state.currentChapter.id);
          handleChapterComplete(state.currentChapter.id);
        }
      }
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      // Auto-advance to next chapter
      if (state.currentChapter) {
        const nextChapter = mockChapters.find(c => c.id === state.currentChapter!.id + 1);
        if (nextChapter) {
          loadChapter(nextChapter.id);
          setTimeout(() => play(), 500);
        } else {
          setState(prev => ({ ...prev, allChaptersComplete: true }));
          toast.success("🎉 All chapters completed!");
        }
      }
    };

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleError = ({ error }: { error: string }) => {
      setState(prev => ({ ...prev, error, isLoading: false }));
      toast.error(error);
    };
    const handleLoaded = ({ duration }: { duration: number }) => {
      setState(prev => ({ ...prev, duration, isLoading: false }));
    };

    audioService.on('timeUpdate', handleTimeUpdate);
    audioService.on('ended', handleEnded);
    audioService.on('play', handlePlay);
    audioService.on('pause', handlePause);
    audioService.on('error', handleError);
    audioService.on('loaded', handleLoaded);

    return () => {
      audioService.off('timeUpdate', handleTimeUpdate);
      audioService.off('ended', handleEnded);
      audioService.off('play', handlePlay);
      audioService.off('pause', handlePause);
      audioService.off('error', handleError);
      audioService.off('loaded', handleLoaded);
    };
  }, [state.currentChapter]);

  const handleChapterComplete = async (chapterId: number) => {
    toast.success("✓ Chapter completed! Daily reading task complete");
    
    // Update protocol_tasks in database
    if (user) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if today's task exists
        const { data: existingTask } = await supabase
          .from('protocol_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (existingTask) {
          await supabase
            .from('protocol_tasks')
            .update({ read_chapter: true })
            .eq('id', existingTask.id);
        } else {
          await supabase
            .from('protocol_tasks')
            .insert({
              user_id: user.id,
              date: today,
              read_chapter: true,
              steps_completed: false,
              no_alcohol: false,
            });
        }
      } catch (error) {
        console.error('[useAudiobook] Failed to update protocol task:', error);
      }
    }
  };

  const loadChapter = useCallback((chapterId: number) => {
    const chapter = mockChapters.find(c => c.id === chapterId);
    if (!chapter) {
      setState(prev => ({ ...prev, error: 'Chapter not found' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, currentChapter: chapter, error: null }));
    audioService.init(chapter.audioUrl);
    
    // Resume from saved position
    const savedPosition = state.chapterProgress.get(chapterId);
    if (savedPosition && savedPosition > 0) {
      setTimeout(() => audioService.seekTo(savedPosition), 100);
    }
  }, [state.chapterProgress]);

  const play = useCallback(async () => {
    if (!state.currentChapter) {
      // Load first chapter if none selected
      loadChapter(1);
      setTimeout(() => audioService.play(), 200);
      return;
    }
    await audioService.play();
  }, [state.currentChapter, loadChapter]);

  const pause = useCallback(() => {
    audioService.pause();
    // Save current position
    if (state.currentChapter) {
      setState(prev => {
        const newProgress = new Map(prev.chapterProgress);
        newProgress.set(state.currentChapter!.id, state.currentTime);
        return { ...prev, chapterProgress: newProgress };
      });
      saveProgress();
    }
  }, [state.currentChapter, state.currentTime, saveProgress]);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const skipForward = useCallback(() => {
    audioService.seekBy(15);
  }, []);

  const skipBackward = useCallback(() => {
    audioService.seekBy(-15);
  }, []);

  const seekTo = useCallback((time: number) => {
    audioService.seekTo(time);
  }, []);

  const stop = useCallback(() => {
    audioService.stop();
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  // Get remaining time for current chapter
  const getRemainingTime = useCallback(() => {
    if (!state.duration) return null;
    const remaining = state.duration - state.currentTime;
    return remaining > 0 ? remaining : 0;
  }, [state.currentTime, state.duration]);

  // Get button text based on state
  const getButtonText = useCallback(() => {
    if (state.allChaptersComplete) return "✓ ALL CHAPTERS COMPLETE";
    if (state.isPlaying && state.currentChapter) return "⏸ PAUSE AUDIOBOOK";
    
    // Check for chapter in progress
    for (const [chapterId, position] of state.chapterProgress) {
      if (position > 0) {
        const chapter = mockChapters.find(c => c.id === chapterId);
        if (chapter) {
          const remaining = chapter.duration - position;
          const mins = Math.floor(remaining / 60);
          const secs = Math.floor(remaining % 60);
          return `🎧 CONTINUE CHAPTER ${chapterId} (${mins}:${secs.toString().padStart(2, '0')} left)`;
        }
      }
    }
    
    return "🎧 PLAY AUDIOBOOK";
  }, [state.allChaptersComplete, state.isPlaying, state.currentChapter, state.chapterProgress]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isPlaying: state.isPlaying,
    currentChapter: state.currentChapter,
    currentTime: state.currentTime,
    duration: state.duration,
    isLoading: state.isLoading,
    error: state.error,
    allChaptersComplete: state.allChaptersComplete,
    chapters: mockChapters,
    play,
    pause,
    togglePlay,
    skipForward,
    skipBackward,
    seekTo,
    stop,
    loadChapter,
    getRemainingTime,
    getButtonText,
    formatTime,
  };
};
