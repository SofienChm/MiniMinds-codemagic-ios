import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ApiConfig } from '../../../core/config/api.config';

@Component({
  selector: 'app-parent-child-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parent-child-header.component.html',
  styleUrls: ['./parent-child-header.component.scss']
})
export class ParentChildHeaderComponent {
  @Input() title: string = '';
  @Input() children: any[] = [];
  @Input() currentChildIndex: number = 0;
  @Input() selectedDate: string = '';
  @Input() showDatePicker: boolean = true;
  @Input() showSettings: boolean = false;
  @Input() showEdit: boolean = false;
  @Input() showImages: boolean = true;
  @Input() hasCustomContent: boolean = false;

  @Output() onBack = new EventEmitter<void>();
  @Output() onPrevChild = new EventEmitter<void>();
  @Output() onNextChild = new EventEmitter<void>();
  @Output() onDateChange = new EventEmitter<string>();
  @Output() onSettings = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<void>();

  handleEditClick(): void {
    console.log('Edit button clicked in header component');
    this.onEdit.emit();
  }
  
  get child() {
    return this.children[this.currentChildIndex];
  }
  back() {
    this.location.back();
  }
  constructor(
    private location: Location
  ) {}

  calculateAge(dateOfBirth: string): { years: number, months: number } {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years: years < 0 ? 0 : years, months: months < 0 ? 0 : months };
  }

  /**
   * Get profile picture URL, handling both file-based and Base64 formats
   */
  getProfilePictureUrl(entity: any): string | null {
    if (!entity) return null;

    // Priority 1: File-based URL (new format)
    if (entity.profilePictureUrl) {
      return this.getFullUrl(entity.profilePictureUrl);
    }

    // Priority 2: Base64 (backward compatibility)
    if (entity.profilePicture) {
      // If it's already a data URL or full URL, return as-is
      if (entity.profilePicture.startsWith('data:') || entity.profilePicture.startsWith('http')) {
        return entity.profilePicture;
      }
      // If it's a relative path, construct full URL
      return this.getFullUrl(entity.profilePicture);
    }

    return null;
  }

  private getFullUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    return `${ApiConfig.HUB_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
