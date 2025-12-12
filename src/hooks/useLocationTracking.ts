import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface UseLocationTrackingReturn {
  currentPosition: LocationPoint | null;
  routePoints: LocationPoint[];
  gpsDistance: number; // in km
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

// Calculate distance between two GPS points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useLocationTracking = (): UseLocationTrackingReturn => {
  const [currentPosition, setCurrentPosition] = useState<LocationPoint | null>(null);
  const [routePoints, setRoutePoints] = useState<LocationPoint[]>([]);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const watchIdRef = useRef<string | null>(null);
  const lastPositionRef = useRef<LocationPoint | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.requestPermissions();
        return status.location === 'granted';
      } else {
        // Web fallback - use browser geolocation
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false)
          );
        });
      }
    } catch (err) {
      console.error('[LocationTracking] Permission error:', err);
      return false;
    }
  };

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      const granted = await requestPermissions();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permission denied');
        return;
      }

      // Get initial position
      const initialPosition = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const initialPoint: LocationPoint = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        timestamp: Date.now(),
      };

      setCurrentPosition(initialPoint);
      setRoutePoints([initialPoint]);
      lastPositionRef.current = initialPoint;
      setIsTracking(true);

      // Start watching position
      if (Capacitor.isNativePlatform()) {
        watchIdRef.current = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          },
          (position: Position | null, err) => {
            if (err) {
              console.error('[LocationTracking] Watch error:', err);
              return;
            }
            if (position) {
              handleNewPosition(position);
            }
          }
        );
      } else {
        // Web fallback
        const webWatchId = navigator.geolocation.watchPosition(
          (position) => {
            handleNewPosition({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              },
              timestamp: position.timestamp,
            });
          },
          (err) => console.error('[LocationTracking] Web watch error:', err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        watchIdRef.current = webWatchId.toString();
      }
    } catch (err) {
      console.error('[LocationTracking] Start error:', err);
      setError('Failed to start location tracking');
    }
  }, []);

  const handleNewPosition = (position: Position) => {
    const newPoint: LocationPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: Date.now(),
    };

    setCurrentPosition(newPoint);
    
    // Add to route if moved more than 5 meters (to filter GPS noise)
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        newPoint.latitude,
        newPoint.longitude
      );
      
      // Only add point if moved more than 5 meters (0.005 km)
      if (distance > 0.005) {
        setRoutePoints(prev => [...prev, newPoint]);
        setGpsDistance(prev => prev + distance);
        lastPositionRef.current = newPoint;
      }
    }
  };

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      if (Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      } else {
        navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
      }
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current });
        } else {
          navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
        }
      }
    };
  }, []);

  return {
    currentPosition,
    routePoints,
    gpsDistance,
    isTracking,
    hasPermission,
    error,
    startTracking,
    stopTracking,
  };
};
