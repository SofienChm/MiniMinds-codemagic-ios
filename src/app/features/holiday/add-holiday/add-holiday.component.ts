import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HolidayService } from '../holiday.service';
import { TitlePage } from '../../../shared/layouts/title-page/title-page';

@Component({
  selector: 'app-add-holiday',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitlePage, TranslateModule],
  templateUrl: './add-holiday.component.html',
  styleUrls: ['./add-holiday.component.scss']
})
export class AddHolidayComponent {
  holidayForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private holidayService: HolidayService,
    private router: Router
  ) {
    this.holidayForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      date: ['', Validators.required],
      isRecurring: [false],
      recurrenceType: [''],
      color: ['#FF6B6B', Validators.required]
    });
  }

  onSubmit() {
    if (this.holidayForm.valid) {
      this.holidayService.createHoliday(this.holidayForm.value).subscribe({
        next: () => {
          this.router.navigate(['/holidays']);
        },
        error: (error) => {
          console.error('Error creating holiday:', error);
        }
      });
    }
  }

  onCancel = () => {
    this.router.navigate(['/holidays']);
  }
}