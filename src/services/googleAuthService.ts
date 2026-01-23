import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Initialize Google Auth plugin for native platforms
 * Must be called early in app lifecycle (e.g., main.tsx)
 */
export const initializeGoogleAuth = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.initialize({
        clientId: '174629789704-sml35k7l0ht90s3s0l4cro8dts14o7u3.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      console.log('[GoogleAuth] Initialized successfully');
    } catch (error) {
      console.error('[GoogleAuth] Initialization failed:', error);
    }
  }
};

/**
 * Sign in with Google using platform-appropriate method
 * - Native platforms: Uses native Google Sign-In SDK for seamless experience
 * - Web: Falls back to OAuth redirect flow
 */
export const signInWithGoogle = async (): Promise<{ error: string | null }> => {
  try {
    if (Capacitor.isNativePlatform()) {
      return await signInWithGoogleNative();
    } else {
      return await signInWithGoogleWeb();
    }
  } catch (error) {
    console.error('[GoogleAuth] Sign-in error:', error);
    return { error: 'Failed to sign in with Google' };
  }
};

/**
 * Native Google Sign-In using Capacitor plugin
 * Gets ID token from native SDK and exchanges it with Supabase
 */
const signInWithGoogleNative = async (): Promise<{ error: string | null }> => {
  try {
    console.log('[GoogleAuth] Starting native sign-in...');
    
    // Trigger native Google Sign-In
    const result = await GoogleAuth.signIn();
    
    console.log('[GoogleAuth] Native sign-in result:', {
      email: result.email,
      hasIdToken: !!result.authentication?.idToken,
    });

    const idToken = result.authentication?.idToken;
    
    if (!idToken) {
      console.error('[GoogleAuth] No ID token received from native sign-in');
      return { error: 'No authentication token received from Google' };
    }

    // Exchange the ID token with Supabase for a session
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('[GoogleAuth] Supabase token exchange failed:', error);
      return { error: error.message };
    }

    console.log('[GoogleAuth] Native sign-in successful');
    return { error: null };
  } catch (error: any) {
    console.error('[GoogleAuth] Native sign-in failed:', error);
    
    // Handle user cancellation gracefully
    if (error?.message?.includes('cancel') || error?.code === 'SIGN_IN_CANCELLED') {
      return { error: null }; // User cancelled - not an error
    }
    
    // Fallback to web OAuth if native fails
    console.log('[GoogleAuth] Falling back to web OAuth...');
    return await signInWithGoogleWeb();
  }
};

/**
 * Web-based Google Sign-In using OAuth redirect
 */
const signInWithGoogleWeb = async (): Promise<{ error: string | null }> => {
  try {
    console.log('[GoogleAuth] Starting web OAuth flow...');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      console.error('[GoogleAuth] Web OAuth failed:', error);
      return { error: error.message };
    }

    // OAuth redirect will happen, so we won't reach here
    return { error: null };
  } catch (error) {
    console.error('[GoogleAuth] Web OAuth error:', error);
    return { error: 'Failed to connect with Google' };
  }
};

/**
 * Sign out from Google (for native platforms)
 */
export const signOutFromGoogle = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
      console.log('[GoogleAuth] Signed out from Google');
    } catch (error) {
      console.error('[GoogleAuth] Sign-out error:', error);
    }
  }
};
