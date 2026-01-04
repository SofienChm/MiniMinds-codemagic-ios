import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PasswordResetService } from '../../../core/services/password-reset.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  email: string = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private passwordResetService: PasswordResetService
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      
      if (!this.email) {
        Swal.fire('Erreur', 'Email manquant dans le lien', 'error');
        this.router.navigate(['/login']);
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value 
      ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.resetForm.valid) {
      this.loading = true;
      const newPassword = this.resetForm.get('newPassword')?.value;

      this.passwordResetService.resetPassword(this.email, newPassword)
        .subscribe({
          next: (response) => {
            Swal.fire('Succès', 'Votre mot de passe a été initialisé avec succès!', 'success');
            this.router.navigate(['/login']);
          },
          error: (error) => {
            const message = error.error?.message || 'Erreur lors de l\'initialisation du mot de passe';
            Swal.fire('Erreur', message, 'error');
            this.loading = false;
          }
        });
    }
  }
}