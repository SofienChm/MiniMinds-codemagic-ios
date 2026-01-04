import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { AIChatButtonComponent } from '../../components/ai-chat-button/ai-chat-button.component';
import { AuthService } from '../../../core/services/auth';
import { SignalRService } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterModule, Header, Sidebar, AIChatButtonComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isParentRole = false;

  constructor(
    private authService: AuthService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.isParentRole = this.authService.isParent();
    // SignalR disabled temporarily - notifications work via polling
    // this.signalRService.startConnection();
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
