import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Listens for deep link events (lionelx://join/CODE)
 * and navigates to the leaderboard with the join code as a query param.
 */
export const useDeepLink = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppUrlOpen = ({ url }: { url: string }) => {
      console.log('[DeepLink] Received URL:', url);

      // Parse: lionelx://join/ABC123
      try {
        const match = url.match(/lionelx:\/\/join\/([A-Z0-9]{6})/i);
        if (match) {
          const code = match[1].toUpperCase();
          console.log('[DeepLink] Join code:', code);
          navigate(`/leaderboard?join=${code}`);
        }
      } catch (err) {
        console.error('[DeepLink] Parse error:', err);
      }
    };

    App.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
};
