import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from '@/hooks/useLocationTracking';

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

const LiveMap = ({ currentPosition, routePoints, isTracking }: LiveMapProps) => {
  // Convert route points to Leaflet format
  const routeLatLngs = routePoints.map(point => [point.latitude, point.longitude] as [number, number]);

  // Default center (will be overridden when position is available)
  const defaultCenter: [number, number] = currentPosition 
    ? [currentPosition.latitude, currentPosition.longitude]
    : [52.52, 13.405]; // Berlin as fallback

  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={17}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        {/* Dark theme map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapCenterController position={currentPosition} />

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
            {/* Outer glow */}
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

      {/* Tracking status overlay */}
      <div className="absolute top-4 left-4 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {isTracking ? 'GPS Tracking Active' : 'GPS Ready'}
        </span>
      </div>
    </div>
  );
};

export default LiveMap;
