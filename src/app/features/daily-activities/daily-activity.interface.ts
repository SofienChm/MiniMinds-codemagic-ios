export interface DailyActivity {
  id?: number;
  childId: number;
  activityType: string;
  activityTime: string;
  duration?: string;
  notes?: string;
  foodItem?: string;
  mood?: string;
  createdAt?: string;
  child?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export interface ActivityTemplate {
  type: string;
  icon: string;
  color: string;
  label: string;
  defaultDuration?: number;
  requiresFood?: boolean;
}
