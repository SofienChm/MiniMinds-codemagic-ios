import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  retries?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    return 'geolocation' in navigator;
  }

  /**
   * Check if we're on a native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Request location permissions (native only)
   */
  async requestPermissions(): Promise<PermissionStatus> {
    if (Capacitor.isNativePlatform()) {
      return await Geolocation.requestPermissions();
    }
    // For web, permission is requested when getting position
    return { location: 'granted', coarseLocation: 'granted' };
  }

  /**
   * Check current permission status (native only)
   */
  async checkPermissions(): Promise<PermissionStatus> {
    if (Capacitor.isNativePlatform()) {
      return await Geolocation.checkPermissions();
    }
    return { location: 'granted', coarseLocation: 'granted' };
  }

  /**
   * Get the current position - uses native plugin on mobile, browser API on web
   * Includes retry logic and longer timeout for reliability
   */
  getCurrentPosition(options?: GeolocationOptions): Observable<GeolocationPosition> {
    if (!this.isSupported()) {
      return throwError(() => ({
        code: 0,
        message: 'Geolocation is not supported'
      } as GeolocationError));
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: false, // Low accuracy is faster and sufficient for geofencing
      timeout: 10000, // 10 seconds - faster timeout
      maximumAge: 60000, // Allow cached position up to 1 minute old for speed
      retries: 1
    };

    const mergedOptions = { ...defaultOptions, ...options };

    if (Capacitor.isNativePlatform()) {
      return this.getNativePosition(mergedOptions);
    } else {
      return this.getWebPosition(mergedOptions);
    }
  }

  /**
   * Helper to add timeout to any promise
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMsg)), ms)
      )
    ]);
  }

  /**
   * Get position using Capacitor's native Geolocation plugin
   */
  private getNativePosition(options: GeolocationOptions): Observable<GeolocationPosition> {
    return new Observable<GeolocationPosition>((observer) => {
      let isCancelled = false;
      const timeout = options.timeout || 10000;

      const getPosition = async () => {
        try {
          // First check/request permissions with short timeout
          let permStatus;
          try {
            permStatus = await this.withTimeout(
              Geolocation.checkPermissions(),
              3000, // 3 seconds for permission check
              'Permission check timed out'
            );
          } catch (permCheckError) {
            console.warn('Permission check failed, trying to request directly:', permCheckError);
            permStatus = { location: 'prompt', coarseLocation: 'prompt' };
          }

          if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
            try {
              permStatus = await this.withTimeout(
                Geolocation.requestPermissions(),
                5000, // 5 seconds for permission request
                'Permission request timed out'
              );
            } catch (permReqError) {
              console.warn('Permission request failed:', permReqError);
              if (!isCancelled) {
                observer.error({
                  code: 1,
                  message: 'Location permission request failed. Please enable location in Settings.'
                } as GeolocationError);
              }
              return;
            }
          }

          if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
            if (!isCancelled) {
              observer.error({
                code: 1,
                message: 'Location permission denied. Please enable location in Settings.'
              } as GeolocationError);
            }
            return;
          }

          // Get position - single attempt with configured timeout
          try {
            const position = await this.withTimeout(
              Geolocation.getCurrentPosition({
                enableHighAccuracy: options.enableHighAccuracy,
                timeout: timeout,
                maximumAge: options.maximumAge
              }),
              timeout + 2000, // Small buffer
              'Location request timed out'
            );

            if (!isCancelled) {
              observer.next({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
              observer.complete();
            }
          } catch (locationError: any) {
            if (!isCancelled) {
              observer.error(this.parseNativeError(locationError));
            }
          }
        } catch (error: any) {
          if (!isCancelled) {
            observer.error(this.parseNativeError(error));
          }
        }
      };

      getPosition();

      // Cleanup function
      return () => {
        isCancelled = true;
      };
    });
  }

  /**
   * Get position using browser's Geolocation API
   */
  private getWebPosition(options: GeolocationOptions): Observable<GeolocationPosition> {
    return new Observable<GeolocationPosition>((observer) => {
      let watchId: number | null = null;

      // First try with getCurrentPosition
      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          observer.complete();
        },
        (error) => {
          // If immediate position fails, try watching for a position
          if (error.code === error.TIMEOUT) {
            console.warn('Initial position timed out, trying watch...');

            watchId = navigator.geolocation.watchPosition(
              (position) => {
                if (watchId !== null) {
                  navigator.geolocation.clearWatch(watchId);
                  watchId = null;
                }
                observer.next({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy
                });
                observer.complete();
              },
              (watchError) => {
                observer.error(this.parseWebError(watchError));
              },
              {
                enableHighAccuracy: false, // Try low accuracy
                timeout: options.timeout,
                maximumAge: 30000 // Accept older positions
              }
            );

            // Clear watch after timeout
            setTimeout(() => {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                observer.error({
                  code: 3,
                  message: 'Location request timed out. Please ensure location services are enabled.'
                } as GeolocationError);
              }
            }, options.timeout || 30000);
          } else {
            observer.error(this.parseWebError(error));
          }
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );

      // Cleanup
      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    });
  }

  /**
   * Parse native Capacitor geolocation error
   */
  private parseNativeError(error: any): GeolocationError {
    const message = error?.message || error?.toString() || 'Unknown location error';

    if (message.includes('permission') || message.includes('denied')) {
      return {
        code: 1,
        message: 'Location permission denied. Please enable location access in your device settings.'
      };
    }

    if (message.includes('unavailable') || message.includes('Location services')) {
      return {
        code: 2,
        message: 'Location unavailable. Please ensure location services are enabled on your device.'
      };
    }

    if (message.includes('timeout')) {
      return {
        code: 3,
        message: 'Location request timed out. Please try again or move to an area with better GPS signal.'
      };
    }

    return {
      code: 0,
      message: message
    };
  }

  /**
   * Parse web Geolocation API error
   */
  private parseWebError(error: GeolocationPositionError): GeolocationError {
    let message = 'Unknown error';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable. Please try again.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
    }

    return { code: error.code, message };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if a position is within a specified radius
   */
  isWithinRadius(
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon);
    return distance <= radiusMeters;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
