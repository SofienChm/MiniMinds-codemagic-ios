import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitlePage } from './title-page';

describe('TitlePage', () => {
  let component: TitlePage;
  let fixture: ComponentFixture<TitlePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitlePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitlePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
