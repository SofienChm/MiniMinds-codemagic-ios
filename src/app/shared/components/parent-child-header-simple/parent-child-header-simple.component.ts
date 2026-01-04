import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';

@Component({
  selector: 'app-parent-child-header-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parent-child-header-simple.component.html',
  styleUrls: ['./parent-child-header-simple.component.scss']
})
export class ParentChildHeaderSimpleComponent {
  @Input() title: string = '';
  @Input() showEdit: boolean = false;

  @Output() onBack = new EventEmitter<void>();
  @Output() onDateChange = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<void>();

  back() {
    this.location.back();
  }
    constructor(
    private location: Location
  ) {}

}
