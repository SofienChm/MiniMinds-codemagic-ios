import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { AIChatButtonComponent } from '../../components/ai-chat-button/ai-chat-button.component';
import { AuthService } from '../../../core/services/auth';
import { SignalRService } from '../../../core/services/signalr.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterModule, Header, Sidebar, AIChatButtonComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isParentRole = false;
  isSuperAdminRoute = false;

  constructor(
    private authService: AuthService,
    private signalRService: SignalRService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isParentRole = this.authService.isParent();

    // Check initial route
    this.checkSuperAdminRoute(this.router.url);

    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.checkSuperAdminRoute(event.urlAfterRedirects);
    });

    // SignalR disabled temporarily - notifications work via polling
    // this.signalRService.startConnection();
  }

  private checkSuperAdminRoute(url: string): void {
    this.isSuperAdminRoute = url.startsWith('/super-admin');
  }

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  shouldHideHeader(): boolean {
    return this.isSuperAdminRoute && this.isMobile();
  }

  ngOnDestroy(): void {
    // this.signalRService.stopConnection();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
