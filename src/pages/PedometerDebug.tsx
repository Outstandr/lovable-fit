import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { motion } from 'framer-motion';
import { Bug, Cpu, Shield, Play, Square, Settings, RefreshCw, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pedometerService } from '@/services/pedometerService';

interface DebugState {
  platform: string;
  isNative: boolean;
  isAvailable: boolean | null;
  stepCountingSupported: boolean | null;
  permissionStatus: string | null;
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

  // Full diagnostics - tests permission ordering hypothesis
  const runFullDiagnostics = useCallback(async () => {
    addLog('=== FULL SENSOR DIAGNOSTICS ===', 'info');
    
    // 1. Check availability BEFORE permission
    addLog('Step 1: Checking availability BEFORE permission...', 'info');
    let availBefore = false;
    try {
      const result = await CapacitorPedometer.isAvailable();
      availBefore = result.stepCounting === true;
      addLog(`isAvailable BEFORE: ${JSON.stringify(result)}`, availBefore ? 'success' : 'warn');
      setState(prev => ({
        ...prev,
        isAvailable: true,
        stepCountingSupported: availBefore,
      }));
    } catch (error: any) {
      addLog(`isAvailable error: ${error.message || error}`, 'error');
    }

    await new Promise(r => setTimeout(r, 200));

    // 2. Check current permission state
    addLog('Step 2: Checking current permission state...', 'info');
    try {
      const result = await CapacitorPedometer.checkPermissions();
      const permState = (result as any).activityRecognition || 'unknown';
      addLog(`Permission state: ${permState}`, permState === 'granted' ? 'success' : 'warn');
      setState(prev => ({ ...prev, permissionStatus: permState }));
    } catch (error: any) {
      addLog(`checkPermissions error: ${error.message || error}`, 'error');
    }

    await new Promise(r => setTimeout(r, 200));

    // 3. Request permission
    addLog('Step 3: Requesting permission...', 'info');
    let permGranted = false;
    try {
      const result = await CapacitorPedometer.requestPermissions();
      const permState = (result as any).activityRecognition || 'unknown';
      permGranted = permState === 'granted';
      addLog(`Permission after request: ${permState}`, permGranted ? 'success' : 'error');
      setState(prev => ({ ...prev, permissionStatus: permState }));
    } catch (error: any) {
      addLog(`requestPermissions error: ${error.message || error}`, 'error');
    }

    await new Promise(r => setTimeout(r, 500));

    // 4. Check availability AFTER permission - KEY TEST
    addLog('Step 4: Checking availability AFTER permission (KEY TEST)...', 'info');
    let availAfter = false;
    try {
      const result = await CapacitorPedometer.isAvailable();
      availAfter = result.stepCounting === true;
      addLog(`isAvailable AFTER: ${JSON.stringify(result)}`, availAfter ? 'success' : 'error');
      setState(prev => ({ ...prev, stepCountingSupported: availAfter }));
      
      if (!availBefore && availAfter) {
        addLog('⚡ DISCOVERY: Sensor becomes available AFTER permission!', 'success');
      } else if (!availBefore && !availAfter) {
        addLog('❌ Sensor unavailable even after permission', 'error');
      }
    } catch (error: any) {
      addLog(`isAvailable error: ${error.message || error}`, 'error');
    }

    await new Promise(r => setTimeout(r, 200));

    // 5. Attempt to start sensor regardless
    addLog('Step 5: Attempting to start sensor...', 'info');
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
      addLog(`Error details: ${JSON.stringify(error)}`, 'error');
      setState(prev => ({ ...prev, error: error.message || String(error) }));
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

  const requestPermission = useCallback(async () => {
    addLog('Requesting permission...', 'info');
    try {
      const result = await CapacitorPedometer.requestPermissions();
      addLog(`requestPermissions: ${JSON.stringify(result)}`, 'success');
      setState(prev => ({
        ...prev,
        permissionStatus: (result as any).activityRecognition || 'unknown',
      }));
    } catch (error: any) {
      addLog(`requestPermissions error: ${error.message || error}`, 'error');
    }
  }, [addLog]);

  const startTracking = useCallback(async () => {
    if (state.isTracking || state.isStarting) {
      addLog('Already tracking or starting', 'warn');
      return;
    }

    setState(prev => ({ ...prev, isStarting: true }));
    addLog('=== STARTING SENSOR ===', 'info');

    try {
      const success = await pedometerService.start((data) => {
        addLog(`Steps: ${data.steps}, Distance: ${data.distance}m`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: { steps: data.steps, distance: data.distance },
        }));
      });

      addLog(`start() result: ${success}`, success ? 'success' : 'error');
      setState(prev => ({ ...prev, isTracking: success }));

      if (success) {
        addLog('✓ Sensor active - walk to see steps!', 'success');
      } else {
        addLog('Sensor failed to start', 'error');
      }
    } catch (error: any) {
      addLog(`Start error: ${error.message || error}`, 'error');
      setState(prev => ({ ...prev, error: error.message || String(error) }));
    } finally {
      setState(prev => ({ ...prev, isStarting: false }));
    }
  }, [state.isTracking, state.isStarting, addLog]);

  // Force start - bypasses ALL plugin checks, directly calls native sensor
  const forceStartTracking = useCallback(async () => {
    if (state.isTracking) {
      addLog('Already tracking', 'warn');
      return;
    }

    setState(prev => ({ ...prev, isStarting: true }));
    addLog('=== FORCE START (bypassing all checks) ===', 'warn');

    try {
      // Step 1: Request permission to refresh OS state
      addLog('Refreshing permission state...', 'info');
      try {
        await CapacitorPedometer.requestPermissions();
        addLog('Permission refresh done', 'info');
      } catch (e: any) {
        addLog(`Permission refresh: ${e.message}`, 'warn');
      }

      // Small delay for OS sync
      await new Promise(r => setTimeout(r, 300));

      // Step 2: Register listener
      addLog('Registering measurement listener...', 'info');
      const listener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        const steps = data.numberOfSteps || 0;
        const distance = data.distance || 0;
        addLog(`📊 Steps: ${steps}, Distance: ${distance}m`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: { steps, distance },
        }));
      });
      addLog('Listener registered', 'success');

      // Step 3: Start sensor directly
      addLog('Starting measurement updates...', 'info');
      await CapacitorPedometer.startMeasurementUpdates();
      addLog('✓ FORCE START SUCCESS - walk to see steps!', 'success');
      
      setState(prev => ({ ...prev, isTracking: true }));
    } catch (error: any) {
      addLog(`FORCE START FAILED: ${error.message || error}`, 'error');
      addLog(`Error code: ${error.code || 'none'}`, 'error');
      setState(prev => ({ ...prev, error: error.message || String(error) }));
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

  const copyLogs = useCallback(() => {
    const logText = state.logs.map(l => `[${l.time}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    addLog('Logs copied to clipboard', 'success');
  }, [state.logs, addLog]);

  const getStatusColor = (status: string | null) => {
    if (!status) return 'text-muted-foreground';
    if (status === 'granted') return 'text-green-500';
    if (status === 'denied') return 'text-red-500';
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
          <span className="text-xs text-muted-foreground ml-auto">v2.0</span>
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
            <Button size="sm" variant="default" onClick={requestPermission}>
              Request
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Activity Recognition:</div>
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
              <RefreshCw className="h-3 w-3 mr-1" />
              ⚡ FORCE START (bypass checks)
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Last Steps:</div>
            <div className="font-mono text-lg">
              {state.lastMeasurement ? state.lastMeasurement.steps : '-'}
            </div>
            <div className="text-muted-foreground">Last Distance:</div>
            <div className="font-mono">
              {state.lastMeasurement ? `${state.lastMeasurement.distance.toFixed(2)}m` : '-'}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={openAppSettings}>
              <Settings className="h-3 w-3 mr-1" />
              App Settings
            </Button>
            <Button size="sm" variant="outline" onClick={copyLogs}>
              <Copy className="h-3 w-3 mr-1" />
              Copy Logs
            </Button>
            <Button size="sm" variant="ghost" onClick={clearLogs}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </motion.div>

        {/* Live Logs */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Logs ({state.logs.length})</h2>
          </div>
          <div className="bg-background/50 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
            {state.logs.length === 0 ? (
              <div className="text-muted-foreground">Loading diagnostics...</div>
            ) : (
              state.logs.map((log, index) => (
                <div key={index} className={getLogColor(log.type)}>
                  <span className="text-muted-foreground">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Error Display */}
        {state.error && (
          <motion.div
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-red-500 font-semibold mb-1">Last Error</div>
            <div className="text-red-400 text-sm font-mono">{state.error}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
