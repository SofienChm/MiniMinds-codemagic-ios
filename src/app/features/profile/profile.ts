import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/interfaces/dto/auth-response-dto';
import { Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { ApiConfig } from '../../core/config/api.config';

interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  user: AuthResponse | null = null;
  saving = false;
  imagePreview: string | null = null;
  errorMessage = '';

  profile: ProfileUpdateRequest = {
    firstName: '',
    lastName: '',
    email: '',
    profilePicture: ''
  };

  breadcrumbs: Breadcrumb[] = [
    { label: 'Dashboard' },
    { label: 'Profile' }
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.profile = {
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        profilePicture: this.user.profilePicture
      };
    }
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Preview the image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);

      // Handle file upload
      const formData = new FormData();
      formData.append('file', file);

      this.http.post(`${ApiConfig.BASE_URL}/profile/upload-picture`, formData)
        .subscribe({
          next: (response: any) => {
            if (response.profilePicture) {
              this.profile.profilePicture = response.profilePicture;
              this.user!.profilePicture = response.profilePicture;
              // Update user in local storage
              localStorage.setItem('user', JSON.stringify(this.user));
            }
          },
          error: (error) => {
            console.error('Error uploading profile picture', error);
            this.errorMessage = 'Failed to upload profile picture. Please try again.';
          }
        });
    }
  }

  updateProfile() {
    if (!this.user) return;
    
    this.saving = true;
    this.errorMessage = '';

    this.http.put(`${ApiConfig.BASE_URL}/profile`, this.profile)
      .subscribe({
        next: (response: any) => {
          // Update local user data
          this.user!.firstName = this.profile.firstName;
          this.user!.lastName = this.profile.lastName;
          this.user!.email = this.profile.email;
          
          // Update in storage
          localStorage.setItem('user', JSON.stringify(this.user));
          
          this.saving = false;
        },
        error: (error) => {
          console.error('Error updating profile', error);
          this.errorMessage = 'Failed to update profile. Please try again.';
          this.saving = false;
        }
      });
  }

  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  getInitials(): string {
    if (!this.user) return '';
    return `${this.user.firstName.charAt(0)}${this.user.lastName.charAt(0)}`.toUpperCase();
  }
}
