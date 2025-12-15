import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, PositionOptions, CallbackID } from '@capacitor/geolocation';

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
  
  const watchIdRef = useRef<CallbackID | null>(null);
  const lastPositionRef = useRef<LocationPoint | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      console.log('[LocationTracking] Requesting location permissions...');
      
      if (Capacitor.isNativePlatform()) {
        // Check current permission status
        const permStatus = await Geolocation.checkPermissions();
        console.log('[LocationTracking] Current permissions:', permStatus);
        
        if (permStatus.location !== 'granted') {
          console.log('[LocationTracking] Permission not granted, requesting...');
          const result = await Geolocation.requestPermissions();
          console.log('[LocationTracking] Permission request result:', result);
          
          if (result.location === 'granted' || result.coarseLocation === 'granted') {
            console.log('[LocationTracking] ✅ Location permission granted');
            return true;
          } else {
            console.log('[LocationTracking] ❌ Location permission denied');
            setError('Location permission denied');
            return false;
          }
        } else {
          console.log('[LocationTracking] ✅ Location permission already granted');
          return true;
        }
      } else {
        // Web fallback - use browser geolocation
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              console.log('[LocationTracking] ✅ Browser location permission granted');
              resolve(true);
            },
            (err) => {
              console.error('[LocationTracking] ❌ Browser location permission denied:', err);
              setError('Location permission denied');
              resolve(false);
            }
          );
        });
      }
    } catch (err) {
      console.error('[LocationTracking] Permission error:', err);
      setError('Failed to request location permission');
      return false;
    }
  };

  const handleNewPosition = useCallback((position: Position | null) => {
    if (!position) return;
    
    const newPoint: LocationPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: Date.now(),
    };

    console.log('[LocationTracking] New position:', newPoint);
    setCurrentPosition(newPoint);
    
    // Add to route if moved more than 5 meters (to filter GPS noise)
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        newPoint.latitude,
        newPoint.longitude
      );
      
      console.log(`[LocationTracking] Distance from last point: ${(distance * 1000).toFixed(1)}m`);
      
      // Only add point if moved more than 5 meters (0.005 km)
      if (distance > 0.005) {
        setRoutePoints(prev => [...prev, newPoint]);
        setGpsDistance(prev => prev + distance);
        lastPositionRef.current = newPoint;
        console.log(`[LocationTracking] ✅ Route point added. Total distance: ${(gpsDistance + distance).toFixed(2)} km`);
      }
    } else {
      // First point
      lastPositionRef.current = newPoint;
    }
  }, [gpsDistance]);

  const startTracking = useCallback(async () => {
    try {
      console.log('[LocationTracking] Starting tracking...');
      setError(null);
      
      const granted = await requestPermissions();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permission denied');
        console.error('[LocationTracking] ❌ Permission denied, cannot start tracking');
        return;
      }

      console.log('[LocationTracking] Getting initial position...');
      
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

      console.log('[LocationTracking] ✅ Initial position obtained:', initialPoint);
      setCurrentPosition(initialPoint);
      setRoutePoints([initialPoint]);
      lastPositionRef.current = initialPoint;
      setIsTracking(true);

      // Start watching position with CORRECTED callback syntax
      console.log('[LocationTracking] Starting position watch...');
      
      const watchOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      // CRITICAL FIX: Use correct Capacitor Geolocation API
      watchIdRef.current = await Geolocation.watchPosition(watchOptions, (position, err) => {
        if (err) {
          console.error('[LocationTracking] Watch error:', err);
          return;
        }
        if (position) {
          handleNewPosition(position);
        }
      });

      console.log('[LocationTracking] ✅ Watch started with ID:', watchIdRef.current);
      
    } catch (err) {
      console.error('[LocationTracking] Start error:', err);
      setError('Failed to start location tracking');
      setIsTracking(false);
    }
  }, [handleNewPosition]);

  const stopTracking = useCallback(() => {
    console.log('[LocationTracking] Stopping tracking...');
    
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch({ id: watchIdRef.current });
      console.log('[LocationTracking] ✅ Watch cleared:', watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    
    console.log(`[LocationTracking] Final stats - Distance: ${gpsDistance.toFixed(2)} km, Route points: ${routePoints.length}`);
  }, [gpsDistance, routePoints.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        console.log('[LocationTracking] Cleanup: Clearing watch on unmount');
        Geolocation.clearWatch({ id: watchIdRef.current });
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
