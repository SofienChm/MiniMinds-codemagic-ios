import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  constructor(private authService: AuthService) {}

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get dashboardRoute(): string {
    return this.isSuperAdmin ? '/super-admin/dashboard' : '/dashboard';
  }
}
