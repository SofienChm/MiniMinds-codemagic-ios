import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ApiConfig } from '../../../core/config/api.config';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { HeaderSuperadminComponent } from '../header-superadmin/header';
import { Location } from '@angular/common';

interface DemoRequest {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  centerName: string;
  jobTitle: string;
  country: string;
  numberOfChildren: string;
  hearAboutUs: string;
  comments?: string;
  status: number;
  statusName: string;
  notes?: string;
  createdAt: string;
  contactedAt?: string;
  completedAt?: string;
}

interface DemoRequestStats {
  total: number;
  newRequests: number;
  contacted: number;
  scheduled: number;
  completed: number;
  notInterested: number;
  thisWeek: number;
  thisMonth: number;
}

@Component({
  selector: 'app-demo-requests',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TitlePage, HeaderSuperadminComponent],
  templateUrl: './demo-requests.html',
  styleUrl: './demo-requests.scss'
})
export class DemoRequests implements OnInit, OnDestroy {
  demoRequests: DemoRequest[] = [];
  stats: DemoRequestStats | null = null;
  selectedRequest: DemoRequest | null = null;
  showDetailModal = false;

  loading = true;
  searchTerm = '';
  statusFilter: number | null = null;
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;
  pageSize = 15;
  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }
  back() {
    this.location.back();
  }

  // Title page config
  breadcrumbs: Breadcrumb[] = [
    { label: 'Dashboard', url: '/super-admin/dashboard' },
    { label: 'Demo Requests', url: '/super-admin/demo-requests' }
  ];

  titleActions: TitleAction[] = [];

  statusOptions = [
    { value: null, label: 'All Status', icon: 'bi-list' },
    { value: 0, label: 'New', icon: 'bi-star', color: '#3b82f6' },
    { value: 1, label: 'Contacted', icon: 'bi-telephone', color: '#f59e0b' },
    { value: 2, label: 'Scheduled', icon: 'bi-calendar-check', color: '#8b5cf6' },
    { value: 3, label: 'Completed', icon: 'bi-check-circle', color: '#10b981' },
    { value: 4, label: 'Not Interested', icon: 'bi-x-circle', color: '#6b7280' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient, 
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadDemoRequests();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadStats(): void {
    const sub = this.http.get<DemoRequestStats>(`${ApiConfig.ENDPOINTS.DEMO_REQUESTS}/stats`).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });
    this.subscriptions.push(sub);
  }

  loadDemoRequests(): void {
    this.loading = true;

    let url = `${ApiConfig.ENDPOINTS.DEMO_REQUESTS}?page=${this.currentPage}&pageSize=${this.pageSize}`;

    if (this.statusFilter !== null) {
      url += `&status=${this.statusFilter}`;
    }

    if (this.searchTerm.trim()) {
      url += `&search=${encodeURIComponent(this.searchTerm)}`;
    }

    const sub = this.http.get<{ data: DemoRequest[], totalCount: number, totalPages: number }>(url).subscribe({
      next: (response) => {
        this.demoRequests = response.data;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading demo requests:', err);
        this.loading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadDemoRequests();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.loadDemoRequests();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadDemoRequests();
    }
  }

  viewDetails(request: DemoRequest): void {
    this.selectedRequest = request;
    this.showDetailModal = true;
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedRequest = null;
  }

  updateStatus(request: DemoRequest, newStatus: number, notes?: string): void {
    const sub = this.http.put(`${ApiConfig.ENDPOINTS.DEMO_REQUESTS}/${request.id}/status`, {
      status: newStatus,
      notes: notes || request.notes
    }).subscribe({
      next: () => {
        request.status = newStatus;
        request.statusName = this.getStatusLabel(newStatus);
        this.loadStats(); // Refresh stats
      },
      error: (err) => {
        console.error('Error updating status:', err);
      }
    });
    this.subscriptions.push(sub);
  }

  deleteRequest(request: DemoRequest, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete this demo request from ${request.fullName}?`)) {
      const sub = this.http.delete(`${ApiConfig.ENDPOINTS.DEMO_REQUESTS}/${request.id}`).subscribe({
        next: () => {
          this.demoRequests = this.demoRequests.filter(r => r.id !== request.id);
          this.loadStats();
          if (this.selectedRequest?.id === request.id) {
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Error deleting request:', err);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  getStatusLabel(status: number): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option?.label || 'Unknown';
  }

  getStatusColor(status: number): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option?.color || '#6b7280';
  }

  getStatusIcon(status: number): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option?.icon || 'bi-question-circle';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  trackById(index: number, item: DemoRequest): number {
    return item.id;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
}
