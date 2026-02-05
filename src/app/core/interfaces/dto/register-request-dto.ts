export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  // COPPA Compliance Fields
  isOver18: boolean;
  acceptedTermsOfService: boolean;
  acceptedPrivacyPolicy: boolean;
  parentalConsentAcknowledged: boolean;
}