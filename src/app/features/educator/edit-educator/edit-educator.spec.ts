import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditEducator } from './edit-educator';

describe('EditEducator', () => {
  let component: EditEducator;
  let fixture: ComponentFixture<EditEducator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditEducator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditEducator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
