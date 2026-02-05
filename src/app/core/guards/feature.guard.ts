import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { TenantFeatureService } from '../services/tenant-feature.service';
import { AuthService } from '../services/auth';
import { FeatureCode } from '../interfaces/dto/tenant-dto';

/**
 * Feature-based guard that checks if the requested feature is enabled for the current tenant.
 * Usage in routes:
 *   canActivate: [featureGuard('gallery')]
 *   canActivate: [featureGuard('ai_assistant')]
 */
export const featureGuard = (requiredFeature: FeatureCode | string): CanActivateFn => {
  return () => {
    const featureService = inject(TenantFeatureService);
    const authService = inject(AuthService);
    const router = inject(Router);

    // SuperAdmin has access to all features
    if (authService.isSuperAdmin()) {
      return true;
    }

    // Check if features are already loaded
    const cachedFeatures = featureService.getEnabledFeatures();
    if (cachedFeatures.length > 0) {
      if (cachedFeatures.includes(requiredFeature)) {
        return true;
      }
      return router.createUrlTree(['/403']);
    }

    // Load features and check
    return featureService.loadFeaturesIfNeeded().pipe(
      map(features => {
        if (features.includes(requiredFeature)) {
          return true;
        }
        return router.createUrlTree(['/403']);
      }),
      catchError(() => {
        // If there's an error loading features, deny access (fail closed for security)
        // Users will be redirected to 403 and can try again
        return of(router.createUrlTree(['/403']));
      })
    );
  };
};

/**
 * Guard that requires multiple features to be enabled (AND logic).
 * Usage in routes:
 *   canActivate: [featuresGuard('gallery', 'events')]
 */
export const featuresGuard = (...requiredFeatures: (FeatureCode | string)[]): CanActivateFn => {
  return () => {
    const featureService = inject(TenantFeatureService);
    const authService = inject(AuthService);
    const router = inject(Router);

    // SuperAdmin has access to all features
    if (authService.isSuperAdmin()) {
      return true;
    }

    // Check if features are already loaded
    const cachedFeatures = featureService.getEnabledFeatures();
    if (cachedFeatures.length > 0) {
      const allEnabled = requiredFeatures.every(f => cachedFeatures.includes(f));
      if (allEnabled) {
        return true;
      }
      return router.createUrlTree(['/403']);
    }

    // Load features and check
    return featureService.loadFeaturesIfNeeded().pipe(
      map(features => {
        const allEnabled = requiredFeatures.every(f => features.includes(f));
        if (allEnabled) {
          return true;
        }
        return router.createUrlTree(['/403']);
      }),
      catchError(() => {
        // If there's an error loading features, deny access (fail closed for security)
        return of(router.createUrlTree(['/403']));
      })
    );
  };
};

/**
 * Guard that requires at least one of the specified features (OR logic).
 * Usage in routes:
 *   canActivate: [anyFeatureGuard('ai_assistant', 'basic_ai')]
 */
export const anyFeatureGuard = (...requiredFeatures: (FeatureCode | string)[]): CanActivateFn => {
  return () => {
    const featureService = inject(TenantFeatureService);
    const authService = inject(AuthService);
    const router = inject(Router);

    // SuperAdmin has access to all features
    if (authService.isSuperAdmin()) {
      return true;
    }

    // Check if features are already loaded
    const cachedFeatures = featureService.getEnabledFeatures();
    if (cachedFeatures.length > 0) {
      const anyEnabled = requiredFeatures.some(f => cachedFeatures.includes(f));
      if (anyEnabled) {
        return true;
      }
      return router.createUrlTree(['/403']);
    }

    // Load features and check
    return featureService.loadFeaturesIfNeeded().pipe(
      map(features => {
        const anyEnabled = requiredFeatures.some(f => features.includes(f));
        if (anyEnabled) {
          return true;
        }
        return router.createUrlTree(['/403']);
      }),
      catchError(() => {
        // If there's an error loading features, deny access (fail closed for security)
        return of(router.createUrlTree(['/403']));
      })
    );
  };
};
