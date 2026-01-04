import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditParent } from './edit-parent';

describe('EditParent', () => {
  let component: EditParent;
  let fixture: ComponentFixture<EditParent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditParent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditParent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
