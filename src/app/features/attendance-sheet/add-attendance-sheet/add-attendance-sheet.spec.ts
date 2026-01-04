import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAttendanceSheet } from './add-attendance-sheet';

describe('AddAttendanceSheet', () => {
  let component: AddAttendanceSheet;
  let fixture: ComponentFixture<AddAttendanceSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAttendanceSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAttendanceSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
