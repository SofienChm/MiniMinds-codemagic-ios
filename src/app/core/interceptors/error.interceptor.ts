import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';

// Custom header to skip error interceptor UI (popups/logging)
export const SKIP_ERROR_HANDLER = 'X-Skip-Error-Handler';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Check if this request should skip error handling UI
  const skipErrorHandler = req.headers.has(SKIP_ERROR_HANDLER);

  // Remove the custom header before sending (backend shouldn't see it)
  const cleanReq = skipErrorHandler
    ? req.clone({ headers: req.headers.delete(SKIP_ERROR_HANDLER) })
    : req;

  return next(cleanReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If skip flag is set, just rethrow without UI or logging
      if (skipErrorHandler) {
        return throwError(() => error);
      }

      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            // Network error
            errorMessage = 'No internet connection. Please check your network.';
            Swal.fire({
              icon: 'error',
              title: 'Connection Error',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            });
            break;

          case 400:
            // Bad request
            errorMessage = error.error?.message || 'Invalid request. Please check your input.';
            Swal.fire({
              icon: 'warning',
              title: 'Invalid Request',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            });
            break;

          case 401:
            // Unauthorized
            errorMessage = 'Your session has expired. Please login again.';
            Swal.fire({
              icon: 'warning',
              title: 'Session Expired',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            }).then(() => {
              localStorage.removeItem('currentUser');
              localStorage.removeItem('token');
              router.navigate(['/login']);
            });
            break;

          case 403:
            // Forbidden - redirect to 403 page
            router.navigate(['/403']);
            break;

          case 404:
            // Not found
            errorMessage = error.error?.message || 'The requested resource was not found.';
            Swal.fire({
              icon: 'info',
              title: 'Not Found',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            });
            break;

          case 500:
            // Internal server error
            errorMessage = 'Server error. Please try again later.';
            Swal.fire({
              icon: 'error',
              title: 'Server Error',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            });
            break;

          case 503:
            // Service unavailable
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            Swal.fire({
              icon: 'error',
              title: 'Service Unavailable',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            });
            break;

          default:
            // Other errors
            errorMessage = error.error?.message || `Error: ${error.message}`;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: errorMessage,
              confirmButtonColor: '#506EE4'
            });
        }
      }

      return throwError(() => error);
    })
  );
};
