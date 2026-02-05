import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { ApiConfig } from '../../core/config/api.config';

interface DemoRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  centerName: string;
  jobTitle: string;
  country: string;
  numberOfChildren: string;
  hearAboutUs: string;
  comments: string;
}

@Component({
  selector: 'app-request-demo',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './request-demo.html',
  styleUrl: './request-demo.scss'
})
export class RequestDemo implements OnInit {
  currentStep = 1;
  totalSteps = 3;
  isSubmitting = false;
  isSubmitted = false;
  submitError = '';
  staticUrl = ApiConfig.STATIC_URL;

  demoForm!: FormGroup;

  childrenRanges = [
    '1-20',
    '21-50',
    '51-100',
    '101-200',
    '200+'
  ];

  hearAboutOptions = [
    'Google Search',
    'Social Media',
    'Friend or Colleague',
    'Conference/Event',
    'Online Advertisement',
    'Other'
  ];

  countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'France',
    'Germany',
    'Italy',
    'Spain',
    'Switzerland',
    'Belgium',
    'Netherlands',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.demoForm = this.fb.group({
      // Step 1
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s\-()]+$/)]],
      // Step 2
      centerName: ['', [Validators.required, Validators.minLength(2)]],
      jobTitle: ['', [Validators.required]],
      country: ['', [Validators.required]],
      numberOfChildren: ['', [Validators.required]],
      // Step 3
      hearAboutUs: ['', [Validators.required]],
      comments: ['']
    });
  }

  get stepProgress(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return this.demoForm.get('firstName')?.valid === true &&
               this.demoForm.get('lastName')?.valid === true &&
               this.demoForm.get('email')?.valid === true &&
               this.demoForm.get('phone')?.valid === true;
      case 2:
        return this.demoForm.get('centerName')?.valid === true &&
               this.demoForm.get('jobTitle')?.valid === true &&
               this.demoForm.get('country')?.valid === true &&
               this.demoForm.get('numberOfChildren')?.valid === true;
      case 3:
        return this.demoForm.get('hearAboutUs')?.valid === true;
      default:
        return false;
    }
  }

  nextStep(): void {
    if (this.isStepValid(this.currentStep) && this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    // Only allow going to previous steps or current step
    if (step <= this.currentStep) {
      this.currentStep = step;
    }
  }

  submitForm(): void {
    if (this.demoForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.submitError = '';

      const formData: DemoRequest = this.demoForm.value;

      this.http.post(`${ApiConfig.ENDPOINTS.DEMO_REQUESTS}`, formData).subscribe({
        next: () => {
          this.isSubmitted = true;
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error submitting demo request:', error);
          this.submitError = 'Failed to submit your request. Please try again.';
          this.isSubmitting = false;
        }
      });
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.demoForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      if (field.errors['pattern']) return 'Please enter a valid phone number';
    }
    return '';
  }
}
