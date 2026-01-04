import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClassesService } from './classes.service';
import { ClassModel } from './classes.interface';
import { TitlePage, Breadcrumb, TitleAction } from '../../shared/layouts/title-page/title-page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, RouterModule, TitlePage, ReactiveFormsModule, TranslateModule],
  templateUrl: './classes.component.html',
  styleUrls: ['./classes.component.scss']
})
export class ClassesComponent implements OnInit, OnDestroy {
  classes: ClassModel[] = [];
  selectedClass: ClassModel | null = null;
  showDetailModal = false;
  showEditModal = false;
  classForm: FormGroup;
  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private classesService: ClassesService,
    private router: Router,
    private fb: FormBuilder,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {
    this.classForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      capacity: [20, [Validators.required, Validators.min(1)]],
      ageGroupMin: [2, [Validators.required, Validators.min(0)]],
      ageGroupMax: [5, [Validators.required, Validators.min(0)]],
      schedule: [''],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('CLASSES.TITLE'));
    this.setupBreadcrumbs();
    this.setupTitleActions();
    this.loadClasses();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('CLASSES.TITLE'));
      this.setupBreadcrumbs();
      this.setupTitleActions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('CLASSES.TITLE') }
    ];
  }

  private setupTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('CLASSES.ADD_CLASS'),
        class: 'btn-add-global-2',
        icon: 'bi bi-plus-lg',
        action: () => this.addClass()
      }
    ];
  }

  loadClasses() {
    this.classesService.getClasses().subscribe({
      next: (classes) => this.classes = classes,
      error: (error) => console.error('Error loading classes:', error)
    });
  }

  showDetail(classItem: ClassModel) {
    this.selectedClass = classItem;
    this.showDetailModal = true;
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedClass = null;
  }

  editClass(classItem: ClassModel) {
    this.selectedClass = classItem;
    this.classForm.patchValue({
      name: classItem.name,
      description: classItem.description,
      capacity: classItem.capacity,
      ageGroupMin: classItem.ageGroupMin,
      ageGroupMax: classItem.ageGroupMax,
      schedule: classItem.schedule,
      isActive: classItem.isActive
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedClass = null;
    this.classForm.reset();
  }

  onSubmit() {
    if (this.classForm.valid && this.selectedClass?.id) {
      const updatedClass = { ...this.classForm.value, id: this.selectedClass.id };
      this.classesService.updateClass(this.selectedClass.id, updatedClass).subscribe({
        next: () => {
          this.closeEditModal();
          this.loadClasses();
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Class updated successfully',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('Error updating class:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to update class'
          });
        }
      });
    }
  }

  deleteClass(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this class?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.classesService.deleteClass(id).subscribe({
          next: () => {
            this.loadClasses();
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Class has been deleted',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error deleting class:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: 'Failed to delete class'
            });
          }
        });
      }
    });
  }

  addClass = () => {
    this.router.navigate(['/classes/add']);
  }

  viewDetails(id: number) {
    this.router.navigate(['/classes/detail', id]);
  }
}
