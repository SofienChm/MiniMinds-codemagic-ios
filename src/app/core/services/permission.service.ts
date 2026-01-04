import { Injectable } from '@angular/core';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor(private authService: AuthService) {}

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.isTeacher();
  }

  canDelete(): boolean {
    return this.authService.isAdmin();
  }

  canView(): boolean {
    return true; // All authenticated users can view
  }

  canManageUsers(): boolean {
    return this.authService.isAdmin();
  }
}
