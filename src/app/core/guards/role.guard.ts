import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth";

/**
 * Role-based guard that checks if the current user has one of the allowed roles.
 * Usage in routes:
 *   canActivate: [roleGuard('Admin', 'Teacher')]
 */
export const roleGuard = (...allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.getUserRole();

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Redirect to forbidden page if user doesn't have required role
    return router.createUrlTree(['/403']);
  };
};

/**
 * Guard that blocks specific roles from accessing a route.
 * Usage in routes:
 *   canActivate: [blockRolesGuard('Parent')]
 */
export const blockRolesGuard = (...blockedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.getUserRole();

    if (userRole && !blockedRoles.includes(userRole)) {
      return true;
    }

    // Redirect to forbidden page if user's role is blocked
    return router.createUrlTree(['/403']);
  };
};
