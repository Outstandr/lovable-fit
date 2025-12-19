import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface UseLocationTrackingReturn {
  currentPosition: LocationPoint | null;
  routePoints: LocationPoint[];
  gpsDistance: number; // in km
  currentSpeed: number; // in km/h
  avgSpeed: number; // in km/h
  maxSpeed: number; // in km/h
  gpsAccuracy: number | null; // in meters
  isTracking: boolean;
  isAcquiringGPS: boolean; // true while waiting for first GPS fix
  hasPermission: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  retryGPS: () => Promise<void>;
}

const LOG_PREFIX = '[GPS]';

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

// Calculate speed in km/h between two points
const calculateSpeed = (distance: number, timeDiffMs: number): number => {
  if (timeDiffMs <= 0) return 0;
  const hours = timeDiffMs / 3600000;
  return distance / hours;
};

export const useLocationTracking = (): UseLocationTrackingReturn => {
  const [currentPosition, setCurrentPosition] = useState<LocationPoint | null>(null);
  const [routePoints, setRoutePoints] = useState<LocationPoint[]>([]);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isAcquiringGPS, setIsAcquiringGPS] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const watchIdRef = useRef<string | null>(null);
  const lastPositionRef = useRef<LocationPoint | null>(null);
  const totalDistanceRef = useRef(0);
  const speedSamplesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      console.log(`${LOG_PREFIX} Requesting permissions...`);
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.checkPermissions();
        console.log(`${LOG_PREFIX} Current status:`, status);
        
        if (status.location === 'granted' || status.coarseLocation === 'granted') {
          return true;
        }
        
        const result = await Geolocation.requestPermissions();
        console.log(`${LOG_PREFIX} Permission result:`, result);
        return result.location === 'granted' || result.coarseLocation === 'granted';
      } else {
        // Web fallback
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false)
          );
        });
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Permission error:`, err);
      return false;
    }
  };

  const handleNewPosition = useCallback((position: Position) => {
    const accuracy = position.coords.accuracy;
    const speed = position.coords.speed;
    
    // Filter: Skip if accuracy > 50 meters
    if (accuracy && accuracy > 50) {
      console.log(`${LOG_PREFIX} Skipping low accuracy point: ${accuracy}m`);
      return;
    }

    const newPoint: LocationPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: Date.now(),
      accuracy: accuracy ?? undefined,
      speed: speed !== null ? speed * 3.6 : undefined, // Convert m/s to km/h
    };

    setCurrentPosition(newPoint);
    setGpsAccuracy(accuracy ?? null);
    
    // Update current speed from GPS if available
    if (speed !== null && speed >= 0) {
      const speedKmh = speed * 3.6;
      setCurrentSpeed(speedKmh);
      
      // Track max speed (filter unrealistic values > 50 km/h for walking)
      if (speedKmh <= 50 && speedKmh > maxSpeed) {
        setMaxSpeed(speedKmh);
      }
    }
    
    // Add to route if moved more than 5 meters
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        newPoint.latitude,
        newPoint.longitude
      );
      
      const timeDiff = newPoint.timestamp - lastPositionRef.current.timestamp;
      const calculatedSpeed = calculateSpeed(distance, timeDiff);
      
      // Filter: Skip if impossible speed (> 50 km/h for walking/running)
      if (calculatedSpeed > 50) {
        console.log(`${LOG_PREFIX} Skipping impossible speed: ${calculatedSpeed.toFixed(1)} km/h`);
        return;
      }
      
      // Only add point if moved more than 5 meters (0.005 km)
      if (distance > 0.005) {
        setRoutePoints(prev => [...prev, newPoint]);
        totalDistanceRef.current += distance;
        setGpsDistance(totalDistanceRef.current);
        lastPositionRef.current = newPoint;
        
        // Track speed for average calculation
        if (calculatedSpeed > 0 && calculatedSpeed <= 50) {
          speedSamplesRef.current.push(calculatedSpeed);
          const avg = speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
          setAvgSpeed(avg);
        }
        
        console.log(`${LOG_PREFIX} Added point: ${distance.toFixed(3)}km, total: ${totalDistanceRef.current.toFixed(3)}km`);
      }
    } else {
      lastPositionRef.current = newPoint;
    }
  }, [maxSpeed]);

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      setIsAcquiringGPS(true);
      console.log(`${LOG_PREFIX} Starting GPS tracking...`);
      
      const granted = await requestPermissions();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permission denied');
        setIsAcquiringGPS(false);
        console.log(`${LOG_PREFIX} Permission denied`);
        return;
      }

      // Reset state
      totalDistanceRef.current = 0;
      speedSamplesRef.current = [];
      startTimeRef.current = Date.now();
      setGpsDistance(0);
      setCurrentSpeed(0);
      setAvgSpeed(0);
      setMaxSpeed(0);
      setRoutePoints([]);

      // Get initial position with 30 second timeout
      console.log(`${LOG_PREFIX} Getting initial position (30s timeout)...`);
      const initialPosition = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
      });

      const initialPoint: LocationPoint = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        timestamp: Date.now(),
        accuracy: initialPosition.coords.accuracy ?? undefined,
      };

      console.log(`${LOG_PREFIX} Initial position:`, initialPoint);
      setCurrentPosition(initialPoint);
      setRoutePoints([initialPoint]);
      setGpsAccuracy(initialPosition.coords.accuracy ?? null);
      lastPositionRef.current = initialPoint;
      setIsTracking(true);
      setIsAcquiringGPS(false);

      // Start watching position with 30 second timeout
      if (Capacitor.isNativePlatform()) {
        watchIdRef.current = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0,
          },
          (position: Position | null, err) => {
            if (err) {
              console.error(`${LOG_PREFIX} Watch error:`, err);
              return;
            }
            if (position) {
              handleNewPosition(position);
            }
          }
        );
        console.log(`${LOG_PREFIX} Watch started, ID:`, watchIdRef.current);
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
          (err) => console.error(`${LOG_PREFIX} Web watch error:`, err),
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
        watchIdRef.current = webWatchId.toString();
      }
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Start error:`, err);
      setIsAcquiringGPS(false);
      if (err?.message?.includes('timeout') || err?.code === 3) {
        setError('GPS timeout - could not acquire signal');
      } else {
        setError('Failed to start location tracking');
      }
    }
  }, [handleNewPosition]);

  const retryGPS = useCallback(async () => {
    console.log(`${LOG_PREFIX} Retrying GPS...`);
    setError(null);
    setCurrentPosition(null);
    await startTracking();
  }, [startTracking]);

  const stopTracking = useCallback(() => {
    console.log(`${LOG_PREFIX} Stopping GPS tracking...`);
    if (watchIdRef.current !== null) {
      if (Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      } else {
        navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
      }
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setCurrentSpeed(0);
    console.log(`${LOG_PREFIX} Tracking stopped`);
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
    currentSpeed,
    avgSpeed,
    maxSpeed,
    gpsAccuracy,
    isTracking,
    isAcquiringGPS,
    hasPermission,
    error,
    startTracking,
    stopTracking,
    retryGPS,
  };
};
