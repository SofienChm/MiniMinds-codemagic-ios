import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  static email(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(control.value) ? null : { invalidEmail: true };
  }

  static phone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const cleaned = control.value.replace(/\D/g, '');
    return cleaned.length >= 6 ? null : { invalidPhone: true };
  }

  static minAge(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const birthDate = new Date(control.value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      return actualAge >= minAge ? null : { minAge: { required: minAge, actual: actualAge } };
    };
  }

  static maxAge(maxAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const birthDate = new Date(control.value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age <= maxAge ? null : { maxAge: { required: maxAge, actual: age } };
    };
  }

  static futureDate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today ? null : { pastDate: true };
  }

  static pastDate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today ? null : { futureDate: true };
  }

  static positiveNumber(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return control.value > 0 ? null : { notPositive: true };
  }

  static matchPassword(passwordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      const password = control.parent.get(passwordField);
      return password && control.value === password.value ? null : { passwordMismatch: true };
    };
  }

  static noWhitespace(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const isWhitespace = (control.value || '').trim().length === 0;
    return !isWhitespace ? null : { whitespace: true };
  }

  static alphaOnly(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const alphaRegex = /^[a-zA-Z\s]+$/;
    return alphaRegex.test(control.value) ? null : { notAlpha: true };
  }
}
