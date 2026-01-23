import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { audioService } from '@/services/audioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getLocalDateString } from '@/lib/utils';

// ============== Types ==============

export interface Bookmark {
  id: string;
  chapter_id: number;
  timestamp_seconds: number;
  label: string | null;
  created_at: string;
}

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  fileName: string;
  duration: number;
  coverUrl?: string;
}

export type SleepTimerOption = 5 | 10 | 15 | 30 | 45 | 60 | 'end-of-chapter' | null;

interface AudiobookState {
  isPlaying: boolean;
  currentChapter: Chapter | null;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  allChaptersComplete: boolean;
  chapterProgress: Map<number, number>;
  playbackSpeed: number;
  bookmarks: Bookmark[];
  sleepTimer: SleepTimerOption;
  sleepTimerEndsAt: Date | null;
  skipBackInterval: number;
  skipForwardInterval: number;
  wasRecentlyPlaying: boolean;
}

interface AudiobookContextValue extends AudiobookState {
  chapters: Chapter[];
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  seekTo: (time: number) => void;
  loadChapter: (chapterId: number, autoPlay?: boolean) => Promise<boolean>;
  cyclePlaybackSpeed: () => void;
  setPlaybackSpeed: (speed: number) => void;
  addBookmark: (label?: string) => Promise<void>;
  removeBookmark: (bookmarkId: string) => Promise<void>;
  seekToBookmark: (bookmark: Bookmark) => Promise<void>;
  getBookmarksForChapter: (chapterId: number) => Bookmark[];
  formatTime: (seconds: number) => string;
  getRemainingTime: () => number | null;
  getOverallProgress: () => number;
  setSleepTimer: (option: SleepTimerOption) => void;
  cancelSleepTimer: () => void;
  setSkipIntervals: (back: number, forward: number) => void;
  openMiniPlayer: () => void;
  closeMiniPlayer: () => void;
  isMiniPlayerVisible: boolean;
}

const STORAGE_BUCKET = 'rbd-audiobook';
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

// Chapters configuration
const chapters: Chapter[] = [
  { id: 1, title: "Chapter 1", subtitle: "Reset Body & Diet", fileName: "13-12-2025-RBD-ENG-MJV.mp3", duration: 1635 },
];

// ============== Context ==============

const AudiobookContext = createContext<AudiobookContextValue | null>(null);

export const useAudiobookContext = () => {
  const context = useContext(AudiobookContext);
  if (!context) {
    throw new Error('useAudiobookContext must be used within AudiobookProvider');
  }
  return context;
};

// Get signed URL for audio file
const getAudioUrl = async (fileName: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fileName, 3600);
    
    if (error) {
      console.error('[AudiobookContext] Error getting signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error('[AudiobookContext] Failed to get audio URL:', e);
    return null;
  }
};

// ============== Provider ==============

export const AudiobookProvider = ({ children }: { children: ReactNode }) => {
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
    playbackSpeed: 1,
    bookmarks: [],
    sleepTimer: null,
    sleepTimerEndsAt: null,
    skipBackInterval: parseInt(localStorage.getItem('audiobook_skip_back') || '15'),
    skipForwardInterval: parseInt(localStorage.getItem('audiobook_skip_forward') || '30'),
    wasRecentlyPlaying: false,
  });
  
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const hasTriggeredCompletion = useRef<Set<number>>(new Set());
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for latest values
  const currentTimeRef = useRef(state.currentTime);
  const currentChapterRef = useRef(state.currentChapter);
  const chapterProgressRef = useRef(state.chapterProgress);
  const durationRef = useRef(state.duration);

  useEffect(() => {
    currentTimeRef.current = state.currentTime;
    currentChapterRef.current = state.currentChapter;
    chapterProgressRef.current = state.chapterProgress;
    durationRef.current = state.duration;
  }, [state.currentTime, state.currentChapter, state.chapterProgress, state.duration]);

  // Load saved progress
  useEffect(() => {
    const savedProgress = localStorage.getItem('audiobook_progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        const progressMap = new Map<number, number>(
          Object.entries(parsed).map(([k, v]) => [parseInt(k), v as number])
        );
        setState(prev => ({ ...prev, chapterProgress: progressMap }));
      } catch (e) {
        console.error('[AudiobookContext] Failed to parse saved progress:', e);
      }
    }
  }, []);

  // Load bookmarks
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('audiobook_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[AudiobookContext] Failed to fetch bookmarks:', error);
        return;
      }
      
      setState(prev => ({ ...prev, bookmarks: data || [] }));
    };
    
    fetchBookmarks();
  }, [user]);

  // Save progress
  const saveProgress = useCallback(() => {
    const chapter = currentChapterRef.current;
    const time = currentTimeRef.current;
    const progress = chapterProgressRef.current;
    
    if (chapter && time > 0) {
      const newProgress = new Map(progress);
      newProgress.set(chapter.id, time);
      const progressObj = Object.fromEntries(newProgress);
      localStorage.setItem('audiobook_progress', JSON.stringify(progressObj));
    }
  }, []);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!state.isPlaying) return;
    const autoSaveInterval = setInterval(saveProgress, 10000);
    return () => clearInterval(autoSaveInterval);
  }, [state.isPlaying, saveProgress]);

  // Save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) saveProgress();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgress]);

  // Sleep timer logic
  useEffect(() => {
    if (state.sleepTimer && state.sleepTimerEndsAt && state.isPlaying) {
      const now = new Date();
      const timeUntilEnd = state.sleepTimerEndsAt.getTime() - now.getTime();
      
      if (timeUntilEnd <= 0) {
        // Timer expired
        fadeOutAndPause();
        return;
      }
      
      sleepTimerRef.current = setTimeout(() => {
        fadeOutAndPause();
      }, timeUntilEnd);
      
      return () => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      };
    }
  }, [state.sleepTimer, state.sleepTimerEndsAt, state.isPlaying]);

  // Handle "end of chapter" sleep timer
  useEffect(() => {
    if (state.sleepTimer === 'end-of-chapter' && state.currentChapter && state.duration > 0) {
      const remaining = state.duration - state.currentTime;
      if (remaining <= 5) {
        fadeOutAndPause();
      }
    }
  }, [state.sleepTimer, state.currentTime, state.duration, state.currentChapter]);

  const fadeOutAndPause = useCallback(() => {
    toast.info('Sleep timer: pausing playback');
    audioService.pause();
    setState(prev => ({
      ...prev,
      sleepTimer: null,
      sleepTimerEndsAt: null,
    }));
  }, []);

  const handleChapterComplete = async (chapterId: number) => {
    toast.success("✓ Chapter completed! Daily reading task complete");
    
    if (user) {
      try {
        const today = getLocalDateString();
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
        console.error('[AudiobookContext] Failed to update protocol task:', error);
      }
    }
  };

  const loadChapter = useCallback(async (chapterId: number, autoPlay: boolean = false): Promise<boolean> => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) {
      setState(prev => ({ ...prev, error: 'Chapter not found' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, currentChapter: chapter, error: null }));
    
    const audioUrl = await getAudioUrl(chapter.fileName);
    if (!audioUrl) {
      setState(prev => ({ ...prev, error: 'Failed to load audio file', isLoading: false }));
      toast.error('Failed to load audio file');
      return false;
    }
    
    audioService.init(audioUrl);
    
    return new Promise((resolve) => {
      const handleCanPlay = () => {
        audioService.off('loaded', handleCanPlay);
        
        const savedPosition = chapterProgressRef.current.get(chapterId);
        if (savedPosition && savedPosition > 0) {
          audioService.seekTo(savedPosition);
        }
        
        if (autoPlay) {
          audioService.play();
          setIsMiniPlayerVisible(true);
        }
        
        resolve(true);
      };
      
      audioService.on('loaded', handleCanPlay);
      
      setTimeout(() => {
        audioService.off('loaded', handleCanPlay);
        const savedPosition = chapterProgressRef.current.get(chapterId);
        if (savedPosition && savedPosition > 0) {
          audioService.seekTo(savedPosition);
        }
        if (autoPlay) {
          audioService.play();
          setIsMiniPlayerVisible(true);
        }
        resolve(true);
      }, 3000);
    });
  }, []);

  const play = useCallback(async () => {
    if (!state.currentChapter) {
      await loadChapter(1, true);
      return;
    }
    await audioService.play();
    setIsMiniPlayerVisible(true);
    setState(prev => ({ ...prev, wasRecentlyPlaying: true }));
  }, [state.currentChapter, loadChapter]);

  const pause = useCallback(() => {
    audioService.pause();
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

  const stop = useCallback(() => {
    saveProgress();
    audioService.stop();
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, wasRecentlyPlaying: false }));
    setIsMiniPlayerVisible(false);
  }, [saveProgress]);

  const skipForward = useCallback(() => {
    audioService.seekBy(state.skipForwardInterval);
  }, [state.skipForwardInterval]);

  const skipBackward = useCallback(() => {
    audioService.seekBy(-state.skipBackInterval);
  }, [state.skipBackInterval]);

  const seekTo = useCallback((time: number) => {
    audioService.seekTo(time);
  }, []);

  const cyclePlaybackSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(state.playbackSpeed as typeof PLAYBACK_SPEEDS[number]);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    audioService.setPlaybackRate(newSpeed);
    setState(prev => ({ ...prev, playbackSpeed: newSpeed }));
  }, [state.playbackSpeed]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    audioService.setPlaybackRate(speed);
    setState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const setSleepTimer = useCallback((option: SleepTimerOption) => {
    if (option === null || option === 'end-of-chapter') {
      setState(prev => ({
        ...prev,
        sleepTimer: option,
        sleepTimerEndsAt: null,
      }));
    } else {
      const endsAt = new Date(Date.now() + option * 60 * 1000);
      setState(prev => ({
        ...prev,
        sleepTimer: option,
        sleepTimerEndsAt: endsAt,
      }));
      toast.success(`Sleep timer set for ${option} minutes`);
    }
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setState(prev => ({
      ...prev,
      sleepTimer: null,
      sleepTimerEndsAt: null,
    }));
    toast.info('Sleep timer cancelled');
  }, []);

  const setSkipIntervals = useCallback((back: number, forward: number) => {
    localStorage.setItem('audiobook_skip_back', back.toString());
    localStorage.setItem('audiobook_skip_forward', forward.toString());
    setState(prev => ({
      ...prev,
      skipBackInterval: back,
      skipForwardInterval: forward,
    }));
  }, []);

  // Bookmark functions
  const addBookmark = useCallback(async (label?: string) => {
    if (!user || !state.currentChapter) {
      toast.error('Please start playing a chapter first');
      return;
    }
    
    const { data, error } = await supabase
      .from('audiobook_bookmarks')
      .insert({
        user_id: user.id,
        chapter_id: state.currentChapter.id,
        timestamp_seconds: state.currentTime,
        label: label || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[AudiobookContext] Failed to add bookmark:', error);
      toast.error('Failed to save bookmark');
      return;
    }
    
    setState(prev => ({ ...prev, bookmarks: [data, ...prev.bookmarks] }));
    toast.success('Bookmark saved');
  }, [user, state.currentChapter, state.currentTime]);

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('audiobook_bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', user.id);
    
    if (error) {
      toast.error('Failed to remove bookmark');
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      bookmarks: prev.bookmarks.filter(b => b.id !== bookmarkId) 
    }));
    toast.success('Bookmark removed');
  }, [user]);

  const seekToBookmark = useCallback(async (bookmark: Bookmark) => {
    if (state.currentChapter?.id !== bookmark.chapter_id) {
      await loadChapter(bookmark.chapter_id, false);
    }
    audioService.seekTo(bookmark.timestamp_seconds);
    toast.success(`Jumped to ${formatTime(bookmark.timestamp_seconds)}`);
  }, [state.currentChapter, loadChapter]);

  const getBookmarksForChapter = useCallback((chapterId: number) => {
    return state.bookmarks.filter(b => b.chapter_id === chapterId);
  }, [state.bookmarks]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getRemainingTime = useCallback(() => {
    if (!state.duration) return null;
    return Math.max(0, state.duration - state.currentTime);
  }, [state.currentTime, state.duration]);

  const getOverallProgress = useCallback(() => {
    const totalDuration = chapters.reduce((sum, c) => sum + c.duration, 0);
    let completed = 0;
    
    for (const chapter of chapters) {
      const progress = state.chapterProgress.get(chapter.id) || 0;
      completed += Math.min(progress, chapter.duration);
    }
    
    return totalDuration > 0 ? (completed / totalDuration) * 100 : 0;
  }, [state.chapterProgress]);

  const openMiniPlayer = useCallback(() => setIsMiniPlayerVisible(true), []);
  const closeMiniPlayer = useCallback(() => setIsMiniPlayerVisible(false), []);

  // Audio event listeners
  useEffect(() => {
    const handleTimeUpdate = ({ currentTime, duration }: { currentTime: number; duration: number }) => {
      setState(prev => ({ ...prev, currentTime, duration }));
      
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
      if (state.currentChapter) {
        const nextChapter = chapters.find(c => c.id === state.currentChapter!.id + 1);
        if (nextChapter) {
          loadChapter(nextChapter.id, true);
        } else {
          setState(prev => ({ ...prev, allChaptersComplete: true }));
          toast.success("🎉 All chapters completed!");
        }
      }
    };

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true, wasRecentlyPlaying: true }));
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
  }, [state.currentChapter, loadChapter]);

  const value: AudiobookContextValue = {
    ...state,
    chapters,
    play,
    pause,
    togglePlay,
    stop,
    skipForward,
    skipBackward,
    seekTo,
    loadChapter,
    cyclePlaybackSpeed,
    setPlaybackSpeed,
    addBookmark,
    removeBookmark,
    seekToBookmark,
    getBookmarksForChapter,
    formatTime,
    getRemainingTime,
    getOverallProgress,
    setSleepTimer,
    cancelSleepTimer,
    setSkipIntervals,
    openMiniPlayer,
    closeMiniPlayer,
    isMiniPlayerVisible,
  };

  return (
    <AudiobookContext.Provider value={value}>
      {children}
    </AudiobookContext.Provider>
  );
};
