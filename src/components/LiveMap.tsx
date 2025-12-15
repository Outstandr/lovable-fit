import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from '@/hooks/useLocationTracking';

// Fix Leaflet default marker icons
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

const MapCenterController = ({ position }: { position: LocationPoint | null }) => {
  const map = useMap();
  const hasInitialCenter = useRef(false);

  useEffect(() => {
    if (position && !hasInitialCenter.current) {
      map.setView([position.latitude, position.longitude], 17);
      hasInitialCenter.current = true;
    } else if (position) {
      map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.5 });
    }
  }, [position, map]);

  return null;
};

const LiveMap = ({ currentPosition, routePoints, isTracking }: LiveMapProps) => {
  const routeLatLngs = routePoints.map(point => [point.latitude, point.longitude] as [number, number]);

  const defaultCenter: [number, number] = currentPosition 
    ? [currentPosition.latitude, currentPosition.longitude]
    : [0, 0];

  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={17}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={true}
      >
        {/* Free OpenStreetMap tiles - No API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapCenterController position={currentPosition} />

        {/* Route line */}
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

      {/* Status indicator */}
      <div className="absolute top-4 left-4 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {isTracking ? '📍 GPS Active' : '📍 GPS Ready'}
        </span>
      </div>

      {/* OpenStreetMap attribution (required by OSM) */}
      <div className="absolute bottom-2 right-2 text-[8px] text-muted-foreground/70 bg-background/60 px-1 rounded">
        Map data © OSM
      </div>
    </div>
  );
};

export default LiveMap;
