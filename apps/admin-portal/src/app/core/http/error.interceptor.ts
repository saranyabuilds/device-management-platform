import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          notifications.showError('Your session has expired. Please sign in again.');
          authService.logout();
        } else {
          notifications.showError(messageForStatus(error.status));
        }
      } else {
        notifications.showError('Something went wrong. Please try again.');
      }

      return throwError(() => error);
    }),
  );
};

const messageForStatus = (status: number): string => {
  switch (status) {
    case 0:
      return 'Unable to reach the server. Check your network connection.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 500:
      return 'The server encountered an error. Please try again later.';
    default:
      return 'The request could not be completed. Please try again.';
  }
};
