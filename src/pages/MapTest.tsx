import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LiveMap from '@/components/LiveMap';
import { LocationPoint } from '@/hooks/useLocationTracking';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const MapTest = () => {
  const [apiKeyStatus, setApiKeyStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [apiKeyPreview, setApiKeyPreview] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Hardcoded test position (Berlin)
  const testPosition: LocationPoint = {
    latitude: 52.52,
    longitude: 13.405,
    timestamp: Date.now(),
    accuracy: 10,
  };

  // Sample route points for testing polyline
  const testRoutePoints: LocationPoint[] = [
    { latitude: 52.5186, longitude: 13.4010, timestamp: Date.now() - 5000 },
    { latitude: 52.5190, longitude: 13.4020, timestamp: Date.now() - 4000 },
    { latitude: 52.5195, longitude: 13.4030, timestamp: Date.now() - 3000 },
    { latitude: 52.5200, longitude: 13.4050, timestamp: Date.now() - 2000 },
    { latitude: 52.52, longitude: 13.405, timestamp: Date.now() },
  ];

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        console.log('[MapTest] Fetching API key from public-config...');
        const { data, error } = await supabase.functions.invoke('public-config');
        
        console.log('[MapTest] Response:', { data, error });
        
        if (error) {
          setApiKeyStatus('failed');
          setErrorMessage(`Edge function error: ${error.message}`);
          return;
        }
        
        if (data?.googleMapsApiKey) {
          const key = String(data.googleMapsApiKey);
          setApiKeyStatus('success');
          setApiKeyPreview(`${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
          console.log('[MapTest] API key loaded successfully');
        } else {
          setApiKeyStatus('failed');
          setErrorMessage('No googleMapsApiKey in response');
        }
      } catch (err) {
        console.error('[MapTest] Exception:', err);
        setApiKeyStatus('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchApiKey();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Map API Test</h1>
      </div>

      {/* Debug Panel */}
      <div className="p-4 bg-secondary/50 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Debug Info</h2>
        
        <div className="space-y-2">
          {/* API Key Status */}
          <div className="flex items-center gap-2">
            {apiKeyStatus === 'loading' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {apiKeyStatus === 'success' && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {apiKeyStatus === 'failed' && (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">API Key:</span>
            <span className="text-sm font-mono text-foreground">
              {apiKeyStatus === 'loading' && 'Loading...'}
              {apiKeyStatus === 'success' && apiKeyPreview}
              {apiKeyStatus === 'failed' && 'Failed'}
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2">
              <p className="text-xs text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* Test Position */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Test Position:</span>
            <span className="text-sm font-mono text-foreground">
              {testPosition.latitude.toFixed(4)}, {testPosition.longitude.toFixed(4)}
            </span>
          </div>

          {/* Route Points */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Route Points:</span>
            <span className="text-sm font-mono text-foreground">
              {testRoutePoints.length} points
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-[400px]">
        <LiveMap
          currentPosition={testPosition}
          routePoints={testRoutePoints}
          isTracking={true}
          gpsAccuracy={10}
          sessionSteps={1234}
          sessionDistance={0.85}
        />
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-secondary/30 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          If you see "For development purposes only" watermark, the Google Maps API key needs billing enabled in Google Cloud Console.
        </p>
      </div>
    </div>
  );
};

export default MapTest;
