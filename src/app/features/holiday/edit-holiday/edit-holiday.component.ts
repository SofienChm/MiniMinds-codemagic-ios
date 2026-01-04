import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HolidayService } from '../holiday.service';
import { Holiday } from '../holiday.interface';
import { TitlePage } from '../../../shared/layouts/title-page/title-page';

@Component({
  selector: 'app-edit-holiday',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitlePage, TranslateModule],
  templateUrl: './edit-holiday.component.html',
  styleUrls: ['./edit-holiday.component.scss']
})
export class EditHolidayComponent implements OnInit {
  holidayForm: FormGroup;
  holidayId: number = 0;

  constructor(
    private fb: FormBuilder,
    private holidayService: HolidayService,
    private router: Router,
    private route: ActivatedRoute
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

  ngOnInit() {
    this.holidayId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadHoliday();
  }

  loadHoliday() {
    this.holidayService.getHoliday(this.holidayId).subscribe({
      next: (holiday: Holiday) => {
        this.holidayForm.patchValue({
          name: holiday.name,
          description: holiday.description,
          date: holiday.date.split('T')[0], // Format date for input
          isRecurring: holiday.isRecurring,
          recurrenceType: holiday.recurrenceType,
          color: holiday.color
        });
      },
      error: (error) => {
        console.error('Error loading holiday:', error);
        this.router.navigate(['/holidays']);
      }
    });
  }

  onSubmit() {
    if (this.holidayForm.valid) {
      this.holidayService.updateHoliday(this.holidayId, this.holidayForm.value).subscribe({
        next: () => {
          this.router.navigate(['/holidays']);
        },
        error: (error) => {
          console.error('Error updating holiday:', error);
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/holidays']);
  }
}