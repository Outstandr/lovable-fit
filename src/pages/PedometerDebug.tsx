import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { motion } from 'framer-motion';
import { Bug, Cpu, Shield, Play, Square, Settings, RefreshCw, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pedometerService, PermissionProbe } from '@/services/pedometerService';

interface DebugState {
  platform: string;
  isNative: boolean;
  isAvailable: boolean | null;
  stepCountingSupported: boolean | null;
  permissionStatus: string | null;
  nativeProbeResult: {
    sdkVersion: number;
    manufacturer: string;
    model: string;
    activityRecognitionGranted: boolean;
    permissionStateText: string;
    shouldShowRationale: boolean;
  } | null;
  isTracking: boolean;
  isStarting: boolean;
  lastMeasurement: { steps: number; distance: number } | null;
  logs: { time: string; message: string; type: 'info' | 'success' | 'error' | 'warn' }[];
  error: string | null;
}

export default function PedometerDebug() {
  const [state, setState] = useState<DebugState>({
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isAvailable: null,
    stepCountingSupported: null,
    permissionStatus: null,
    nativeProbeResult: null,
    isTracking: pedometerService.isTracking(),
    isStarting: false,
    lastMeasurement: null,
    logs: [],
    error: null,
  });

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }].slice(-50)
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  // Native OS permission probe - ground truth
  const runNativeProbe = useCallback(async () => {
    addLog('=== NATIVE OS PERMISSION PROBE ===', 'info');
    
    if (!Capacitor.isNativePlatform()) {
      addLog('Not on native platform, skipping probe', 'warn');
      return;
    }

    try {
      const result = await PermissionProbe.checkActivityRecognition();
      addLog(`SDK: ${result.sdkVersion} (${result.sdkCodename})`, 'info');
      addLog(`Device: ${result.manufacturer} ${result.model}`, 'info');
      addLog(`OS-level ACTIVITY_RECOGNITION: ${result.permissionStateText}`, 
        result.activityRecognitionGranted ? 'success' : 'error');
      
      if (result.shouldShowRationale) {
        addLog('shouldShowRationale=true (user denied before, not permanently)', 'warn');
      }
      
      if (result.bodySensorsGranted !== undefined) {
        addLog(`BODY_SENSORS: ${result.bodySensorsGranted ? 'GRANTED' : 'DENIED'}`, 
          result.bodySensorsGranted ? 'success' : 'warn');
      }

      setState(prev => ({
        ...prev,
        nativeProbeResult: {
          sdkVersion: result.sdkVersion,
          manufacturer: result.manufacturer,
          model: result.model,
          activityRecognitionGranted: result.activityRecognitionGranted,
          permissionStateText: result.permissionStateText,
          shouldShowRationale: result.shouldShowRationale,
        }
      }));

      return result;
    } catch (error: any) {
      addLog(`Native probe error: ${error.message || error}`, 'error');
      addLog('This is expected on web/non-native platforms', 'warn');
      return null;
    }
  }, [addLog]);

  // Full diagnostics with native probe
  const runFullDiagnostics = useCallback(async () => {
    addLog('=== FULL SENSOR DIAGNOSTICS ===', 'info');
    
    // Step 0: Native probe first
    addLog('Step 0: Running native OS permission probe...', 'info');
    const probeResult = await runNativeProbe();
    
    await new Promise(r => setTimeout(r, 300));

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

    // Step 2: Check Capacitor permission state
    addLog('Step 2: Checking Capacitor permission state...', 'info');
    let capacitorPermState = 'unknown';
    try {
      const result = await CapacitorPedometer.checkPermissions();
      capacitorPermState = (result as any).activityRecognition || 'unknown';
      addLog(`Capacitor reports: ${capacitorPermState}`, capacitorPermState === 'granted' ? 'success' : 'warn');
      setState(prev => ({ ...prev, permissionStatus: capacitorPermState }));
    } catch (error: any) {
      addLog(`checkPermissions error: ${error.message || error}`, 'error');
    }

    // Compare Capacitor vs Native probe
    if (probeResult) {
      const nativeGranted = probeResult.activityRecognitionGranted;
      const capacitorGranted = capacitorPermState === 'granted';
      
      if (nativeGranted !== capacitorGranted) {
        addLog('⚠️ MISMATCH: Native says ' + (nativeGranted ? 'GRANTED' : 'DENIED') + 
               ' but Capacitor says ' + capacitorPermState, 'error');
        addLog('This mismatch is likely causing the startMeasurementUpdates failure', 'warn');
      } else {
        addLog('✓ Native and Capacitor permission states match', 'success');
      }
    }

    await new Promise(r => setTimeout(r, 200));

    // Step 3: Try to start sensor
    addLog('Step 3: Attempting to start sensor...', 'info');
    try {
      await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        const distance = data.distance || 0;
        addLog(`📊 SENSOR DATA: steps=${steps}, distance=${distance}m`, 'success');
        setState(prev => ({ ...prev, lastMeasurement: { steps, distance } }));
      });
      
      await CapacitorPedometer.startMeasurementUpdates();
      addLog('✓ Sensor started successfully! Walk to see steps.', 'success');
      setState(prev => ({ ...prev, isTracking: true }));
    } catch (error: any) {
      addLog(`START FAILED: ${error.message || error}`, 'error');
      
      // Provide specific guidance based on probe results
      if (probeResult && !probeResult.activityRecognitionGranted) {
        addLog('DIAGNOSIS: OS-level permission is DENIED', 'error');
        addLog('FIX: Go to Settings > Apps > HotStepper > Permissions > Physical Activity > Allow', 'warn');
      } else if (probeResult && probeResult.activityRecognitionGranted) {
        addLog('DIAGNOSIS: OS says GRANTED but plugin rejects - likely plugin bug', 'error');
        addLog('TRY: Force-close app completely, then reopen', 'warn');
      }
      
      setState(prev => ({ ...prev, error: error.message || String(error) }));
    }

    addLog('=== DIAGNOSTICS COMPLETE ===', 'info');
  }, [addLog, runNativeProbe]);

  // Auto-run diagnostics on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runFullDiagnostics();
    }, 500);
    return () => clearTimeout(timer);
  }, [runFullDiagnostics]);

  // Use unified ensurePermission
  const ensurePermission = useCallback(async () => {
    addLog('Using ensurePermission (unified flow)...', 'info');
    try {
      const result = await pedometerService.ensurePermission();
      addLog(`ensurePermission result: ${result}`, result === 'granted' ? 'success' : 'error');
      setState(prev => ({
        ...prev,
        permissionStatus: result,
      }));
      
      // Re-run native probe to verify
      await runNativeProbe();
    } catch (error: any) {
      addLog(`ensurePermission error: ${error.message || error}`, 'error');
    }
  }, [addLog, runNativeProbe]);

  const startTracking = useCallback(async () => {
    if (state.isTracking || state.isStarting) {
      addLog('Already tracking or starting', 'warn');
      return;
    }

    setState(prev => ({ ...prev, isStarting: true }));
    addLog('=== STARTING VIA SERVICE ===', 'info');

    try {
      const result = await pedometerService.start((data) => {
        addLog(`📊 Steps: ${data.steps}, Distance: ${data.distance}m`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: { steps: data.steps, distance: data.distance },
        }));
      });

      addLog(`start() returned: ${result}`, result ? 'success' : 'error');
      
      if (result) {
        addLog('✓ Sensor active - walk to see steps!', 'success');
        setState(prev => ({ ...prev, isTracking: true }));
      } else {
        addLog('FAILED - running native probe to diagnose...', 'error');
        await runNativeProbe();
      }
    } catch (error: any) {
      addLog(`Unexpected error: ${error.message || error}`, 'error');
      setState(prev => ({ ...prev, error: error.message || String(error) }));
    } finally {
      setState(prev => ({ ...prev, isStarting: false }));
    }
  }, [state.isTracking, state.isStarting, addLog, runNativeProbe]);

  // Force start with full reset
  const forceStartTracking = useCallback(async () => {
    if (state.isTracking) {
      addLog('Already tracking', 'warn');
      return;
    }

    setState(prev => ({ ...prev, isStarting: true }));
    addLog('=== FORCE START (with native probe) ===', 'warn');

    // Step 1: Native probe first
    addLog('[1/6] Running native permission probe...', 'info');
    const probeResult = await runNativeProbe();
    
    if (probeResult && !probeResult.activityRecognitionGranted) {
      addLog('[1/6] STOP: OS-level permission DENIED', 'error');
      addLog('You must grant Physical Activity permission in system settings', 'warn');
      setState(prev => ({ ...prev, isStarting: false }));
      return;
    }

    // Step 2: Stop any existing
    addLog('[2/6] Stopping any existing updates...', 'info');
    try {
      await CapacitorPedometer.stopMeasurementUpdates();
      addLog('[2/6] OK', 'info');
    } catch (e: any) {
      addLog(`[2/6] ${e.message || 'none running'}`, 'info');
    }

    // Step 3: Remove all listeners
    addLog('[3/6] Removing all listeners...', 'info');
    try {
      await CapacitorPedometer.removeAllListeners();
      addLog('[3/6] OK', 'info');
    } catch (e: any) {
      addLog(`[3/6] ${e.message}`, 'warn');
    }

    // Step 4: Wait for state sync
    addLog('[4/6] Waiting 1s for Android state sync...', 'info');
    await new Promise(r => setTimeout(r, 1000));
    addLog('[4/6] Done waiting', 'info');

    // Step 5: Add listener
    addLog('[5/6] Adding measurement listener...', 'info');
    try {
      await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        addLog(`📊 STEP DATA: ${steps} steps`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: { steps, distance: data.distance || 0 },
        }));
      });
      addLog('[5/6] Listener added', 'success');
    } catch (e: any) {
      addLog(`[5/6] addListener FAILED: ${e.message}`, 'error');
      setState(prev => ({ ...prev, isStarting: false }));
      return;
    }

    // Step 6: Start measurement
    addLog('[6/6] Calling startMeasurementUpdates()...', 'info');
    try {
      await CapacitorPedometer.startMeasurementUpdates();
      addLog('[6/6] SUCCESS!', 'success');
      addLog('✓ SENSOR ACTIVE - Walk to see steps!', 'success');
      setState(prev => ({ ...prev, isTracking: true }));
    } catch (e: any) {
      addLog(`[6/6] FAILED: ${e.message}`, 'error');
      
      if (e.message?.includes('permission')) {
        addLog('Plugin rejected despite OS granting permission', 'error');
        addLog('This appears to be a plugin-level bug', 'warn');
        addLog('TRY: Force close app, clear app cache, restart', 'warn');
      }
      
      setState(prev => ({ ...prev, error: e.message }));
    } finally {
      setState(prev => ({ ...prev, isStarting: false }));
    }
  }, [state.isTracking, addLog, runNativeProbe]);

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
          <span className="text-xs text-muted-foreground ml-auto">v3.0</span>
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
          </div>
        </motion.div>

        {/* Native Probe Result */}
        {state.nativeProbeResult && (
          <motion.div
            className="tactical-card p-4 border-2 border-amber-500/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold">Native OS Probe (Ground Truth)</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Android SDK:</div>
              <div className="font-mono">{state.nativeProbeResult.sdkVersion}</div>
              <div className="text-muted-foreground">Device:</div>
              <div className="font-mono text-xs">{state.nativeProbeResult.manufacturer} {state.nativeProbeResult.model}</div>
              <div className="text-muted-foreground">OS Permission:</div>
              <div className={state.nativeProbeResult.activityRecognitionGranted ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                {state.nativeProbeResult.permissionStateText}
              </div>
              {state.nativeProbeResult.shouldShowRationale && (
                <>
                  <div className="text-muted-foreground">Rationale Needed:</div>
                  <div className="text-amber-500">Yes (user denied before)</div>
                </>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={runNativeProbe} className="mt-3 w-full">
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-run Probe
            </Button>
          </motion.div>
        )}

        {/* Permission Status */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Permission</h2>
            </div>
            <Button size="sm" variant="default" onClick={ensurePermission}>
              Ensure Permission
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Capacitor State:</div>
            <div className={getStatusColor(state.permissionStatus)}>
              {state.permissionStatus || 'Checking...'}
            </div>
          </div>
        </motion.div>

        {/* Tracking Test */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Sensor Test</h2>
            </div>
            <div className={state.isTracking ? 'text-green-500 text-sm font-medium' : 'text-muted-foreground text-sm'}>
              {state.isTracking ? '● Active' : '○ Inactive'}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="default" 
                onClick={startTracking}
                disabled={state.isTracking || state.isStarting}
                className="flex-1"
              >
                <Play className="h-3 w-3 mr-1" />
                {state.isStarting ? 'Starting...' : 'Start'}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={stopTracking}
                disabled={!state.isTracking}
                className="flex-1"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            </div>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={forceStartTracking}
              disabled={state.isTracking || state.isStarting}
              className="w-full"
            >
              Force Start (with native probe)
            </Button>
          </div>

          {state.lastMeasurement && (
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-primary">
                {state.lastMeasurement.steps}
              </div>
              <div className="text-xs text-muted-foreground">steps</div>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={openAppSettings}>
              <Settings className="h-3 w-3 mr-1" />
              App Settings
            </Button>
            <Button size="sm" variant="outline" onClick={runFullDiagnostics}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Full Diagnostics
            </Button>
            <Button size="sm" variant="outline" onClick={copyLogs}>
              <Copy className="h-3 w-3 mr-1" />
              Copy Logs
            </Button>
            <Button size="sm" variant="outline" onClick={clearLogs}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Logs
            </Button>
          </div>
        </motion.div>

        {/* Logs */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-semibold mb-3">Logs ({state.logs.length})</h2>
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
            <p className="text-sm text-red-400 font-mono">{state.error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
