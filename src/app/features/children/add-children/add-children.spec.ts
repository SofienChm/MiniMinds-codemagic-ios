import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddChildren } from './add-children';

describe('AddChildren', () => {
  let component: AddChildren;
  let fixture: ComponentFixture<AddChildren>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddChildren]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddChildren);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
