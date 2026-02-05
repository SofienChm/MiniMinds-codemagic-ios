export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  // Translation keys for i18n support
  titleKey?: string;
  messageKey?: string;
  // JSON string or object containing parameters for message interpolation
  messageParams?: string | Record<string, string>;
  redirectUrl?: string;
  userId?: string;
  isRead: boolean;
  createdAt: string;
}