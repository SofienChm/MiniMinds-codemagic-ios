import { HttpInterceptorFn, HttpRequest, HttpEvent, HttpErrorResponse } from "@angular/common/http";
import { AuthService } from "../services/auth";
import { inject } from "@angular/core";
import { firstValueFrom, from, throwError } from "rxjs";
import { switchMap, catchError } from "rxjs/operators";

// Endpoints that should never carry the access token or trigger a refresh
const AUTH_ENDPOINT_MARKERS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/passwordreset'
];

const isAuthEndpoint = (url: string): boolean =>
  AUTH_ENDPOINT_MARKERS.some(marker => url.includes(marker));

// Single-flight refresh: concurrent 401s share one refresh request
let refreshInFlight: Promise<string> | null = null;

function refreshAccessToken(authService: AuthService): Promise<string> {
  const inFlight = refreshInFlight;
  if (inFlight) {
    return inFlight;
  }

  const promise = firstValueFrom(authService.refreshSession())
    .then(res => res.token)
    .finally(() => {
      refreshInFlight = null;
    });

  refreshInFlight = promise;
  return promise;
}

const attachToken = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Unauthenticated endpoints - pass through untouched
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getToken();

  // No token - public request, pass through
  if (!token) {
    return next(req);
  }

  return next(attachToken(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      // Backend rejected the token (expired). Attempt a transparent refresh + retry.
      if (error.status === 401 && authService.getRefreshToken()) {
        return from(refreshAccessToken(authService)).pipe(
          switchMap(newToken => next(attachToken(req, newToken))),
          catchError(() => throwError(() => error)) // refresh failed - let error interceptor handle logout
        );
      }
      return throwError(() => error);
    })
  );
};
