import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditChildren } from './edit-children';

describe('EditChildren', () => {
  let component: EditChildren;
  let fixture: ComponentFixture<EditChildren>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditChildren]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditChildren);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
