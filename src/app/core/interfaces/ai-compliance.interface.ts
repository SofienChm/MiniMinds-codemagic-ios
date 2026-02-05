/**
 * AI Compliance Interfaces for GDPR & EU AI Act Compliance
 * MiniMinds - Italy Market
 *
 * These interfaces ensure AI operations comply with:
 * - GDPR Article 8 (Children's consent)
 * - GDPR Article 30 (Records of processing)
 * - EU AI Act 2026 (Transparency & Human Oversight)
 */

// Query safety categories
export enum QueryCategory {
  SAFE = 'safe',              // General FAQ, no data access needed
  AGGREGATE = 'aggregate',    // Aggregate/statistical data only
  INDIVIDUAL = 'individual',  // Individual child data - REQUIRES CONSENT
  BLOCKED = 'blocked'         // Always forbidden (profiling, analysis)
}

// Risk levels for AI operations
export enum AIRiskLevel {
  MINIMAL = 'minimal',        // No personal data involved
  LOW = 'low',                // Aggregate data only
  HIGH = 'high',              // Individual data - needs consent
  PROHIBITED = 'prohibited'   // Forbidden operations
}

// Classification result from query analyzer
export interface QueryClassification {
  category: QueryCategory;
  riskLevel: AIRiskLevel;
  requiresConsent: boolean;
  requiresHumanReview: boolean;
  blockedReason?: string;
  dataCategories: string[];   // What data categories would be accessed
  suggestedAlternative?: string; // Safe alternative query if blocked
}

// Audit log entry for GDPR Article 30 compliance
export interface AIAuditLogEntry {
  id?: string;
  timestamp: Date;
  userId: string;
  userRole: 'parent' | 'teacher' | 'admin';
  sessionId: string;
  query: string;
  queryCategory: QueryCategory;
  riskLevel: AIRiskLevel;
  wasBlocked: boolean;
  blockedReason?: string;
  responseType: 'success' | 'blocked' | 'error' | 'escalated';
  dataAccessed: string[];
  consentVerified: boolean;
  ipAddress?: string;
  userAgent?: string;
}

// AI Response with compliance metadata
export interface CompliantAIResponse {
  success: boolean;
  message: string;
  data?: any;

  // Compliance metadata
  compliance: {
    queryCategory: QueryCategory;
    riskLevel: AIRiskLevel;
    wasBlocked: boolean;
    blockedReason?: string;
    auditLogId: string;
    humanEscalationAvailable: boolean;
    dataDisclosure: string[];  // What data categories were used
  };

  // Human escalation info
  escalation?: {
    available: boolean;
    contactEmail: string;
    contactPhone?: string;
    message: string;
  };
}

// Consent status for AI data access
export interface AIConsentStatus {
  userId: string;
  childId?: string;
  consentGiven: boolean;
  consentDate?: Date;
  consentScope: string[];     // What data categories are consented
  canAccessAggregate: boolean;
  canAccessIndividual: boolean;
}

// Blocked query patterns
export interface BlockedQueryPattern {
  pattern: RegExp;
  reason: string;
  category: QueryCategory;
  suggestedAlternative: string;
}

// Safe query definition
export interface SafeQuery {
  query: string;
  queryIt: string;           // Italian translation
  category: QueryCategory;
  description: string;
  descriptionIt: string;     // Italian translation
}

// AI Disclosure configuration
export interface AIDisclosureConfig {
  enabled: boolean;
  message: {
    en: string;
    it: string;
  };
  humanContact: {
    email: string;
    phone?: string;
  };
  showOnEveryMessage: boolean;
  requireAcknowledgment: boolean;
}

// Human escalation request
export interface HumanEscalationRequest {
  userId: string;
  originalQuery: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  contactPreference: 'email' | 'phone' | 'app';
  timestamp: Date;
}
