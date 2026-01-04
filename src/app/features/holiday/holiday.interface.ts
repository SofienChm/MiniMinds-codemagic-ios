export interface Holiday {
  id?: number;
  name: string;
  description?: string;
  date: string;
  isRecurring: boolean;
  recurrenceType?: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}