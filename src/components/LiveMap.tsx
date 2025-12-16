import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from '@/hooks/useLocationTracking';
import { Signal, SignalLow, SignalMedium, SignalHigh, Loader2 } from 'lucide-react';

// Fix Leaflet default marker icons issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LiveMapProps {
  currentPosition: LocationPoint | null;
  routePoints: LocationPoint[];
  isTracking: boolean;
  gpsAccuracy?: number | null;
}

// Component to handle map centering on position changes
const MapCenterController = ({ position }: { position: LocationPoint | null }) => {
  const map = useMap();
  const hasInitialCenter = useRef(false);

  useEffect(() => {
    if (position && !hasInitialCenter.current) {
      map.setView([position.latitude, position.longitude], 17);
      hasInitialCenter.current = true;
    } else if (position) {
      // Smoothly pan to new position
      map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.5 });
    }
  }, [position, map]);

  return null;
};

// Component to fix map size after render
const MapSizeController = () => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

// GPS Signal Quality Indicator
const GpsSignalIndicator = ({ accuracy }: { accuracy: number | null }) => {
  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  let SignalIcon = Signal;
  let colorClass = 'text-muted-foreground';
  
  if (accuracy !== null) {
    if (accuracy <= 10) {
      quality = 'excellent';
      SignalIcon = SignalHigh;
      colorClass = 'text-green-500';
    } else if (accuracy <= 25) {
      quality = 'good';
      SignalIcon = SignalMedium;
      colorClass = 'text-primary';
    } else if (accuracy <= 50) {
      quality = 'fair';
      SignalIcon = SignalLow;
      colorClass = 'text-yellow-500';
    } else {
      quality = 'poor';
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
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Delay rendering to ensure DOM is ready and prevent context errors
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Convert route points to Leaflet format
  const routeLatLngs = routePoints.map(point => [point.latitude, point.longitude] as [number, number]);

  // Default center (will be overridden when position is available)
  const defaultCenter: [number, number] = currentPosition 
    ? [currentPosition.latitude, currentPosition.longitude]
    : [52.52, 13.405]; // Berlin as fallback

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="absolute inset-0 rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 rounded-xl overflow-hidden" 
      style={{ height: '100%', width: '100%' }}
    >
      <MapContainer
        key="live-map-container"
        center={defaultCenter}
        zoom={17}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Dark theme map tiles - CartoDB Dark */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapCenterController position={currentPosition} />
        <MapSizeController />

        {/* Route polyline */}
        {routeLatLngs.length > 1 && (
          <Polyline
            positions={routeLatLngs}
            pathOptions={{
              color: '#00d4ff',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Current position marker */}
        {currentPosition && (
          <>
            {/* Outer glow / accuracy radius */}
            <CircleMarker
              center={[currentPosition.latitude, currentPosition.longitude]}
              radius={20}
              pathOptions={{
                color: '#00d4ff',
                fillColor: '#00d4ff',
                fillOpacity: 0.15,
                weight: 0,
              }}
            />
            {/* Inner dot */}
            <CircleMarker
              center={[currentPosition.latitude, currentPosition.longitude]}
              radius={8}
              pathOptions={{
                color: '#00d4ff',
                fillColor: '#00d4ff',
                fillOpacity: 1,
                weight: 2,
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Status overlay */}
      <div className="absolute top-4 left-4 z-[1000] rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {isTracking ? 'GPS Active' : 'GPS Ready'}
        </span>
        <div className="h-3 w-px bg-border/50" />
        <GpsSignalIndicator accuracy={gpsAccuracy ?? null} />
      </div>

      {/* Route distance indicator */}
      {routeLatLngs.length > 1 && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
          <span className="text-xs font-semibold text-foreground">
            {routeLatLngs.length} points
          </span>
        </div>
      )}
    </div>
  );
};

export default LiveMap;
