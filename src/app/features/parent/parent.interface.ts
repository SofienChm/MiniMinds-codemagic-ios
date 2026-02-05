export interface ParentModel {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  phoneNumber: string;
  profilePicture?: string; // Base64 (deprecated, for backward compatibility)
  profilePictureUrl?: string; // File-based URL path
  hasProfilePicture?: boolean;
  emergencyContact?: string;
  gender?: string;
  dateOfBirth?: string;
  work?: string;
  zipCode?: string;
  parentType?: string;
  password?: string; // Only used for creation
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  children?: ChildInfo[];
}

export interface ChildInfo {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  allergies?: string;
  medicalNotes?: string;
  profilePicture?: string; // Base64 (deprecated, for backward compatibility)
  profilePictureUrl?: string; // File-based URL path
  hasProfilePicture?: boolean;
  enrollmentDate: string;
  isActive?: boolean;
}