import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header-superadmin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderSuperadminComponent implements OnInit, OnDestroy {
  pendingRequestsCount: number = 0;

  private subscriptions: Subscription[] = [];

  constructor() {}

  ngOnInit(): void {
    this.loadPendingRequestsCount();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadPendingRequestsCount(): void {
    // TODO: Load pending demo requests count from service
    // Example:
    // this.demoRequestService.getPendingCount().subscribe(count => {
    //   this.pendingRequestsCount = count;
    // });
  }
}
