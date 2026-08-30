export interface AuthResponse {
  token: string;
  refreshToken?: string;
  refreshTokenExpiration?: Date;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  profilePictureUrl?: string; // File-based URL (preferred)
  preferredLanguage?: string;
  expiration: Date;
  role: string;
  // Multi-tenancy
  tenantId?: number;
  tenantName?: string;
}