import { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '@/services/audioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const STORAGE_BUCKET = 'rbd-audiobook';

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  fileName: string; // File name in Supabase storage
  duration: number; // in seconds
}

// Chapters configuration - add more files as they're uploaded to the bucket
const chapters: Chapter[] = [
  { id: 1, title: "Chapter 1", subtitle: "Reset Body & Diet", fileName: "13-12-2025-RBD-ENG-MJV.mp3", duration: 1635 }, // ~27 mins based on 26MB file
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

// Get signed URL for audio file from Supabase storage
const getAudioUrl = async (fileName: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fileName, 3600); // 1 hour expiry
    
    if (error) {
      console.error('[useAudiobook] Error getting signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error('[useAudiobook] Failed to get audio URL:', e);
    return null;
  }
};

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

  // Save progress to localStorage - use ref to get latest values
  const currentTimeRef = useRef(state.currentTime);
  const currentChapterRef = useRef(state.currentChapter);
  const chapterProgressRef = useRef(state.chapterProgress);

  // Keep refs updated
  useEffect(() => {
    currentTimeRef.current = state.currentTime;
    currentChapterRef.current = state.currentChapter;
    chapterProgressRef.current = state.chapterProgress;
  }, [state.currentTime, state.currentChapter, state.chapterProgress]);

  const saveProgress = useCallback(() => {
    const chapter = currentChapterRef.current;
    const time = currentTimeRef.current;
    const progress = chapterProgressRef.current;
    
    if (chapter && time > 0) {
      const newProgress = new Map(progress);
      newProgress.set(chapter.id, time);
      const progressObj = Object.fromEntries(newProgress);
      localStorage.setItem('audiobook_progress', JSON.stringify(progressObj));
      console.log('[useAudiobook] Progress saved:', chapter.id, time);
    }
  }, []);

  // Auto-save every 10 seconds while playing
  useEffect(() => {
    if (!state.isPlaying) return;
    
    const autoSaveInterval = setInterval(() => {
      saveProgress();
    }, 10000);
    
    return () => clearInterval(autoSaveInterval);
  }, [state.isPlaying, saveProgress]);

  // Save on visibility change (app backgrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveProgress();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgress]);

  // Save on component unmount
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);

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
        const nextChapter = chapters.find(c => c.id === state.currentChapter!.id + 1);
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

  const loadChapter = useCallback(async (chapterId: number) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) {
      setState(prev => ({ ...prev, error: 'Chapter not found' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, currentChapter: chapter, error: null }));
    
    // Get signed URL from Supabase storage
    const audioUrl = await getAudioUrl(chapter.fileName);
    if (!audioUrl) {
      setState(prev => ({ ...prev, error: 'Failed to load audio file', isLoading: false }));
      toast.error('Failed to load audio file');
      return;
    }
    
    audioService.init(audioUrl);
    
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
    saveProgress(); // Save before stopping
    audioService.stop();
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, [saveProgress]);

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
        const chapter = chapters.find(c => c.id === chapterId);
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
    chapters: chapters,
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
