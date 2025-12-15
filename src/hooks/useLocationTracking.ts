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
  gpsDistance: number;
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
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
      console.log('[LocationTracking] Checking permissions...');
      
      if (Capacitor.isNativePlatform()) {
        const permStatus = await Geolocation.checkPermissions();
        console.log('[LocationTracking] Current permissions:', permStatus);
        
        if (permStatus.location !== 'granted') {
          console.log('[LocationTracking] Requesting permissions...');
          
          // Add delay to prevent crash if called right after activity permission
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const result = await Geolocation.requestPermissions();
          console.log('[LocationTracking] Permission result:', result);
          
          if (result.location === 'granted' || result.coarseLocation === 'granted') {
            console.log('[LocationTracking] ✅ Permission granted');
            return true;
          } else {
            console.log('[LocationTracking] ❌ Permission denied');
            setError('Location permission denied');
            return false;
          }
        } else {
          console.log('[LocationTracking] ✅ Permission already granted');
          return true;
        }
      }
      return true;
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
    
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        newPoint.latitude,
        newPoint.longitude
      );
      
      console.log(`[LocationTracking] Distance: ${(distance * 1000).toFixed(1)}m`);
      
      if (distance > 0.005) {
        setRoutePoints(prev => [...prev, newPoint]);
        setGpsDistance(prev => {
          const newDistance = prev + distance;
          console.log(`[LocationTracking] ✅ Total distance: ${newDistance.toFixed(2)} km`);
          return newDistance;
        });
        lastPositionRef.current = newPoint;
      }
    } else {
      lastPositionRef.current = newPoint;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      console.log('[LocationTracking] Starting tracking...');
      setError(null);
      
      const granted = await requestPermissions();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permission denied');
        console.error('[LocationTracking] ❌ Permission denied');
        return;
      }

      console.log('[LocationTracking] Getting initial position...');
      
      const initialPosition = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const initialPoint: LocationPoint = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        timestamp: Date.now(),
      };

      console.log('[LocationTracking] ✅ Initial position:', initialPoint);
      setCurrentPosition(initialPoint);
      setRoutePoints([initialPoint]);
      lastPositionRef.current = initialPoint;
      setIsTracking(true);

      console.log('[LocationTracking] Starting position watch...');
      
      const watchOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      watchIdRef.current = await Geolocation.watchPosition(
        watchOptions,
        (position, err) => {
          if (err) {
            console.error('[LocationTracking] Watch error:', err);
            return;
          }
          if (position) {
            handleNewPosition(position);
          }
        }
      );

      console.log('[LocationTracking] ✅ Watch started, ID:', watchIdRef.current);
      
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
    
    console.log(`[LocationTracking] Final: ${gpsDistance.toFixed(2)} km, ${routePoints.length} points`);
  }, [gpsDistance, routePoints.length]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        console.log('[LocationTracking] Cleanup on unmount');
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
