export interface ClassModel {
  id?: number;
  name: string;
  description?: string;
  teacherId?: number;
  capacity: number;
  ageGroupMin: number;
  ageGroupMax: number;
  schedule?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  enrollmentCount?: number;
}
