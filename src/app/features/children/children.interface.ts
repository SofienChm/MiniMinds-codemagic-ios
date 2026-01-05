export interface ParentInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture: string;
  address?: string;
  parentType?: string;
  createdAt?:string;
  dateOfBirth?:string;
  zipCode?:string; 
  emergencyContact?:string;
  work?:string;
  relationshipType?:string; 
}

export interface ChildParent {
  id?: number;
  childId?: number;
  parentId: number;
  relationshipType?: string;
  isPrimaryContact?: boolean;
  parent?: ParentInfo;
}

export interface ChildModel {
  id?: number;
  firstName: string;
  lastName: string;
  age?: number;
  dateOfBirth: string;
  gender: string;
  allergies?: string;
  medicalNotes?: string;
  profilePicture?: string;
  hasProfilePicture?: boolean;
  parentId?: number; // Keep for backward compatibility
  enrollmentDate?: string;
  isActive?: boolean;
  parent?: ParentInfo; // Keep for backward compatibility
  childParents?: ChildParent[]; // Multiple parents
}