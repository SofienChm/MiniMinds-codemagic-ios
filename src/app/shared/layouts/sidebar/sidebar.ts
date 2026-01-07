import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrefixPipe } from '../../../core/services/prefix/prefix.pipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, PrefixPipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit, OnDestroy {
  @Output() linkClicked = new EventEmitter<void>();
  menuItemsMain: any[] = [];
  menuItemsPrincipal: any[] = [];
  menuItemsChild: any[] = [];
  menuItemsPeople: any[] = [];
  menuItemsIa: any[] = [];
  menuItemsSetting: any[] = [];
  userRole: string | null = null;
  private userSubscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();
    this.setupMenuItems();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private setupMenuItems(): void {
    const isParent = this.authService.isParent();
    const isAdmin = this.authService.isAdmin();
    const isTeacher = this.authService.isTeacher();

    // Main items - available to all roles
    this.menuItemsMain = [
      { path: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
      { path: '/messages', icon: 'bi-envelope', label: 'Messages' },
      { path: '/reclamations', icon: 'bi-exclamation-circle', label: 'Reclamations' },
      { path: '/calendar', icon: 'bi-calendar', label: 'Calendar' }
    ];

    // Principal items - role-based
    this.menuItemsPrincipal = [
      { path: '/holidays', icon: 'bi-calendar-heart', label: 'Holidays' },
      { path: '/fees', icon: 'bi-currency-dollar', label: 'Fees' },
      { path: '/events', icon: 'bi-calendar-event', label: 'Events' }
    ];

    // Leaves - Admin & Teacher only (not Parent)
    if (!isParent) {
      this.menuItemsPrincipal.splice(1, 0, { path: '/leaves', icon: 'bi-person-raised-hand', label: 'Leaves' });
    }

    // Child items - role-based
    this.menuItemsChild = [
      { path: '/activities', icon: 'bi-activity', label: 'Daily Report' },
      { path: isParent ? '/food-menu/parent' : '/food-menu', icon: 'bi-egg-fried', label: 'Food Menu' },
      { path: '/gallery', icon: 'bi-images', label: 'Photo Gallery' },
      { path: '/learning-games', icon: 'bi-controller', label: 'Learning Games' }
    ];

    // Attendance - Admin & Teacher only (not Parent)
    if (!isParent) {
      this.menuItemsChild.unshift(
        { path: '/attendance', icon: 'bi-calendar-check', label: 'Attendance' }
      );
    }

    // Classes - Admin & Teacher only (not Parent)
    if (!isParent) {
      this.menuItemsChild.push(
        { path: '/classes', icon: 'bi-book', label: 'Classes' }
      );
    }

    // Add QR Check-in for parents only
    if (isParent) {
      this.menuItemsChild.unshift(
        { path: '/qr-checkin', icon: 'bi-qr-code-scan', label: 'QR Check-in' }
      );
    }

    // Add QR Management for Admin & Teacher only
    if (isAdmin || isTeacher) {
      this.menuItemsChild.push(
        { path: '/qr-management', icon: 'bi-qr-code', label: 'QR Management' }
      );
    }

    // People items - Admin & Teacher only (not Parent)
    this.menuItemsPeople = [];
    if (isAdmin) {
      this.menuItemsPeople = [
        { path: '/parents', icon: 'bi-people', label: 'Parents' },
        { path: '/educators', icon: 'bi-person-workspace', label: 'Educators' },
        { path: '/children', icon: 'bi-person-hearts', label: 'children', usePrefix: true }
      ];
    } else if (isTeacher) {
      this.menuItemsPeople = [
        { path: '/parents', icon: 'bi-people', label: 'Parents' },
        { path: '/children', icon: 'bi-person-hearts', label: 'children', usePrefix: true }
      ];
    }
    // Parent role: menuItemsPeople remains empty (no access to people lists)

    // IA items - available to admin users only
    if (isAdmin) {
      this.menuItemsIa = [
        { path: '/basic-ai', icon: 'bi-search', label: 'Basic AI' },
        { path: '/ai-assistant', icon: 'bi-robot', label: 'OpenAI Assistant' }
      ];
    }

    // Setting items - Admin & Teacher only (not Parent)
    if (!isParent) {
      this.menuItemsSetting = [
        { path: '/settings', icon: 'bi-gear', label: 'Settings' }
      ];
    } else {
      this.menuItemsSetting = [];
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isParent(): boolean {
    return this.authService.isParent();
  }

  isTeacher(): boolean {
    return this.authService.isTeacher();
  }

  onLinkClick(): void {
    this.linkClicked.emit();
  }
}