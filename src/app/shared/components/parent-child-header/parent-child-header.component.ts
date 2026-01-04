import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  
  get child() {
    return this.children[this.currentChildIndex];
  }

  getAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
