// Audio Service - Singleton for managing HTML5 Audio playback

class AudioService {
  private static instance: AudioService;
  private audio: HTMLAudioElement | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  private constructor() {}

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  init(url: string): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
      this.audio.removeEventListener('ended', this.handleEnded);
      this.audio.removeEventListener('error', this.handleError);
      this.audio.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
    }

    this.audio = new Audio(url);
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.addEventListener('ended', this.handleEnded);
    this.audio.addEventListener('error', this.handleError);
    this.audio.addEventListener('loadedmetadata', this.handleLoadedMetadata);
  }

  private handleTimeUpdate = () => {
    this.emit('timeUpdate', {
      currentTime: this.audio?.currentTime || 0,
      duration: this.audio?.duration || 0,
    });
  };

  private handleEnded = () => {
    this.emit('ended', {});
  };

  private handleError = (e: Event) => {
    console.error('[AudioService] Error:', e);
    this.emit('error', { error: 'Audio playback error' });
  };

  private handleLoadedMetadata = () => {
    this.emit('loaded', {
      duration: this.audio?.duration || 0,
    });
  };

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
      this.emit('play', {});
    } catch (error) {
      console.error('[AudioService] Play error:', error);
      this.emit('error', { error: 'Failed to play audio' });
    }
  }

  pause(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.emit('pause', {});
  }

  seekTo(time: number): void {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
  }

  seekBy(seconds: number): void {
    if (!this.audio) return;
    const newTime = this.audio.currentTime + seconds;
    this.audio.currentTime = Math.max(0, Math.min(newTime, this.audio.duration || 0));
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.emit('stop', {});
    }
  }

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
      this.audio.removeEventListener('ended', this.handleEnded);
      this.audio.removeEventListener('error', this.handleError);
      this.audio.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
      this.audio = null;
    }
  }

  // Event emitter methods
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const audioService = AudioService.getInstance();
