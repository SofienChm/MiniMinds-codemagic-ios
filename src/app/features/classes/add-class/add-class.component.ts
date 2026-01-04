import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClassesService } from '../classes.service';
import { ClassModel } from '../classes.interface';
import { TitlePage, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-class',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './add-class.component.html',
  styleUrls: ['./add-class.component.scss']
})
export class AddClassComponent implements OnInit, OnDestroy {
  classData: ClassModel = {
    name: '',
    description: '',
    capacity: 20,
    ageGroupMin: 2,
    ageGroupMax: 5,
    schedule: '',
    isActive: true
  };

  saving = false;
  breadcrumbs: Breadcrumb[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private classesService: ClassesService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('CLASSES.ADD_CLASS'));
    this.setupBreadcrumbs();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('CLASSES.ADD_CLASS'));
      this.setupBreadcrumbs();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('CLASSES.TITLE'), url: '/classes' },
      { label: this.translate.instant('CLASSES.ADD_CLASS') }
    ];
  }

  onSubmit() {
    this.saving = true;
    this.classesService.createClass(this.classData).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Class created successfully',
          timer: 2000,
          showConfirmButton: false
        });
        this.router.navigate(['/classes']);
      },
      error: (error) => {
        console.error('Error creating class:', error);
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to create class'
        });
      }
    });
  }

  cancel() {
    this.router.navigate(['/classes']);
  }
}
