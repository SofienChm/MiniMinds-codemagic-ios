import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditAttendanceSheet } from './edit-attendance-sheet';

describe('EditAttendanceSheet', () => {
  let component: EditAttendanceSheet;
  let fixture: ComponentFixture<EditAttendanceSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditAttendanceSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditAttendanceSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
