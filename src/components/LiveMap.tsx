import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, useLoadScript, Polyline, Circle } from '@react-google-maps/api';
import { LocationPoint } from '@/hooks/useLocationTracking';
import { Signal, SignalLow, SignalMedium, SignalHigh, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MapPlaceholder from './MapPlaceholder';

interface LiveMapProps {
  currentPosition: LocationPoint | null;
  routePoints: LocationPoint[];
  isTracking: boolean;
  gpsAccuracy?: number | null;
  sessionSteps?: number;
  sessionDistance?: number;
}

// Dark theme map styles matching Midnight Ops aesthetic
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#38414e' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#38414e' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#1b3a34' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#447530' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a5568' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2a38' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0b8c1' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 52.52, lng: 13.405 }; // Berlin as fallback

// GPS Signal Quality Indicator
const GpsSignalIndicator = ({ accuracy }: { accuracy: number | null }) => {
  let SignalIcon = Signal;
  let colorClass = 'text-muted-foreground';
  
  if (accuracy !== null) {
    if (accuracy <= 10) {
      SignalIcon = SignalHigh;
      colorClass = 'text-green-500';
    } else if (accuracy <= 25) {
      SignalIcon = SignalMedium;
      colorClass = 'text-primary';
    } else if (accuracy <= 50) {
      SignalIcon = SignalLow;
      colorClass = 'text-yellow-500';
    } else {
      SignalIcon = Signal;
      colorClass = 'text-destructive';
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <SignalIcon className={`h-3.5 w-3.5 ${colorClass}`} />
      <span className="text-[10px] uppercase tracking-wider">
        {accuracy !== null ? `${Math.round(accuracy)}m` : 'N/A'}
      </span>
    </div>
  );
};

// Inner component that uses useLoadScript - only mounted when API key is ready
interface LiveMapContentProps extends LiveMapProps {
  apiKey: string;
  onRetry: () => void;
}

const LiveMapContent = ({ 
  currentPosition, 
  routePoints, 
  isTracking, 
  gpsAccuracy, 
  sessionSteps = 0, 
  sessionDistance = 0,
  apiKey,
  onRetry,
}: LiveMapContentProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasInitialCenter = useRef(false);

  // useLoadScript is now only called ONCE with a valid API key
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  console.log('[LiveMapContent] useLoadScript state:', { isLoaded, loadError: loadError?.message, apiKeyPrefix: apiKey.substring(0, 10) });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    console.log('[LiveMapContent] Map loaded successfully');
    mapRef.current = map;
  }, []);

  // Pan to current position when it updates
  const onPositionChange = useCallback(() => {
    if (!mapRef.current || !currentPosition) return;

    const newCenter = { lat: currentPosition.latitude, lng: currentPosition.longitude };
    
    if (!hasInitialCenter.current) {
      mapRef.current.setCenter(newCenter);
      hasInitialCenter.current = true;
    } else {
      mapRef.current.panTo(newCenter);
    }
  }, [currentPosition]);

  // Effect to pan map when position changes
  useEffect(() => {
    if (currentPosition && mapRef.current) {
      onPositionChange();
    }
  }, [currentPosition, onPositionChange]);

  // Convert route points to Google Maps format
  const routePath = routePoints.map(point => ({
    lat: point.latitude,
    lng: point.longitude,
  }));

  const center = currentPosition 
    ? { lat: currentPosition.latitude, lng: currentPosition.longitude }
    : defaultCenter;

  // Loading state
  if (!isLoaded) {
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading map...</span>
        </div>
      </div>
    );
  }

  // Map load error - show placeholder with retry
  if (loadError) {
    console.log('[LiveMapContent] Load error:', loadError);
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <MapPlaceholder 
          message="Map failed to load"
          sessionSteps={sessionSteps}
          sessionDistance={sessionDistance}
          showStepsFallback={true}
        />
        <button
          onClick={onRetry}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-primary/20 backdrop-blur-sm px-3 py-2 border border-primary/30 hover:bg-primary/30 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ height: '100%', width: '100%' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={17}
        onLoad={onMapLoad}
        options={{
          styles: darkMapStyles,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Route polyline */}
        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#00d4ff',
              strokeWeight: 4,
              strokeOpacity: 0.9,
            }}
          />
        )}

        {/* Current position marker - outer glow */}
        {currentPosition && (
          <>
            <Circle
              center={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
              radius={25}
              options={{
                strokeColor: '#00d4ff',
                strokeOpacity: 0,
                strokeWeight: 0,
                fillColor: '#00d4ff',
                fillOpacity: 0.15,
              }}
            />
            {/* Inner marker */}
            <Circle
              center={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
              radius={8}
              options={{
                strokeColor: '#ffffff',
                strokeOpacity: 1,
                strokeWeight: 2,
                fillColor: '#00d4ff',
                fillOpacity: 1,
              }}
            />
          </>
        )}
      </GoogleMap>

      {/* Status overlay */}
      <div className="absolute top-4 left-4 z-10 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {isTracking ? 'GPS Active' : 'GPS Ready'}
        </span>
        <div className="h-3 w-px bg-border/50" />
        <GpsSignalIndicator accuracy={gpsAccuracy ?? null} />
      </div>

      {/* Route points indicator */}
      {routePath.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
          <span className="text-xs font-semibold text-foreground">
            {routePath.length} points
          </span>
        </div>
      )}
    </div>
  );
};

// Wrapper component that handles API key fetching
const LiveMap = ({ currentPosition, routePoints, isTracking, gpsAccuracy, sessionSteps = 0, sessionDistance = 0 }: LiveMapProps) => {
  // Online/Offline detection
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [apiKeyFailed, setApiKeyFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [isLoadingKey, setIsLoadingKey] = useState(!apiKey);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch API key from backend
  useEffect(() => {
    console.log('[LiveMap] API key effect triggered', { 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey?.length,
      isOnline, 
      retryCount 
    });
    
    if (apiKey) {
      console.log('[LiveMap] Already have API key, skipping fetch');
      setIsLoadingKey(false);
      return;
    }
    
    if (!isOnline) {
      console.log('[LiveMap] Offline, skipping fetch');
      setIsLoadingKey(false);
      return;
    }

    setIsLoadingKey(true);
    let cancelled = false;
    
    (async () => {
      try {
        console.log('[LiveMap] Fetching API key from public-config...');
        const { data, error } = await supabase.functions.invoke('public-config');
        console.log('[LiveMap] public-config response:', { 
          data: data ? { ...data, googleMapsApiKey: data.googleMapsApiKey ? `${String(data.googleMapsApiKey).substring(0, 10)}...` : 'missing' } : null, 
          error 
        });
        
        if (!cancelled && !error && data?.googleMapsApiKey) {
          const key = String(data.googleMapsApiKey);
          console.log('[LiveMap] API key loaded successfully:', key.substring(0, 10) + '...');
          setApiKey(key);
          setApiKeyFailed(false);
        } else if (!cancelled) {
          console.log('[LiveMap] API key failed - no key in response or error:', { error, hasData: !!data });
          setApiKeyFailed(true);
        }
      } catch (err) {
        console.log('[LiveMap] Exception fetching API key:', err);
        if (!cancelled) setApiKeyFailed(true);
      } finally {
        if (!cancelled) setIsLoadingKey(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, isOnline, retryCount]);

  const handleRetry = useCallback(() => {
    console.log('[LiveMap] Retry triggered');
    setApiKey('');
    setApiKeyFailed(false);
    setRetryCount(c => c + 1);
  }, []);

  // Offline fallback - show placeholder with session stats
  if (!isOnline) {
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <MapPlaceholder 
          message="Offline - Using step tracking"
          sessionSteps={sessionSteps}
          sessionDistance={sessionDistance}
          showStepsFallback={true}
        />
        <div className="absolute top-4 left-4 z-10 rounded-lg bg-destructive/20 backdrop-blur-sm px-3 py-1.5 border border-destructive/30 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-destructive">Offline</span>
        </div>
      </div>
    );
  }

  // Loading API key
  if (isLoadingKey) {
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Initializing map...</span>
        </div>
      </div>
    );
  }

  // API key failed or missing - show placeholder with retry
  if (!apiKey || apiKeyFailed) {
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <MapPlaceholder 
          message="Map unavailable - Using step tracking"
          sessionSteps={sessionSteps}
          sessionDistance={sessionDistance}
          showStepsFallback={true}
        />
        <button
          onClick={handleRetry}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-primary/20 backdrop-blur-sm px-3 py-2 border border-primary/30 hover:bg-primary/30 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Retry</span>
        </button>
      </div>
    );
  }

  // Only render the map content component when we have a valid API key
  // This ensures useLoadScript is only called once with the valid key
  return (
    <LiveMapContent
      currentPosition={currentPosition}
      routePoints={routePoints}
      isTracking={isTracking}
      gpsAccuracy={gpsAccuracy}
      sessionSteps={sessionSteps}
      sessionDistance={sessionDistance}
      apiKey={apiKey}
      onRetry={handleRetry}
    />
  );
};

export default LiveMap;
