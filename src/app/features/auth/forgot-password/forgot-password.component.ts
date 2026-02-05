import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email: string = '';
  isLoading = false;
  errorMessage: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  onSubmit() {
    if (!this.email) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.sendPasswordResetEmail(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        alert('Un lien de réinitialisation a été envoyé à votre adresse email.');
        this.backToLogin();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || "Erreur lors de l'envoi du mail.";
      }
    });
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
