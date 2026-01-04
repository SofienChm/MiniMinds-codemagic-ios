import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEducator } from './add-educator';

describe('AddEducator', () => {
  let component: AddEducator;
  let fixture: ComponentFixture<AddEducator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEducator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEducator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
