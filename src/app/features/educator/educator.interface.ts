export interface EducatorModel {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth: string;
  hireDate: string;
  specialization?: string;
  salary: number;
  profilePicture?: string;
  profilePictureUrl?: string; // File-based URL (preferred)
  isActive?: boolean;
  password?: string; // Only used for creation
}