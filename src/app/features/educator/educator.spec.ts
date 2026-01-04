import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Educator } from './educator';

describe('Educator', () => {
  let component: Educator;
  let fixture: ComponentFixture<Educator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Educator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Educator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
