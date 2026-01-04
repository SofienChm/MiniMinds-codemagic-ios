import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceSheet } from './attendance-sheet';

describe('AttendanceSheet', () => {
  let component: AttendanceSheet;
  let fixture: ComponentFixture<AttendanceSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
