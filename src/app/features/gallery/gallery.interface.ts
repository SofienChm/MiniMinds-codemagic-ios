export interface Photo {
  id: number;
  fileName: string;
  filePath?: string; // Legacy - kept for backward compatibility
  fileType: string;
  fileSize: number;
  title?: string;
  description?: string;
  category: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  childId: number;
  childName?: string;
  uploadedById?: string;
  uploadedByName?: string;
  // File-based URLs (preferred)
  thumbnailUrl?: string; // URL to thumbnail file
  imageUrl?: string; // URL to full resolution image file
  // Base64 fallback (deprecated - kept for backward compatibility)
  thumbnailData?: string; // Base64 thumbnail for fast gallery loading
  imageData?: string; // Full resolution Base64 image (only loaded when viewing)
  createdAt: string;
  updatedAt: string;
}

export interface PhotosResponse {
  data: Photo[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PhotosByChildResponse extends PhotosResponse {
  childName: string;
}

export interface UploadPhotoRequest {
  file: File;
  childId: number;
  title?: string;
  description?: string;
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

export interface UpdatePhotoRequest {
  title?: string;
  description?: string;
  category?: string;
}

export interface MultipleUploadResponse {
  message: string;
  uploaded: Photo[];
  errors?: string[];
}

export type PhotoCategory = 'Memory' | 'Activity' | 'Event' | 'General';

export const PHOTO_CATEGORIES: PhotoCategory[] = ['Memory', 'Activity', 'Event', 'General'];
