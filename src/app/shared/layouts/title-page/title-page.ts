import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
export interface Breadcrumb {
  label: string;
  url?: string;
  icon?: string;
}

export interface TitleAction {
  label: string;
  icon?: string;
  class?: string;
  action: () => void;
  dropdown?: {
    items: DropdownItem[];
  };
}

export interface DropdownItem {
  label: string;
  icon?: string;
  action: () => void;
}
@Component({
  selector: 'app-title-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './title-page.html',
  styleUrl: './title-page.scss'
})
export class TitlePage {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() actions: TitleAction[] = [];
  showDropdown: { [key: number]: boolean } = {};

  constructor(private authService: AuthService) {}

  get isParent(): boolean {
    return this.authService.isParent();
  }

  toggleDropdown(index: number) {
    this.showDropdown[index] = !this.showDropdown[index];
  }
}
