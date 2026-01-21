import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import { PushNotifications } from '@capacitor/push-notifications';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { motion } from 'framer-motion';
import { Bug, Cpu, Shield, Play, Square, Settings, RefreshCw, Trash2, Copy, AlertTriangle, Bell, Battery, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pedometerService, StartResult } from '@/services/pedometerService';
/// <reference path="../types/cordova-permissions.d.ts" />

// The Android permission string for activity recognition
const ACTIVITY_RECOGNITION_PERMISSION = 'android.permission.ACTIVITY_RECOGNITION';

// Helper: Check if we have activity recognition permission using Cordova plugin
const checkCordovaPermission = (): Promise<{ available: boolean; hasPermission: boolean }> => {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) {
      console.log('[Debug] Cordova permissions plugin not available');
      resolve({ available: false, hasPermission: false });
      return;
    }
    
    const permissions = window.cordova.plugins.permissions;
    permissions.checkPermission(
      ACTIVITY_RECOGNITION_PERMISSION,
      (status) => {
        console.log('[Debug] Cordova check result:', status.hasPermission);
        resolve({ available: true, hasPermission: status.hasPermission });
      },
      (err) => {
        console.error('[Debug] Cordova check error:', err);
        resolve({ available: true, hasPermission: false });
      }
    );
  });
};

// Helper: Request activity recognition permission using Cordova plugin (THE DELEGATE)
const requestCordovaPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) {
      console.log('[Debug] Cordova permissions plugin not available');
      resolve(false);
      return;
    }
    
    console.log('[Debug] 🎯 Requesting permission via Cordova delegate...');
    const permissions = window.cordova.plugins.permissions;
    permissions.requestPermission(
      ACTIVITY_RECOGNITION_PERMISSION,
      (status) => {
        console.log('[Debug] 🎯 Cordova request result:', status.hasPermission);
        resolve(status.hasPermission);
      },
      (err) => {
        console.error('[Debug] Cordova request error:', err);
        resolve(false);
      }
    );
  });
};

interface DebugState {
  platform: string;
  isNative: boolean;
  isAvailable: boolean | null;
  stepCountingSupported: boolean | null;
  permissionStatus: string | null;
  cordovaAvailable: boolean | null;
  cordovaPermissionStatus: string | null;
  notificationPermissionStatus: string | null;
  isTracking: boolean;
  isStarting: boolean;
  lastMeasurement: { steps: number; distance: number } | null;
  logs: { time: string; message: string; type: 'info' | 'success' | 'error' | 'warn' }[];
  error: string | null;
  lastError: StartResult | null;
}

export default function PedometerDebug() {
  const [state, setState] = useState<DebugState>({
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isAvailable: null,
    stepCountingSupported: null,
    permissionStatus: null,
    cordovaAvailable: null,
    cordovaPermissionStatus: null,
    notificationPermissionStatus: null,
    isTracking: pedometerService.isTracking(),
    isStarting: false,
    lastMeasurement: null,
    logs: [],
    error: null,
    lastError: null,
  });

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`[PedometerDebug ${time}] ${message}`);
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }].slice(-50)
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  // Full diagnostics
  const runFullDiagnostics = useCallback(async () => {
    addLog('=== FULL SENSOR DIAGNOSTICS (Android 14/15/16) ===', 'info');
    addLog(`Platform: ${Capacitor.getPlatform()}`, 'info');

    // Step 1: Check availability
    addLog('Step 1: Checking sensor availability...', 'info');
    let stepCountingAvailable = false;
    try {
      const result = await CapacitorPedometer.isAvailable();
      stepCountingAvailable = result.stepCounting === true;
      addLog(`isAvailable: stepCounting=${stepCountingAvailable}`, stepCountingAvailable ? 'success' : 'warn');
      setState(prev => ({
        ...prev,
        isAvailable: true,
        stepCountingSupported: stepCountingAvailable,
      }));
    } catch (error: any) {
      addLog(`isAvailable error: ${error.message || error}`, 'error');
    }

    await new Promise(r => setTimeout(r, 200));

    // Step 2: Check notification permission (Android 13+ requirement)
    addLog('Step 2: Checking notification permission (Android 13+)...', 'info');
    let notifState = 'unknown';
    try {
      const result = await PushNotifications.checkPermissions();
      notifState = result.receive || 'unknown';
      addLog(`Notification permission: ${notifState}`, notifState === 'granted' ? 'success' : 'warn');
      if (notifState !== 'granted') {
        addLog('⚠️ Notifications required for foreground service on Android 13+', 'warn');
      }
      setState(prev => ({ ...prev, notificationPermissionStatus: notifState }));
    } catch (error: any) {
      addLog(`Notification check error: ${error.message || error}`, 'warn');
    }

    await new Promise(r => setTimeout(r, 200));

    // Step 3: Check Capacitor permission state
    addLog('Step 3: Checking activity recognition permission...', 'info');
    let permState = 'unknown';
    try {
      const result = await CapacitorPedometer.checkPermissions();
      permState = (result as any).activityRecognition || 'unknown';
      addLog(`Activity recognition: ${permState}`, permState === 'granted' ? 'success' : 'warn');
      setState(prev => ({ ...prev, permissionStatus: permState }));
    } catch (error: any) {
      addLog(`checkPermissions error: ${error.message || error}`, 'error');
    }

    await new Promise(r => setTimeout(r, 200));

    // Step 4: Try to start sensor via service (handles Android 14+ properly)
    addLog('Step 4: Starting sensor via pedometerService...', 'info');
    try {
      const result = await pedometerService.start((data) => {
        addLog(`🔬 RAW SENSOR DATA: steps=${data.steps}, distance=${data.distance}m`, 'success');
        setState(prev => ({ ...prev, lastMeasurement: { steps: data.steps, distance: data.distance } }));
      });
      
      if (result.success) {
        addLog('✅ Sensor started successfully! Walk to see steps.', 'success');
        setState(prev => ({ ...prev, isTracking: true, lastError: null }));
      } else {
        addLog(`❌ START FAILED: ${result.error}`, 'error');
        if (result.guidance) {
          addLog(`📋 FIX: ${result.guidance}`, 'warn');
        }
        
        // Show specific guidance for Android 14+
        if (result.error === 'FOREGROUND_SERVICE_BLOCKED') {
          addLog('🔧 Android 14+ Issue Detected:', 'error');
          addLog('1. Ensure Notifications are ALLOWED', 'warn');
          addLog('2. Go to Settings > Apps > [App] > Battery > Unrestricted', 'warn');
          addLog('3. Uninstall and reinstall the app after manifest changes', 'warn');
        }
        
        setState(prev => ({ ...prev, error: result.guidance || result.error, lastError: result }));
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      addLog(`START FAILED: ${errorMsg}`, 'error');
      setState(prev => ({ ...prev, error: errorMsg }));
    }

    addLog('=== DIAGNOSTICS COMPLETE ===', 'info');
  }, [addLog]);

  // Auto-run diagnostics on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runFullDiagnostics();
    }, 500);
    return () => clearTimeout(timer);
  }, [runFullDiagnostics]);

  // Start tracking directly (bypasses buggy permission methods)
  const tryStartDirect = useCallback(async () => {
    addLog('Starting sensor directly (bypasses permission bugs)...', 'info');
    setState(prev => ({ ...prev, isStarting: true }));
    try {
      const result = await pedometerService.start((data) => {
        addLog(`🔬 RAW: steps=${data.steps}, distance=${data.distance}m`, 'success');
        setState(prev => ({ ...prev, lastMeasurement: { steps: data.steps, distance: data.distance } }));
      });
      if (result.success) {
        addLog('✅ Sensor started!', 'success');
        setState(prev => ({ ...prev, isTracking: true, permissionStatus: 'granted' }));
      } else {
        addLog(`❌ Failed: ${result.error} - ${result.guidance}`, 'error');
        setState(prev => ({ ...prev, lastError: result }));
      }
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, 'error');
    } finally {
      setState(prev => ({ ...prev, isStarting: false }));
    }
  }, [addLog]);

  const startTracking = useCallback(async () => {
    if (state.isTracking || state.isStarting) {
      addLog('Already tracking or starting', 'warn');
      return;
    }

    setState(prev => ({ ...prev, isStarting: true }));
    addLog('=== STARTING VIA SERVICE ===', 'info');

    try {
      const result = await pedometerService.start((data) => {
        addLog(`🔬 RAW: steps=${data.steps}, distance=${data.distance}m`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: { steps: data.steps, distance: data.distance },
        }));
      });

      if (result.success) {
        addLog('✅ Sensor active - walk to see steps!', 'success');
        setState(prev => ({ ...prev, isTracking: true, lastError: null }));
      } else {
        addLog(`❌ FAILED: ${result.error}`, 'error');
        if (result.guidance) {
          addLog(`📋 ${result.guidance}`, 'warn');
        }
        setState(prev => ({ ...prev, lastError: result }));
      }
    } catch (error: any) {
      addLog(`Unexpected error: ${error.message || error}`, 'error');
      setState(prev => ({ ...prev, error: error.message || String(error) }));
    } finally {
      setState(prev => ({ ...prev, isStarting: false }));
    }
  }, [state.isTracking, state.isStarting, addLog]);

  // Force start with full reset
  const forceStartTracking = useCallback(async () => {
    if (state.isTracking) {
      addLog('Already tracking', 'warn');
      return;
    }

    setState(prev => ({ ...prev, isStarting: true }));
    addLog('=== FORCE START (full reset) ===', 'warn');

    // Step 1: Stop any existing
    addLog('[1/5] Stopping any existing updates...', 'info');
    try {
      await CapacitorPedometer.stopMeasurementUpdates();
      addLog('[1/5] OK', 'info');
    } catch (e: any) {
      addLog(`[1/5] ${e.message || 'none running'}`, 'info');
    }

    // Step 2: Remove all listeners
    addLog('[2/5] Removing all listeners...', 'info');
    try {
      await CapacitorPedometer.removeAllListeners();
      addLog('[2/5] OK', 'info');
    } catch (e: any) {
      addLog(`[2/5] ${e.message}`, 'warn');
    }

    // Step 3: Wait for state sync
    addLog('[3/5] Waiting 1s for Android state sync...', 'info');
    await new Promise(r => setTimeout(r, 1000));
    addLog('[3/5] Done waiting', 'info');

    // Step 4: Add listener
    addLog('[4/5] Adding measurement listener...', 'info');
    try {
      await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        addLog(`📊 STEP DATA: ${steps} steps`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: { steps, distance: data.distance || 0 },
        }));
      });
      addLog('[4/5] Listener added', 'success');
    } catch (e: any) {
      addLog(`[4/5] addListener FAILED: ${e.message}`, 'error');
      setState(prev => ({ ...prev, isStarting: false }));
      return;
    }

    // Step 5: Start measurement
    addLog('[5/5] Calling startMeasurementUpdates()...', 'info');
    try {
      await CapacitorPedometer.startMeasurementUpdates();
      addLog('[5/5] SUCCESS!', 'success');
      addLog('✓ SENSOR ACTIVE - Walk to see steps!', 'success');
      setState(prev => ({ ...prev, isTracking: true }));
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      addLog(`[5/5] FAILED: ${errorMsg}`, 'error');
      
      if (errorMsg.includes('permission')) {
        addLog('Plugin says permission not granted', 'error');
        addLog('TRY: Open App Settings > Permissions > Physical Activity > Allow', 'warn');
      }
      
      setState(prev => ({ ...prev, error: errorMsg }));
    } finally {
      setState(prev => ({ ...prev, isStarting: false }));
    }
  }, [state.isTracking, addLog]);

  const stopTracking = useCallback(async () => {
    if (!state.isTracking) {
      addLog('Not tracking', 'warn');
      return;
    }

    addLog('Stopping...', 'info');
    try {
      await pedometerService.stop();
      addLog('Stopped', 'success');
      setState(prev => ({ ...prev, isTracking: false }));
    } catch (error: any) {
      addLog(`Stop error: ${error.message || error}`, 'error');
    }
  }, [state.isTracking, addLog]);

  const openAppSettings = useCallback(async () => {
    addLog('Opening app settings...', 'info');
    try {
      if (Capacitor.getPlatform() === 'android') {
        await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
      } else if (Capacitor.getPlatform() === 'ios') {
        await NativeSettings.openIOS({ option: IOSSettings.App });
      }
      addLog('Settings opened', 'success');
    } catch (error: any) {
      addLog(`Open settings error: ${error.message || error}`, 'error');
    }
  }, [addLog]);

  const openBatterySettings = useCallback(async () => {
    addLog('Opening battery settings (for background activity)...', 'info');
    try {
      if (Capacitor.getPlatform() === 'android') {
        await NativeSettings.openAndroid({ option: AndroidSettings.BatteryOptimization });
      }
      addLog('Battery settings opened', 'success');
    } catch (error: any) {
      addLog(`Open battery settings error: ${error.message || error}`, 'error');
    }
  }, [addLog]);

  const requestNotificationPermission = useCallback(async () => {
    addLog('Requesting notification permission...', 'info');
    try {
      const result = await PushNotifications.requestPermissions();
      const status = result.receive || 'unknown';
      addLog(`Notification permission: ${status}`, status === 'granted' ? 'success' : 'warn');
      setState(prev => ({ ...prev, notificationPermissionStatus: status }));
    } catch (error: any) {
      addLog(`Notification permission error: ${error.message || error}`, 'error');
    }
  }, [addLog]);

  // Test Cordova delegate pattern
  const testCordovaDelegate = useCallback(async () => {
    addLog('=== TESTING CORDOVA DELEGATE PATTERN ===', 'info');
    
    // Step 1: Check if Cordova plugin is available
    addLog('Step 1: Checking Cordova plugin availability...', 'info');
    const checkResult = await checkCordovaPermission();
    
    if (!checkResult.available) {
      addLog('❌ Cordova permissions plugin NOT available', 'error');
      addLog('Make sure cordova-plugin-android-permissions is installed', 'warn');
      addLog('Run: npm install cordova-plugin-android-permissions && npx cap sync', 'warn');
      setState(prev => ({ ...prev, cordovaAvailable: false }));
      return;
    }
    
    addLog('✅ Cordova permissions plugin is available!', 'success');
    setState(prev => ({ ...prev, cordovaAvailable: true }));
    
    // Step 2: Check current permission status
    addLog(`Step 2: Current permission: ${checkResult.hasPermission ? 'GRANTED' : 'NOT GRANTED'}`, 
      checkResult.hasPermission ? 'success' : 'warn');
    setState(prev => ({ ...prev, cordovaPermissionStatus: checkResult.hasPermission ? 'granted' : 'denied' }));
    
    if (checkResult.hasPermission) {
      addLog('Permission already granted - trying to start sensor...', 'info');
      await tryStartDirect();
      return;
    }
    
    // Step 3: Request permission via Cordova delegate
    addLog('Step 3: Requesting permission via Cordova delegate...', 'info');
    addLog('🎯 Native Android permission dialog should appear NOW!', 'warn');
    
    const granted = await requestCordovaPermission();
    
    if (granted) {
      addLog('✅ Permission GRANTED via Cordova delegate!', 'success');
      setState(prev => ({ ...prev, cordovaPermissionStatus: 'granted', permissionStatus: 'granted' }));
      
      // Step 4: Now start the pedometer
      addLog('Step 4: Starting pedometer sensor...', 'info');
      await tryStartDirect();
    } else {
      addLog('❌ Permission DENIED by user', 'error');
      addLog('User needs to grant Physical Activity permission', 'warn');
      setState(prev => ({ ...prev, cordovaPermissionStatus: 'denied' }));
    }
    
    addLog('=== CORDOVA DELEGATE TEST COMPLETE ===', 'info');
  }, [addLog, tryStartDirect]);

  const copyLogs = useCallback(() => {
    const logText = state.logs.map(l => `[${l.time}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    addLog('Logs copied to clipboard', 'success');
  }, [state.logs, addLog]);

  const getStatusColor = (status: string | null) => {
    if (!status) return 'text-muted-foreground';
    if (status === 'granted' || status === 'GRANTED') return 'text-green-500';
    if (status === 'denied' || status === 'DENIED') return 'text-red-500';
    if (status === 'prompt') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warn': return 'text-amber-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 safe-area-pt">
          <Bug className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold">Pedometer Debug</h1>
          <span className="text-xs text-muted-foreground ml-auto">v4.0</span>
        </div>
      </div>

      <div className="pt-16 pb-8 px-4 space-y-4">
        {/* Platform Info */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Platform Info</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Platform:</div>
            <div className="font-mono">{state.platform}</div>
            <div className="text-muted-foreground">Is Native:</div>
            <div className={state.isNative ? 'text-green-500' : 'text-red-500'}>
              {state.isNative ? 'Yes' : 'No (Web)'}
            </div>
            <div className="text-muted-foreground">Step Counter:</div>
            <div className={state.stepCountingSupported === true ? 'text-green-500' : state.stepCountingSupported === false ? 'text-red-500' : 'text-muted-foreground'}>
              {state.stepCountingSupported === null ? 'Checking...' : state.stepCountingSupported ? 'Available' : 'Not Available'}
            </div>
            <div className="text-muted-foreground">Started in Onboarding:</div>
            <div className={pedometerService.wasStartedDuringOnboarding() ? 'text-green-500' : 'text-amber-500'}>
              {pedometerService.wasStartedDuringOnboarding() ? 'Yes ✓' : 'No'}
            </div>
          </div>
        </motion.div>

        {/* Permission Status */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Permission Status</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Activity Recognition:</div>
            <div className={getStatusColor(state.permissionStatus)}>
              {state.permissionStatus || 'Unknown'}
            </div>
            <div className="text-muted-foreground">Cordova Plugin:</div>
            <div className={state.cordovaAvailable === true ? 'text-green-500' : state.cordovaAvailable === false ? 'text-red-500' : 'text-muted-foreground'}>
              {state.cordovaAvailable === null ? 'Not checked' : state.cordovaAvailable ? 'Available ✓' : 'Not Available'}
            </div>
            <div className="text-muted-foreground">Cordova Permission:</div>
            <div className={getStatusColor(state.cordovaPermissionStatus)}>
              {state.cordovaPermissionStatus || 'Not checked'}
            </div>
            <div className="text-muted-foreground">Notifications (Android 13+):</div>
            <div className={getStatusColor(state.notificationPermissionStatus)}>
              {state.notificationPermissionStatus || 'Unknown'}
            </div>
          </div>
          
          {/* Cordova Delegate Test - THE MAIN TEST */}
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Cordova Delegate Pattern</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Uses cordova-plugin-android-permissions to request ACTIVITY_RECOGNITION. 
              This bypasses the crashing Pedometer plugin.
            </p>
            <Button 
              size="sm" 
              variant="default" 
              onClick={testCordovaDelegate} 
              disabled={state.isStarting}
              className="w-full"
            >
              <Fingerprint className="h-3 w-3 mr-2" />
              Test Cordova Delegate (Shows Native Dialog)
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={tryStartDirect} disabled={state.isStarting}>
              <Play className="h-3 w-3 mr-2" />
              Start Direct
            </Button>
            <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
              <Bell className="h-3 w-3 mr-2" />
              Notifications
            </Button>
          </div>
        </motion.div>

        {/* Tracking Controls */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Play className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Tracking Controls</h2>
          </div>
          
          <div className="text-sm mb-3">
            <span className="text-muted-foreground">Status: </span>
            <span className={state.isTracking ? 'text-green-500' : 'text-muted-foreground'}>
              {state.isTracking ? 'TRACKING' : 'Stopped'}
            </span>
          </div>

          {state.lastMeasurement && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
              <div className="text-green-400 font-mono text-lg">
                📊 {state.lastMeasurement.steps} steps
              </div>
              <div className="text-green-400/70 text-sm">
                {state.lastMeasurement.distance.toFixed(1)}m distance
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={startTracking} 
              disabled={state.isTracking || state.isStarting}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {state.isStarting ? 'Starting...' : 'Start'}
            </Button>
            <Button 
              onClick={stopTracking} 
              disabled={!state.isTracking}
              variant="outline"
              className="w-full"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
          
          <Button 
            onClick={forceStartTracking} 
            disabled={state.isTracking || state.isStarting}
            variant="secondary"
            className="w-full mt-2"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Force Start (Full Reset)
          </Button>
        </motion.div>

        {/* Foreground Service Issue Alert */}
        {state.lastError?.error === 'FOREGROUND_SERVICE_BLOCKED' && (
          <motion.div
            className="tactical-card p-4 border-2 border-amber-500/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-semibold text-amber-500 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Android 14+ Foreground Service Issue
            </h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>The step sensor cannot start due to Android 14+ restrictions. Please:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Allow <strong>Notifications</strong> for this app</li>
                <li>Set Battery to <strong>Unrestricted</strong></li>
                <li>Ensure AndroidManifest.xml has FOREGROUND_SERVICE_HEALTH</li>
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
                <Bell className="h-3 w-3 mr-2" />
                Notifications
              </Button>
              <Button size="sm" variant="outline" onClick={openBatterySettings}>
                <Battery className="h-3 w-3 mr-2" />
                Battery Settings
              </Button>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={runFullDiagnostics}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Re-run Diagnostics
            </Button>
            <Button variant="outline" size="sm" onClick={openAppSettings}>
              <Settings className="h-3 w-3 mr-2" />
              App Settings
            </Button>
            <Button variant="outline" size="sm" onClick={openBatterySettings}>
              <Battery className="h-3 w-3 mr-2" />
              Battery Settings
            </Button>
          </div>
        </motion.div>

        {/* Logs */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Debug Logs</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyLogs}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="bg-black/50 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
            {state.logs.length === 0 ? (
              <div className="text-muted-foreground">No logs yet...</div>
            ) : (
              state.logs.map((log, i) => (
                <div key={i} className={getLogColor(log.type)}>
                  <span className="text-muted-foreground">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Error Display */}
        {state.error && (
          <motion.div
            className="tactical-card p-4 border-2 border-red-500/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-semibold text-red-500 mb-2">Last Error</h2>
            <div className="text-sm text-red-400 font-mono break-all">
              {state.error}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}