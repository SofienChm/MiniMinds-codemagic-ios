import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { RegisterRequest } from '../../../core/interfaces/dto/register-request-dto';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true,
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  registerData: RegisterRequest = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Parent',
    isOver18: false,
    acceptedTermsOfService: false,
    acceptedPrivacyPolicy: false,
    parentalConsentAcknowledged: false
  };

  loading = false;
  errorMessage = '';

  roles = [
    { value: 'Admin', label: 'Administrator' },
    { value: 'Parent', label: 'Parent' },
    { value: 'Teacher', label: 'Teacher' }
  ];

  // Base URL for legal documents (remove /api from apiUrl)
  baseUrl = environment.apiUrl.replace('/api', '');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // COPPA Compliance Validation
    if (!this.registerData.isOver18) {
      this.errorMessage = 'You must confirm you are 18 years or older';
      return;
    }

    if (!this.registerData.acceptedTermsOfService) {
      this.errorMessage = 'You must accept the Terms of Service';
      return;
    }

    if (!this.registerData.acceptedPrivacyPolicy) {
      this.errorMessage = 'You must accept the Privacy Policy';
      return;
    }

    if (!this.registerData.parentalConsentAcknowledged) {
      this.errorMessage = 'You must acknowledge the parental consent requirements';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.router.navigate(['/login']);
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Registration failed';
        this.loading = false;
      }
    });
  }
}
