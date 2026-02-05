import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SimpleToastService {
  private static readonly PRIMARY_COLOR = '#7dd3c0';
  private static readonly SUCCESS_COLOR = '#1ABE17';
  private static readonly DANGER_COLOR = '#DC3545';
  private static readonly TEXT_COLOR = '#202C4B';
  private static readonly SHADOW = '0px 4.4px 12px -1px rgba(222, 222, 222, 0.36)';
  private static readonly BORDER_RADIUS = '12px';

  show(message: string, duration: number = 5000): void {
    const toast = document.createElement('div');
    toast.className = 'simple-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--primary-color, #7dd3c0);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0px 4.4px 12px -1px rgba(222, 222, 222, 0.36);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Roboto', sans-serif;
      animation: toastSlideInRight 0.3s ease-out;
      max-width: 350px;
    `;

    document.body.appendChild(toast);
    this.injectAnimations();

    setTimeout(() => {
      toast.style.animation = 'toastSlideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  success(message: string, duration: number = 5000): void {
    const toast = document.createElement('div');
    toast.className = 'simple-toast simple-toast-success';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--primary-color, #7dd3c0);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0px 4.4px 12px -1px rgba(222, 222, 222, 0.36);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Roboto', sans-serif;
      animation: toastSlideInRight 0.3s ease-out;
      max-width: 350px;
    `;

    document.body.appendChild(toast);
    this.injectAnimations();

    setTimeout(() => {
      toast.style.animation = 'toastSlideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  error(message: string, duration: number = 5000): void {
    const toast = document.createElement('div');
    toast.className = 'simple-toast simple-toast-error';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--red-color, #DC3545);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0px 4.4px 12px -1px rgba(222, 222, 222, 0.36);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Roboto', sans-serif;
      animation: toastSlideInRight 0.3s ease-out;
      max-width: 350px;
    `;

    document.body.appendChild(toast);
    this.injectAnimations();

    setTimeout(() => {
      toast.style.animation = 'toastSlideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  warning(message: string, duration: number = 5000): void {
    const toast = document.createElement('div');
    toast.className = 'simple-toast simple-toast-warning';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--secondary-color, #7db9ff);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0px 4.4px 12px -1px rgba(222, 222, 222, 0.36);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Roboto', sans-serif;
      animation: toastSlideInRight 0.3s ease-out;
      max-width: 350px;
    `;

    document.body.appendChild(toast);
    this.injectAnimations();

    setTimeout(() => {
      toast.style.animation = 'toastSlideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  private injectAnimations(): void {
    if (!document.getElementById('simple-toast-animations')) {
      const style = document.createElement('style');
      style.id = 'simple-toast-animations';
      style.textContent = `
        @keyframes toastSlideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
}
