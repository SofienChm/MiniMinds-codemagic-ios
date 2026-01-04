import { Component, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
  template: `<div clickOutside (clickOutside)="onClickedOutside()"></div>`
})
class TestComponent {
  onClickedOutside() {}
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClickOutsideDirective],
      declarations: [TestComponent]
    });

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    const directive = new ClickOutsideDirective(new ElementRef(null));
    expect(directive).toBeTruthy();
  });

  it('should emit clickOutside event on outside click', () => {
    spyOn(component, 'onClickedOutside');
    document.dispatchEvent(new MouseEvent('click'));
    expect(component.onClickedOutside).toHaveBeenCalled();
  });

  it('should not emit clickOutside event on inside click', () => {
    spyOn(component, 'onClickedOutside');
    const div = fixture.debugElement.query(By.css('div')).nativeElement;
    div.dispatchEvent(new MouseEvent('click'));
    expect(component.onClickedOutside).not.toHaveBeenCalled();
  });
});
