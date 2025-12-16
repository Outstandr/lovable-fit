import { useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Polyline, Circle } from '@react-google-maps/api';
import { LocationPoint } from '@/hooks/useLocationTracking';
import { Signal, SignalLow, SignalMedium, SignalHigh, Loader2, AlertTriangle } from 'lucide-react';

interface LiveMapProps {
  currentPosition: LocationPoint | null;
  routePoints: LocationPoint[];
  isTracking: boolean;
  gpsAccuracy?: number | null;
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

const LiveMap = ({ currentPosition, routePoints, isTracking, gpsAccuracy }: LiveMapProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasInitialCenter = useRef(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
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
  if (currentPosition && mapRef.current) {
    onPositionChange();
  }

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

  // Error state
  if (loadError) {
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <span className="text-sm font-medium text-foreground">Map Load Error</span>
          <span className="text-xs text-muted-foreground">Check your Google Maps API key</span>
        </div>
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

export default LiveMap;
