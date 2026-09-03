import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiConfig } from '../config/api.config';
import {
  TenantFeature,
  TenantFeaturesResponse,
  FeatureToggle,
  UpdateTenantFeaturesRequest,
  AvailableFeature,
  FeatureCode,
  MyFeaturesDto
} from '../interfaces/dto/tenant-dto';

@Injectable({
  providedIn: 'root'
})
export class TenantFeatureService {
  private apiUrl = ApiConfig.ENDPOINTS.TENANT_FEATURES;

  // Cache for current user's enabled features
  private enabledFeaturesSubject = new BehaviorSubject<string[]>([]);
  public enabledFeatures$ = this.enabledFeaturesSubject.asObservable();

  // Cache for enabled features that are hidden in the UI (CSS-hide)
  private hiddenFeaturesSubject = new BehaviorSubject<string[]>([]);
  public hiddenFeatures$ = this.hiddenFeaturesSubject.asObservable();

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
  toggleFeature(tenantId: number, featureCode: string, isEnabled: boolean, isHidden?: boolean): Observable<any> {
    const toggle: FeatureToggle = { featureCode, isEnabled, isHidden };
    return this.http.patch(`${this.apiUrl}/tenant/${tenantId}/toggle`, toggle);
  }

  /**
   * Initialize default features for a tenant (SuperAdmin only)
   */
  initializeFeatures(tenantId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenant/${tenantId}/initialize`, {});
  }

  /**
   * Get enabled + hidden features for the current user's tenant
   * Used by guards and sidebar to determine access
   */
  getMyFeatures(): Observable<MyFeaturesDto> {
    return this.http.get<MyFeaturesDto>(`${this.apiUrl}/my-features`).pipe(
      tap((data) => {
        this.enabledFeaturesSubject.next(data.enabled || []);
        this.hiddenFeaturesSubject.next(data.hidden || []);
        this.featuresLoaded = true;
      })
    );
  }

  /**
   * Load features if not already loaded
   */
  loadFeaturesIfNeeded(): Observable<MyFeaturesDto> {
    if (this.featuresLoaded && this.enabledFeaturesSubject.value.length > 0) {
      return new BehaviorSubject(this.getMyFeaturesSnapshot()).asObservable();
    }
    return this.getMyFeatures();
  }

  /**
   * Get the current enabled + hidden snapshot synchronously
   */
  getMyFeaturesSnapshot(): MyFeaturesDto {
    return {
      enabled: this.enabledFeaturesSubject.value,
      hidden: this.hiddenFeaturesSubject.value
    };
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
   * Check if an enabled feature is hidden in the UI (CSS-hide)
   */
  isFeatureHidden(featureCode: FeatureCode | string): boolean {
    return this.hiddenFeaturesSubject.value.includes(featureCode);
  }

  /**
   * Get current enabled features synchronously
   */
  getEnabledFeatures(): string[] {
    return this.enabledFeaturesSubject.value;
  }

  /**
   * Get current hidden features synchronously
   */
  getHiddenFeatures(): string[] {
    return this.hiddenFeaturesSubject.value;
  }

  /**
   * Clear cached features (call on logout)
   */
  clearCache(): void {
    this.enabledFeaturesSubject.next([]);
    this.hiddenFeaturesSubject.next([]);
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
