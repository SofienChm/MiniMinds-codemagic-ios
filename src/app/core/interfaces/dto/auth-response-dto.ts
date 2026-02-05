export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  preferredLanguage?: string;
  expiration: Date;
  role: string;
  // Multi-tenancy
  tenantId?: number;
  tenantName?: string;
}