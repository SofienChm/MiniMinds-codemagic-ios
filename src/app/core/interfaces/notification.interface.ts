export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  redirectUrl?: string;
  userId?: string;
  isRead: boolean;
  createdAt: string;
}