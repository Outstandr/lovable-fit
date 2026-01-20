import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { motion } from 'framer-motion';
import { ArrowLeft, Bug, Cpu, Shield, Play, Square, Settings, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface DebugState {
  platform: string;
  isNative: boolean;
  isAvailable: boolean | null;
  stepCountingSupported: boolean | null;
  permissionStatus: string | null;
  isTracking: boolean;
  lastMeasurement: { steps: number; distance: number } | null;
  logs: { time: string; message: string; type: 'info' | 'success' | 'error' | 'warn' }[];
  error: string | null;
}

export default function PedometerDebug() {
  const navigate = useNavigate();
  const [listener, setListener] = useState<any>(null);
  const [state, setState] = useState<DebugState>({
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isAvailable: null,
    stepCountingSupported: null,
    permissionStatus: null,
    isTracking: false,
    lastMeasurement: null,
    logs: [],
    error: null,
  });

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }].slice(-50) // Keep last 50 logs
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  const checkAvailability = useCallback(async () => {
    addLog('Checking step counter availability...', 'info');
    try {
      const result = await CapacitorPedometer.isAvailable();
      addLog(`isAvailable result: ${JSON.stringify(result)}`, result.stepCounting ? 'success' : 'warn');
      setState(prev => ({
        ...prev,
        isAvailable: true,
        stepCountingSupported: result.stepCounting === true,
      }));
    } catch (error: any) {
      addLog(`isAvailable error: ${error.message || error}`, 'error');
      setState(prev => ({
        ...prev,
        isAvailable: false,
        stepCountingSupported: false,
        error: error.message || String(error),
      }));
    }
  }, [addLog]);

  const checkPermission = useCallback(async () => {
    addLog('Checking permission status...', 'info');
    try {
      const result = await CapacitorPedometer.checkPermissions();
      addLog(`checkPermissions result: ${JSON.stringify(result)}`, 'success');
      const permResult = result as any; // Handle different plugin property names
      setState(prev => ({
        ...prev,
        permissionStatus: permResult.activityRecognition || permResult.receive || 'unknown',
      }));
    } catch (error: any) {
      addLog(`checkPermissions error: ${error.message || error}`, 'error');
      setState(prev => ({
        ...prev,
        error: error.message || String(error),
      }));
    }
  }, [addLog]);

  const requestPermission = useCallback(async () => {
    addLog('Requesting permission (native dialog should appear)...', 'info');
    try {
      const result = await CapacitorPedometer.requestPermissions();
      addLog(`requestPermissions result: ${JSON.stringify(result)}`, 'success');
      const permResult = result as any; // Handle different plugin property names
      setState(prev => ({
        ...prev,
        permissionStatus: permResult.activityRecognition || permResult.receive || 'unknown',
      }));
    } catch (error: any) {
      addLog(`requestPermissions error: ${error.message || error}`, 'error');
      setState(prev => ({
        ...prev,
        error: error.message || String(error),
      }));
    }
  }, [addLog]);

  const startTracking = useCallback(async () => {
    if (state.isTracking) {
      addLog('Already tracking, ignoring start request', 'warn');
      return;
    }

    try {
      // Step 1: Force permission refresh before starting (fixes Android sync issue)
      addLog('Refreshing permission state...', 'info');
      const permResult = await CapacitorPedometer.requestPermissions();
      addLog(`Permission refresh result: ${JSON.stringify(permResult)}`, 'info');
      
      // Step 2: Small delay to let Android sync permission state
      await new Promise(r => setTimeout(r, 200));

      // Step 3: Add measurement listener
      addLog('Adding measurement listener...', 'info');
      const newListener = await CapacitorPedometer.addListener('measurement', (data: any) => {
        addLog(`Measurement received: steps=${data.numberOfSteps}, distance=${data.distance}m`, 'success');
        setState(prev => ({
          ...prev,
          lastMeasurement: {
            steps: data.numberOfSteps || 0,
            distance: data.distance || 0,
          },
        }));
      });
      setListener(newListener);
      addLog('Listener added successfully', 'success');

      // Step 4: Start measurement updates
      addLog('Calling startMeasurementUpdates()...', 'info');
      await CapacitorPedometer.startMeasurementUpdates();
      addLog('startMeasurementUpdates() completed - tracking active!', 'success');
      
      setState(prev => ({ ...prev, isTracking: true }));
    } catch (error: any) {
      addLog(`Start tracking error: ${error.message || error}`, 'error');
      setState(prev => ({
        ...prev,
        error: error.message || String(error),
      }));
    }
  }, [state.isTracking, addLog]);

  const stopTracking = useCallback(async () => {
    if (!state.isTracking) {
      addLog('Not tracking, ignoring stop request', 'warn');
      return;
    }

    addLog('Stopping measurement updates...', 'info');
    try {
      await CapacitorPedometer.stopMeasurementUpdates();
      addLog('stopMeasurementUpdates() completed', 'success');

      if (listener) {
        await listener.remove();
        setListener(null);
        addLog('Listener removed', 'success');
      }

      setState(prev => ({ ...prev, isTracking: false }));
    } catch (error: any) {
      addLog(`Stop tracking error: ${error.message || error}`, 'error');
    }
  }, [state.isTracking, listener, addLog]);

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

  const runFullTest = useCallback(async () => {
    addLog('=== STARTING FULL DIAGNOSTIC TEST ===', 'info');
    await checkAvailability();
    await new Promise(r => setTimeout(r, 500));
    await checkPermission();
    await new Promise(r => setTimeout(r, 500));
    addLog('=== DIAGNOSTIC TEST COMPLETE ===', 'info');
  }, [checkAvailability, checkPermission]);

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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg font-semibold">Pedometer Debug</h1>
          </div>
        </div>
      </div>

      <div className="pt-20 pb-8 px-4 space-y-4">
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
          </div>
        </motion.div>

        {/* Hardware Check */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Hardware Check</h2>
            </div>
            <Button size="sm" variant="outline" onClick={checkAvailability}>
              Check
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Plugin Available:</div>
            <div className={state.isAvailable === true ? 'text-green-500' : state.isAvailable === false ? 'text-red-500' : 'text-muted-foreground'}>
              {state.isAvailable === null ? 'Not checked' : state.isAvailable ? 'Yes' : 'No'}
            </div>
            <div className="text-muted-foreground">Step Counter:</div>
            <div className={state.stepCountingSupported === true ? 'text-green-500' : state.stepCountingSupported === false ? 'text-red-500' : 'text-muted-foreground'}>
              {state.stepCountingSupported === null ? 'Not checked' : state.stepCountingSupported ? 'Supported' : 'Not Supported'}
            </div>
          </div>
        </motion.div>

        {/* Permission Status */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Permission Status</h2>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={checkPermission}>
                Check
              </Button>
              <Button size="sm" variant="default" onClick={requestPermission}>
                Request
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Activity Recognition:</div>
            <div className={getStatusColor(state.permissionStatus)}>
              {state.permissionStatus || 'Not checked'}
            </div>
          </div>
        </motion.div>

        {/* Tracking Test */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Tracking Test</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="default" 
                onClick={startTracking}
                disabled={state.isTracking}
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={stopTracking}
                disabled={!state.isTracking}
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Status:</div>
            <div className={state.isTracking ? 'text-green-500' : 'text-muted-foreground'}>
              {state.isTracking ? '● Tracking Active' : '○ Not Tracking'}
            </div>
            <div className="text-muted-foreground">Last Steps:</div>
            <div className="font-mono">
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
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={runFullTest}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Run Full Test
            </Button>
            <Button size="sm" variant="outline" onClick={openAppSettings}>
              <Settings className="h-3 w-3 mr-1" />
              Open App Settings
            </Button>
            <Button size="sm" variant="ghost" onClick={clearLogs}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Logs
            </Button>
          </div>
        </motion.div>

        {/* Live Logs */}
        <motion.div
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Live Logs ({state.logs.length})</h2>
          </div>
          <div className="bg-background/50 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
            {state.logs.length === 0 ? (
              <div className="text-muted-foreground">No logs yet. Run a test to see output.</div>
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
