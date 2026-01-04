import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrefixService {
  private childPrefixSubject = new BehaviorSubject<string>(this.getStoredPrefix('child'));
  private parentPrefixSubject = new BehaviorSubject<string>(this.getStoredPrefix('parent'));
  private educatorPrefixSubject = new BehaviorSubject<string>(this.getStoredPrefix('educator'));

  childPrefix$ = this.childPrefixSubject.asObservable();
  parentPrefix$ = this.parentPrefixSubject.asObservable();
  educatorPrefix$ = this.educatorPrefixSubject.asObservable();

  private getStoredPrefix(type: string): string {
    const defaults: any = { child: 'Child', parent: 'Parent', educator: 'Educator' };
    return localStorage.getItem(`${type}Prefix`) || defaults[type];
  }

  getChildPrefix(): string {
    return this.childPrefixSubject.value;
  }

  getParentPrefix(): string {
    return this.parentPrefixSubject.value;
  }

  getEducatorPrefix(): string {
    return this.educatorPrefixSubject.value;
  }

  setChildPrefix(prefix: string): void {
    localStorage.setItem('childPrefix', prefix);
    this.childPrefixSubject.next(prefix);
  }

  setParentPrefix(prefix: string): void {
    localStorage.setItem('parentPrefix', prefix);
    this.parentPrefixSubject.next(prefix);
  }

  setEducatorPrefix(prefix: string): void {
    localStorage.setItem('educatorPrefix', prefix);
    this.educatorPrefixSubject.next(prefix);
  }
}
