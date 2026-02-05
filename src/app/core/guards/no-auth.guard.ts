import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth";
import { Capacitor } from "@capacitor/core";

/**
 * Guard that prevents authenticated users from accessing public pages (login, landing, register)
 * Redirects authenticated users to the dashboard
 */
export const noAuthGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard'], { replaceUrl: true });
    return false;
  }

  return true;
};

/**
 * Guard specifically for the landing page
 * On mobile: redirects to login (not authenticated) or dashboard (authenticated)
 * On web: allows access to landing page (not authenticated) or redirects to dashboard (authenticated)
 */
export const landingGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If authenticated, always redirect to dashboard
  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard'], { replaceUrl: true });
    return false;
  }

  // On mobile, redirect to login instead of showing landing
  if (Capacitor.isNativePlatform()) {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  // On web, allow landing page for non-authenticated users
  return true;
};
