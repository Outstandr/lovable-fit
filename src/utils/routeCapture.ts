import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

export interface SessionStats {
  distance: string;
  duration: string;
  pace: string;
  steps: number;
  date: Date;
}

/**
 * Capture a DOM element as a base64 PNG image
 */
export const captureMapAsImage = async (element: HTMLElement): Promise<string | null> => {
  try {
    console.log('[RouteCapture] Starting map capture...');
    
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0A1128', // Dark background matching theme
      scale: 2, // High resolution
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Ensure the cloned element has proper dimensions
        const clonedElement = clonedDoc.querySelector('[data-capture="map"]');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.width = element.offsetWidth + 'px';
          (clonedElement as HTMLElement).style.height = element.offsetHeight + 'px';
        }
      }
    });
    
    const imageBase64 = canvas.toDataURL('image/png');
    console.log('[RouteCapture] Map captured successfully');
    return imageBase64;
  } catch (error) {
    console.error('[RouteCapture] Failed to capture map:', error);
    return null;
  }
};

/**
 * Request gallery/storage permission on Android
 * Returns true if permission granted, false otherwise
 */
export const requestGalleryPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Web doesn't need permission for download
    return true;
  }

  try {
    // Check if we have permission
    const permResult = await Filesystem.checkPermissions();
    console.log('[RouteCapture] Current permission status:', permResult);

    if (permResult.publicStorage === 'granted') {
      return true;
    }

    // Request permission
    const requestResult = await Filesystem.requestPermissions();
    console.log('[RouteCapture] Permission request result:', requestResult);

    return requestResult.publicStorage === 'granted';
  } catch (error) {
    console.error('[RouteCapture] Permission error:', error);
    // On Android 10+, we might not need explicit permission for app-specific directories
    return true;
  }
};

/**
 * Save image to device gallery/photos
 */
export const saveToGallery = async (imageBase64: string): Promise<boolean> => {
  try {
    // Request permission first
    const hasPermission = await requestGalleryPermission();
    
    if (!hasPermission) {
      toast.error('Gallery permission denied. Please enable in Settings.');
      return false;
    }

    const fileName = `hotstepper-route-${Date.now()}.png`;
    
    if (Capacitor.isNativePlatform()) {
      // Native: Save to device storage
      // Remove data URL prefix for Capacitor
      const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
      
      await Filesystem.writeFile({
        path: `Pictures/Hotstepper/${fileName}`,
        data: base64Data,
        directory: Directory.External,
        recursive: true,
      });
      
      console.log('[RouteCapture] Image saved to gallery');
      toast.success('Route saved to Photos! 📸');
      return true;
    } else {
      // Web: Download as file
      const link = document.createElement('a');
      link.href = imageBase64;
      link.download = fileName;
      link.click();
      
      toast.success('Route image downloaded! 📸');
      return true;
    }
  } catch (error) {
    console.error('[RouteCapture] Failed to save to gallery:', error);
    toast.error('Failed to save image. Please try again.');
    return false;
  }
};

/**
 * Share route image with native share sheet
 */
export const shareRoute = async (imageBase64: string, stats: SessionStats): Promise<boolean> => {
  try {
    const message = `🏃 Just completed a ${stats.distance}km walk!\n⏱ Duration: ${stats.duration}\n📍 Pace: ${stats.pace}/km\n👟 Steps: ${stats.steps.toLocaleString()}\n\n#Hotstepper #Walking #Fitness`;

    if (Capacitor.isNativePlatform()) {
      // Native: Use share sheet
      // First save the image temporarily
      const fileName = `hotstepper-share-${Date.now()}.png`;
      const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });
      
      await Share.share({
        title: 'My Walking Route',
        text: message,
        url: savedFile.uri,
        dialogTitle: 'Share your route',
      });
      
      // Clean up temp file
      try {
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Cache,
        });
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return true;
    } else {
      // Web: Use Web Share API if available, otherwise copy to clipboard
      if (navigator.share) {
        // Convert base64 to blob for web share
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], 'hotstepper-route.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'My Walking Route',
          text: message,
          files: [file],
        });
      } else {
        // Fallback: Copy message to clipboard
        await navigator.clipboard.writeText(message);
        toast.success('Stats copied to clipboard!');
      }
      return true;
    }
  } catch (error) {
    console.error('[RouteCapture] Failed to share:', error);
    // User cancelled share is not an error
    if ((error as Error).name === 'AbortError') {
      return true;
    }
    toast.error('Failed to share. Please try again.');
    return false;
  }
};
