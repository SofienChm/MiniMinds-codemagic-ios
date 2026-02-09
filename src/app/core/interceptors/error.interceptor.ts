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

      // Check if this is a GET request with cached data available
      // The cache interceptor runs before error interceptor, so if we have cached data,
      // it would have already been returned and we wouldn't be here.
      // However, for status 0 (network error) on GET requests, we should be less intrusive
      const isGetRequest = cleanReq.method === 'GET';

      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            // Network error - could be no internet, wrong URL, CORS, or server down
            {
              const urlPath = cleanReq.url.replace(/https?:\/\/[^/]+/, '');
              errorMessage = `Could not reach server. URL: ${cleanReq.url}`;
              console.error(`[Error] Network error (status 0) for ${cleanReq.method} ${cleanReq.url}`);
              Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                html: `<p>Could not connect to the server.</p><p style="font-size:12px;color:#888;word-break:break-all;margin-top:8px;"><b>URL:</b> ${cleanReq.url}</p>`,
                confirmButtonColor: '#506EE4'
              });
            }
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
            // Check if this is an auth endpoint (login, register, password reset)
            // These should handle their own 401 errors (wrong credentials)
            const isAuthEndpoint = cleanReq.url.includes('/api/auth/login') ||
                                   cleanReq.url.includes('/api/auth/register') ||
                                   cleanReq.url.includes('/api/passwordreset');

            if (isAuthEndpoint) {
              // Let the component handle the error (wrong email/password)
              return throwError(() => error);
            }

            // For other endpoints, this is a session expiry
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
