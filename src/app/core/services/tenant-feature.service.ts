import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, of } from 'rxjs';
import { ApiConfig } from '../config/api.config';
import {
  TenantFeature,
  TenantFeaturesResponse,
  FeatureToggle,
  UpdateTenantFeaturesRequest,
  AvailableFeature,
  FeatureCode
} from '../interfaces/dto/tenant-dto';

@Injectable({
  providedIn: 'root'
})
export class TenantFeatureService {
  private apiUrl = ApiConfig.ENDPOINTS.TENANT_FEATURES;

  // Cache for current user's enabled features
  private enabledFeaturesSubject = new BehaviorSubject<string[]>([]);
  public enabledFeatures$ = this.enabledFeaturesSubject.asObservable();
  private featuresLoaded = false;

  constructor(private http: HttpClient) {}

  /**
   * Get all available features (SuperAdmin only)
   */
  getAvailableFeatures(): Observable<AvailableFeature[]> {
    return this.http.get<AvailableFeature[]>(`${this.apiUrl}/available`);
  }

  /**
   * Get features for a specific tenant (SuperAdmin only)
   */
  getTenantFeatures(tenantId: number): Observable<TenantFeaturesResponse> {
    return this.http.get<TenantFeaturesResponse>(`${this.apiUrl}/tenant/${tenantId}`);
  }

  /**
   * Update features for a specific tenant (SuperAdmin only)
   */
  updateTenantFeatures(tenantId: number, request: UpdateTenantFeaturesRequest): Observable<TenantFeaturesResponse> {
    return this.http.put<TenantFeaturesResponse>(`${this.apiUrl}/tenant/${tenantId}`, request);
  }

  /**
   * Toggle a single feature for a tenant (SuperAdmin only)
   */
  toggleFeature(tenantId: number, featureCode: string, isEnabled: boolean): Observable<any> {
    const toggle: FeatureToggle = { featureCode, isEnabled };
    return this.http.patch(`${this.apiUrl}/tenant/${tenantId}/toggle`, toggle);
  }

  /**
   * Initialize default features for a tenant (SuperAdmin only)
   */
  initializeFeatures(tenantId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenant/${tenantId}/initialize`, {});
  }

  /**
   * Get enabled features for the current user's tenant
   * Used by guards and sidebar to determine access
   */
  getMyFeatures(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/my-features`).pipe(
      tap(features => {
        this.enabledFeaturesSubject.next(features);
        this.featuresLoaded = true;
      })
    );
  }

  /**
   * Load features if not already loaded
   */
  loadFeaturesIfNeeded(): Observable<string[]> {
    if (this.featuresLoaded && this.enabledFeaturesSubject.value.length > 0) {
      return of(this.enabledFeaturesSubject.value);
    }
    return this.getMyFeatures();
  }

  /**
   * Check if a specific feature is enabled for the current user
   */
  checkFeature(featureCode: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${featureCode}`);
  }

  /**
   * Check if a feature is enabled (uses cached data)
   */
  isFeatureEnabled(featureCode: FeatureCode | string): boolean {
    const features = this.enabledFeaturesSubject.value;
    return features.includes(featureCode);
  }

  /**
   * Get current enabled features synchronously
   */
  getEnabledFeatures(): string[] {
    return this.enabledFeaturesSubject.value;
  }

  /**
   * Clear cached features (call on logout)
   */
  clearCache(): void {
    this.enabledFeaturesSubject.next([]);
    this.featuresLoaded = false;
  }

  /**
   * Group features by category for UI display
   */
  groupFeaturesByCategory(features: TenantFeature[]): Map<string, TenantFeature[]> {
    const grouped = new Map<string, TenantFeature[]>();

    features.forEach(feature => {
      const category = feature.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(feature);
    });

    return grouped;
  }
}
